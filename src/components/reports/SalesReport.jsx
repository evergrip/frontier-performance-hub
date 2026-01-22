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

  const calculateTrendData = () => {
    if (!dateRange.start || !dateRange.end) return [];

    let intervals;
    if (trendPeriod === 'monthly') {
      intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    } else {
      intervals = eachQuarterOfInterval({ start: dateRange.start, end: dateRange.end });
    }

    return intervals.map(intervalStart => {
      const intervalEnd = trendPeriod === 'monthly' 
        ? endOfMonth(intervalStart)
        : endOfQuarter(intervalStart);

      const periodLeads = leads.filter(lead => {
        if (staffId && staffId !== 'all' && lead.assigned_to !== staffId) return false;

        // Only include leads that are in a closed state (converted or disqualified)
        if (lead.status !== 'converted' && lead.status !== 'disqualified') return false;

        // Check if the lead was created in this period
        const createdDate = new Date(lead.created_date);
        return createdDate >= intervalStart && createdDate <= intervalEnd;
      });

      const converted = periodLeads.filter(l => l.status === 'converted').length;
      const disqualified = periodLeads.filter(l => l.status === 'disqualified').length;
      const total = converted + disqualified;
      const winRate = total > 0 ? (converted / total) * 100 : 0;

      // Calculate win rate after proposal (only leads that reached proposal stage)
      const proposalLeads = periodLeads.filter(l => {
        const statusHistory = l.status_history || [];
        return statusHistory.some(h => h.status === 'preconstruction_proposal');
      });
      const convertedAfterProposal = proposalLeads.filter(l => l.status === 'converted').length;
      const proposalTotal = proposalLeads.length;
      const winRateAfterProposal = proposalTotal > 0 ? (convertedAfterProposal / proposalTotal) * 100 : 0;

      // Calculate sales volume for this period
      const periodSales = sales.filter(sale => {
        if (staffId && staffId !== 'all' && sale.assigned_to !== staffId) return false;
        const closeDate = sale.close_date ? new Date(sale.close_date) : new Date(sale.created_date);
        return closeDate >= intervalStart && closeDate <= intervalEnd;
      });
      
      const salesVolume = periodSales.reduce((sum, sale) => sum + (sale.contract_value || 0), 0);

      return {
        period: trendPeriod === 'monthly' 
          ? format(intervalStart, 'MMM yyyy')
          : `Q${Math.floor(intervalStart.getMonth() / 3) + 1} ${format(intervalStart, 'yyyy')}`,
        winRate: parseFloat(winRate.toFixed(1)),
        winRateAfterProposal: parseFloat(winRateAfterProposal.toFixed(1)),
        salesVolume: salesVolume,
        converted,
        disqualified,
        total,
        convertedAfterProposal,
        proposalTotal
      };
    });
  };

  const metricsData = calculateMetrics();
  const trendData = calculateTrendData();
  const salespeopleWithData = Object.keys(metricsData);

  // Calculate contract values summary
  const calculateContractValues = () => {
    const filteredSales = sales.filter(sale => {
      if (staffId && staffId !== 'all' && sale.assigned_to !== staffId) return false;
      if (!dateRange.start || !dateRange.end) return true;
      
      const closeDate = sale.close_date ? new Date(sale.close_date) : new Date(sale.created_date);
      return closeDate >= dateRange.start && closeDate <= dateRange.end;
    });

    const preconTotal = filteredSales
      .filter(s => s.sale_type === 'preconstruction')
      .reduce((sum, s) => sum + (s.contract_value || 0), 0);
    
    const constructionTotal = filteredSales
      .filter(s => s.sale_type === 'construction')
      .reduce((sum, s) => sum + (s.contract_value || 0), 0);

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
                          <p className="text-emerald-600">Overall Win Rate: {data.winRate}%</p>
                          <p className="text-blue-600">Win Rate After Proposal: {data.winRateAfterProposal}%</p>
                          <p className="text-amber-600">Sales Volume: ${Math.round(data.salesVolume).toLocaleString()}</p>
                          <p className="text-sm text-slate-600 mt-2">Overall: {data.converted}/{data.total}</p>
                          <p className="text-sm text-slate-600">After Proposal: {data.convertedAfterProposal}/{data.proposalTotal}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="right"
                  dataKey="salesVolume" 
                  fill="#f59e0b" 
                  opacity={0.3}
                  name="Sales Volume ($)"
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="winRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Overall Win Rate (%)"
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
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}