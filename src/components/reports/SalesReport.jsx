import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, ComposedChart } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, eachQuarterOfInterval, startOfQuarter, endOfQuarter } from 'date-fns';

export default function SalesReport({ dateRange, staffId }) {
  const [trendPeriod, setTrendPeriod] = useState('monthly');

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: [],
  });

  const calculateMetrics = () => {
    const filteredLeads = leads.filter(lead => {
      if (staffId && staffId !== 'all' && lead.assigned_to !== staffId) return false;
      return true;
    });

    const bySalesperson = {};
    
    filteredLeads.forEach(lead => {
      const salesPersonId = lead.assigned_to;
      if (!salesPersonId) return;
      
      if (!bySalesperson[salesPersonId]) {
        bySalesperson[salesPersonId] = {
          totalLeads: 0,
          convertedTotal: 0,
          convertedAfterProposal: 0,
          disqualifiedAfterProposal: 0,
          disqualifiedBeforeProposal: 0,
          proposalReached: 0,
          conversionRate: 0,
          winRate: 0
        };
      }
      
      const statusHistory = lead.status_history || [];
      const reachedProposal = statusHistory.some(h => h.status === 'preconstruction_proposal');
      
      bySalesperson[salesPersonId].totalLeads++;
      
      if (lead.status === 'converted') {
        bySalesperson[salesPersonId].convertedTotal++;
        if (reachedProposal) {
          bySalesperson[salesPersonId].convertedAfterProposal++;
          bySalesperson[salesPersonId].proposalReached++;
        }
      } else if (lead.status === 'disqualified') {
        if (reachedProposal) {
          bySalesperson[salesPersonId].disqualifiedAfterProposal++;
          bySalesperson[salesPersonId].proposalReached++;
        } else {
          bySalesperson[salesPersonId].disqualifiedBeforeProposal++;
        }
      } else if (reachedProposal) {
        bySalesperson[salesPersonId].proposalReached++;
      }
    });

    Object.keys(bySalesperson).forEach(id => {
      const data = bySalesperson[id];
      data.conversionRate = data.totalLeads > 0 ? (data.convertedTotal / data.totalLeads) * 100 : 0;
      data.winRate = data.proposalReached > 0 ? (data.convertedAfterProposal / data.proposalReached) * 100 : 0;
    });

    return bySalesperson;
  };

  const calculateConstructionMetrics = () => {
    // Construction sales represent converted precon -> construction deals
    const constructionSales = sales.filter(s => {
      if (s.sale_type !== 'construction') return false;
      if (staffId && staffId !== 'all' && s.assigned_to !== staffId) return false;
      return true;
    });

    // Precon sales that reached pending_construction_sale (the construction sales opportunity pool)
    const preconSalesAtPendingOrBeyond = sales.filter(s => {
      if (s.sale_type !== 'preconstruction') return false;
      if (staffId && staffId !== 'all' && s.assigned_to !== staffId) return false;
      const history = s.phase_history || [];
      return history.some(h => h.status === 'pending_construction_sale') || s.status === 'pending_construction_sale' || s.status === 'closed_won' || s.status === 'closed_lost';
    });

    const bySalesperson = {};

    preconSalesAtPendingOrBeyond.forEach(sale => {
      const salesPersonId = sale.assigned_to;
      if (!salesPersonId) return;

      if (!bySalesperson[salesPersonId]) {
        bySalesperson[salesPersonId] = {
          totalOpportunities: 0,
          closedWon: 0,
          closedLost: 0,
          pending: 0,
          winRate: 0,
          totalVolume: 0,
          wonVolume: 0
        };
      }

      bySalesperson[salesPersonId].totalOpportunities++;

      // Find linked construction sale for this precon
      const conSale = constructionSales.find(cs => cs.linked_precon_sale_id === sale.id);
      // Find linked project for the construction sale
      const linkedProject = conSale ? projects.find(p => p.sale_id === conSale.id) : null;

      if (sale.status === 'closed_won' || sale.converted_to_project_id || conSale) {
        bySalesperson[salesPersonId].closedWon++;
        // Use actual costs from closed project, otherwise construction sale contract_value, otherwise precon estimated budget
        let volume = sale.estimated_construction_budget || 0;
        if (conSale) {
          volume = conSale.contract_value || volume;
        }
        if (linkedProject && linkedProject.status === 'closed' && linkedProject.actual_costs) {
          volume = linkedProject.actual_costs;
        }
        bySalesperson[salesPersonId].wonVolume += volume;
        bySalesperson[salesPersonId].totalVolume += volume;
      } else if (sale.status === 'closed_lost') {
        bySalesperson[salesPersonId].closedLost++;
        bySalesperson[salesPersonId].totalVolume += sale.estimated_construction_budget || 0;
      } else {
        bySalesperson[salesPersonId].pending++;
        bySalesperson[salesPersonId].totalVolume += sale.estimated_construction_budget || 0;
      }
    });

    Object.keys(bySalesperson).forEach(id => {
      const data = bySalesperson[id];
      const decided = data.closedWon + data.closedLost;
      data.winRate = decided > 0 ? (data.closedWon / decided) * 100 : 0;
    });

    return bySalesperson;
  };

  // Helper: get the most relevant date for a sale using phase_history / status_history
  const getSaleEffectiveDate = (sale) => {
    // For precon sales: use the date they entered closed_won or the last phase_history date
    const history = sale.phase_history || [];
    if (sale.status === 'closed_won' || sale.status === 'closed_lost') {
      const closedEntry = [...history].reverse().find(h => h.status === sale.status);
      if (closedEntry?.entered_date) return new Date(closedEntry.entered_date);
    }
    // Fall back to close_date, then the last phase_history entry, then updated_date
    if (sale.close_date) return new Date(sale.close_date);
    if (history.length > 0) return new Date(history[history.length - 1].entered_date);
    return new Date(sale.updated_date || sale.created_date);
  };

  // Helper: get the date a precon sale reached pending_construction_sale or closed_won (for construction trend)
  const getConstructionConversionDate = (preconSale) => {
    const history = preconSale.phase_history || [];
    // Prefer closed_won date
    const closedWonEntry = [...history].reverse().find(h => h.status === 'closed_won');
    if (closedWonEntry?.entered_date) return new Date(closedWonEntry.entered_date);
    // Fall back to pending_construction_sale date
    const pendingEntry = [...history].reverse().find(h => h.status === 'pending_construction_sale');
    if (pendingEntry?.entered_date) return new Date(pendingEntry.entered_date);
    if (preconSale.close_date) return new Date(preconSale.close_date);
    return new Date(preconSale.updated_date || preconSale.created_date);
  };

  const calculateTrendData = () => {
    if (!dateRange.start || !dateRange.end) return [];

    let intervals;
    if (trendPeriod === 'monthly') {
      intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    } else {
      intervals = eachQuarterOfInterval({ start: dateRange.start, end: dateRange.end });
    }

    // Pre-filter construction-related data
    const constructionSalesAll = sales.filter(s => s.sale_type === 'construction');
    const preconSalesForConstruction = sales.filter(s => {
      if (s.sale_type !== 'preconstruction') return false;
      if (staffId && staffId !== 'all' && s.assigned_to !== staffId) return false;
      const history = s.phase_history || [];
      return history.some(h => h.status === 'pending_construction_sale') || s.status === 'pending_construction_sale' || s.status === 'closed_won' || s.status === 'closed_lost';
    });

    return intervals.map(intervalStart => {
      const intervalEnd = trendPeriod === 'monthly' 
        ? endOfMonth(intervalStart)
        : endOfQuarter(intervalStart);

      // --- Precon Win Rate ---
      // Use phase_history dates to determine when precon sales were won/lost
      const periodPreconSales = sales.filter(sale => {
        if (sale.sale_type !== 'preconstruction') return false;
        if (staffId && staffId !== 'all' && sale.assigned_to !== staffId) return false;
        if (sale.status !== 'closed_won' && sale.status !== 'closed_lost' && sale.status !== 'converted') return false;
        const effectiveDate = getSaleEffectiveDate(sale);
        return effectiveDate >= intervalStart && effectiveDate <= intervalEnd;
      });

      // Get the leads that were converted to these sales
      const convertedLeadIds = periodPreconSales
        .filter(s => s.status === 'closed_won' || s.status === 'converted')
        .map(sale => sale.lead_id)
        .filter(Boolean);
      
      const periodLeads = leads.filter(lead => convertedLeadIds.includes(lead.id));

      const converted = periodPreconSales.filter(s => s.status === 'closed_won' || s.status === 'converted').length;
      const totalPreconDecided = periodPreconSales.length;
      const preconWinRate = totalPreconDecided > 0 ? (converted / totalPreconDecided) * 100 : 0;

      // Win rate after proposal
      const proposalLeads = periodLeads.filter(l => {
        const statusHistory = l.status_history || [];
        return statusHistory.some(h => h.status === 'preconstruction_proposal');
      });
      const convertedAfterProposal = proposalLeads.filter(l => l.status === 'converted').length;
      const proposalTotal = proposalLeads.length;
      const winRateAfterProposal = proposalTotal > 0 ? (convertedAfterProposal / proposalTotal) * 100 : 0;

      // --- Construction Win Rate ---
      const periodConstructionPrecon = preconSalesForConstruction.filter(sale => {
        const effectiveDate = getConstructionConversionDate(sale);
        return effectiveDate >= intervalStart && effectiveDate <= intervalEnd;
      });
      const conWon = periodConstructionPrecon.filter(s => s.status === 'closed_won' || s.converted_to_project_id || constructionSalesAll.some(cs => cs.linked_precon_sale_id === s.id)).length;
      const conLost = periodConstructionPrecon.filter(s => s.status === 'closed_lost').length;
      const conDecided = conWon + conLost;
      const constructionWinRate = conDecided > 0 ? (conWon / conDecided) * 100 : 0;

      // --- Volume ---
      // Precon volume: precon sales that closed in this period
      const periodPreconForVolume = sales.filter(sale => {
        if (sale.sale_type !== 'preconstruction') return false;
        if (staffId && staffId !== 'all' && sale.assigned_to !== staffId) return false;
        if (sale.status !== 'closed_won' && sale.status !== 'converted') return false;
        const effectiveDate = getSaleEffectiveDate(sale);
        return effectiveDate >= intervalStart && effectiveDate <= intervalEnd;
      });
      const preconVolume = periodPreconForVolume
        .reduce((sum, sale) => sum + (sale.contract_value || 0), 0);

      // Construction volume: projects whose construction started in this period
      // Use the project's status_history or the precon sale's conversion date
      const periodConstructionProjects = projects.filter(p => {
        if (p.project_type !== 'construction') return false;
        // Find the associated sale to check staff filter
        const sale = sales.find(s => s.id === p.sale_id);
        if (staffId && staffId !== 'all') {
          if (sale && sale.assigned_to !== staffId) return false;
        }
        // Use the project's first status_history entry date (when it was created)
        const projectHistory = p.status_history || [];
        let projectDate;
        if (projectHistory.length > 0) {
          projectDate = new Date(projectHistory[0].entered_date);
        } else if (p.start_date) {
          projectDate = new Date(p.start_date);
        } else {
          projectDate = new Date(p.created_date);
        }
        return projectDate >= intervalStart && projectDate <= intervalEnd;
      });
      const constructionVolume = periodConstructionProjects
        .reduce((sum, proj) => {
          if (proj.status === 'closed' && proj.actual_costs) {
            return sum + proj.actual_costs;
          }
          return sum + (proj.contract_value || 0);
        }, 0);
      const salesVolume = preconVolume + constructionVolume;

      return {
        period: trendPeriod === 'monthly' 
          ? format(intervalStart, 'MMM yyyy')
          : `Q${Math.floor(intervalStart.getMonth() / 3) + 1} ${format(intervalStart, 'yyyy')}`,
        preconWinRate: parseFloat(preconWinRate.toFixed(1)),
        winRateAfterProposal: parseFloat(winRateAfterProposal.toFixed(1)),
        constructionWinRate: parseFloat(constructionWinRate.toFixed(1)),
        salesVolume,
        preconVolume,
        constructionVolume,
        converted,
        totalPreconDecided,
        convertedAfterProposal,
        proposalTotal,
        conWon,
        conDecided
      };
    });
  };

  const metricsData = calculateMetrics();
  const constructionMetrics = calculateConstructionMetrics();
  const trendData = calculateTrendData();
  const salespeopleWithData = Object.keys(metricsData);
  const constructionSalespeopleWithData = Object.keys(constructionMetrics);

  // Calculate contract values summary
  const calculateContractValues = () => {
    const filteredSales = sales.filter(sale => {
      if (staffId && staffId !== 'all' && sale.assigned_to !== staffId) return false;
      if (!dateRange.start || !dateRange.end) return true;
      
      const effectiveDate = getSaleEffectiveDate(sale);
      return effectiveDate >= dateRange.start && effectiveDate <= dateRange.end;
    });

    const preconTotal = filteredSales
      .filter(s => s.sale_type === 'preconstruction')
      .reduce((sum, s) => sum + (s.contract_value || 0), 0);
    
    const constructionTotal = filteredSales
      .filter(s => s.sale_type === 'construction')
      .reduce((sum, s) => {
        // Use actual costs from closed project if available
        const linkedProject = projects.find(p => p.sale_id === s.id);
        if (linkedProject && linkedProject.status === 'closed' && linkedProject.actual_costs) {
          return sum + linkedProject.actual_costs;
        }
        return sum + (s.contract_value || 0);
      }, 0);

    return {
      preconTotal,
      constructionTotal,
      combinedTotal: preconTotal + constructionTotal
    };
  };

  const contractValues = calculateContractValues();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-500" />
            Contract Values Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Pre-Construction</p>
              <p className="text-3xl font-bold text-blue-600">
                ${Math.round(contractValues.preconTotal).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Construction</p>
              <p className="text-3xl font-bold text-emerald-600">
                ${Math.round(contractValues.constructionTotal).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Combined Total</p>
              <p className="text-3xl font-bold text-amber-600">
                ${Math.round(contractValues.combinedTotal).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Overall Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salespeopleWithData.length === 0 ? (
              <p className="text-sm text-slate-500">No lead data available for this period</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead className="text-right">Conversion Rate</TableHead>
                    <TableHead className="text-right">Converted</TableHead>
                    <TableHead className="text-right">Total Leads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salespeopleWithData.map(salesPersonId => {
                    const user = users.find(u => u.id === salesPersonId);
                    const data = metricsData[salesPersonId];
                    
                    const TrendIcon = data.conversionRate >= 30 ? TrendingUp : data.conversionRate >= 15 ? Minus : TrendingDown;
                    const trendColor = data.conversionRate >= 30 ? 'text-emerald-600' : data.conversionRate >= 15 ? 'text-amber-600' : 'text-red-600';
                    
                    return (
                      <TableRow key={salesPersonId}>
                        <TableCell className="font-medium">
                          {user?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                            <span className={`font-bold text-lg ${trendColor}`}>
                              {data.conversionRate.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-emerald-100 text-emerald-800">{data.convertedTotal}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{data.totalLeads}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Win Rate (After Proposal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salespeopleWithData.length === 0 ? (
              <p className="text-sm text-slate-500">No proposal data available for this period</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Converted</TableHead>
                    <TableHead className="text-right">Proposals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salespeopleWithData.map(salesPersonId => {
                    const user = users.find(u => u.id === salesPersonId);
                    const data = metricsData[salesPersonId];
                    
                    const TrendIcon = data.winRate >= 50 ? TrendingUp : data.winRate >= 30 ? Minus : TrendingDown;
                    const trendColor = data.winRate >= 50 ? 'text-emerald-600' : data.winRate >= 30 ? 'text-amber-600' : 'text-red-600';
                    
                    return (
                      <TableRow key={salesPersonId}>
                        <TableCell className="font-medium">
                          {user?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                            <span className={`font-bold text-lg ${trendColor}`}>
                              {data.winRate.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-emerald-100 text-emerald-800">{data.convertedAfterProposal}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{data.proposalReached}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Construction Win Rate & Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Construction Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {constructionSalespeopleWithData.length === 0 ? (
              <p className="text-sm text-slate-500">No construction sales data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Lost</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructionSalespeopleWithData.map(salesPersonId => {
                    const user = users.find(u => u.id === salesPersonId);
                    const data = constructionMetrics[salesPersonId];
                    
                    const TrendIcon = data.winRate >= 50 ? TrendingUp : data.winRate >= 30 ? Minus : TrendingDown;
                    const trendColor = data.winRate >= 50 ? 'text-emerald-600' : data.winRate >= 30 ? 'text-amber-600' : 'text-red-600';
                    
                    return (
                      <TableRow key={salesPersonId}>
                        <TableCell className="font-medium">
                          {user?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                            <span className={`font-bold text-lg ${trendColor}`}>
                              {data.winRate.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-emerald-100 text-emerald-800">{data.closedWon}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{data.closedLost}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{data.pending}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Construction Volume by Salesperson
            </CardTitle>
          </CardHeader>
          <CardContent>
            {constructionSalespeopleWithData.length === 0 ? (
              <p className="text-sm text-slate-500">No construction volume data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead className="text-right">Won Volume</TableHead>
                    <TableHead className="text-right">Total Pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructionSalespeopleWithData.map(salesPersonId => {
                    const user = users.find(u => u.id === salesPersonId);
                    const data = constructionMetrics[salesPersonId];
                    
                    return (
                      <TableRow key={salesPersonId}>
                        <TableCell className="font-medium">
                          {user?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-emerald-600">
                            ${Math.round(data.wonVolume).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-slate-700">
                            ${Math.round(data.totalVolume).toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Disqualified Before Proposal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salespeopleWithData.length === 0 ? (
            <p className="text-sm text-slate-500">No disqualification data available for this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salesperson</TableHead>
                  <TableHead className="text-right">Disqualified Before Proposal</TableHead>
                  <TableHead className="text-right">Disqualified After Proposal</TableHead>
                  <TableHead className="text-right">Total Disqualified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespeopleWithData.map(salesPersonId => {
                  const user = users.find(u => u.id === salesPersonId);
                  const data = metricsData[salesPersonId];
                  const totalDisqualified = data.disqualifiedBeforeProposal + data.disqualifiedAfterProposal;
                  
                  return (
                    <TableRow key={salesPersonId}>
                      <TableCell className="font-medium">
                        {user?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{data.disqualifiedBeforeProposal}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-orange-100 text-orange-800">{data.disqualifiedAfterProposal}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{totalDisqualified}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Win Rate Trend
            </span>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-normal">View by:</Label>
              <Select value={trendPeriod} onValueChange={setTrendPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-slate-500">No trend data available for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} 
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Sales Volume ($)', angle: 90, position: 'insideRight' }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold">{data.period}</p>
                          <p className="text-emerald-600">Precon Win Rate: {data.preconWinRate}% ({data.converted}/{data.totalPreconDecided})</p>
                          <p className="text-blue-600">Win Rate After Proposal: {data.winRateAfterProposal}% ({data.convertedAfterProposal}/{data.proposalTotal})</p>
                          <p className="text-orange-600">Construction Win Rate: {data.constructionWinRate}% ({data.conWon}/{data.conDecided})</p>
                          <hr className="my-1" />
                          <p className="text-amber-600">Total Volume: ${Math.round(data.salesVolume).toLocaleString()}</p>
                          <p className="text-indigo-600">Precon Volume: ${Math.round(data.preconVolume).toLocaleString()}</p>
                          <p className="text-emerald-700">Construction Volume: ${Math.round(data.constructionVolume).toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="right"
                  dataKey="preconVolume" 
                  fill="#6366f1" 
                  opacity={0.3}
                  name="Precon Volume ($)"
                  stackId="volume"
                />
                <Bar 
                  yAxisId="right"
                  dataKey="constructionVolume" 
                  fill="#10b981" 
                  opacity={0.3}
                  name="Construction Volume ($)"
                  stackId="volume"
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="preconWinRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Precon Win Rate (%)"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="winRateAfterProposal" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Win Rate After Proposal (%)"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="constructionWinRate" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  name="Construction Win Rate (%)"
                  dot={{ fill: '#f97316', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}