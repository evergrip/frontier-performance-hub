import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Cell } from 'recharts';
import { Building2, DollarSign, Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, eachMonthOfInterval, endOfMonth } from 'date-fns';

export default function ConstructionPerformanceReport({ dateRange, staffId }) {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || 'Unknown';
  };

  const getPMName = (pmId) => {
    const user = users.find(u => u.id === pmId);
    return user?.full_name || 'Unassigned';
  };

  // Filter construction projects relevant to the date range
  const constructionProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.project_type !== 'construction') return false;
      if (staffId && staffId !== 'all' && p.project_manager_id !== staffId) return false;
      return true;
    });
  }, [projects, staffId]);

  // Projects closed within date range
  const closedInRange = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    return constructionProjects.filter(p => {
      if (p.status !== 'closed') return false;
      const history = p.status_history || [];
      const closedEntry = [...history].reverse().find(h => h.status === 'closed');
      const closedDate = closedEntry ? new Date(closedEntry.entered_date) : (p.actual_completion_date ? new Date(p.actual_completion_date) : null);
      if (!closedDate) return false;
      return closedDate >= dateRange.start && closedDate <= dateRange.end;
    });
  }, [constructionProjects, dateRange]);

  // Active projects (not closed)
  const activeProjects = useMemo(() => {
    return constructionProjects.filter(p => p.status !== 'closed');
  }, [constructionProjects]);

  // KPI Summaries
  const kpis = useMemo(() => {
    const totalContractValue = closedInRange.reduce((s, p) => s + (p.contract_value || 0), 0);
    
    // Calculate true costs using actual_margin when actual_costs === contract_value (historical imports)
    const totalTrueCosts = closedInRange.reduce((s, p) => {
      if (p.actual_margin != null && p.actual_margin > 0) {
        return s + (p.contract_value || 0) * (1 - p.actual_margin / 100);
      }
      return s + (p.actual_costs || 0);
    }, 0);
    const totalGrossProfit = totalContractValue - totalTrueCosts;
    const avgMargin = totalContractValue > 0 ? (totalGrossProfit / totalContractValue) * 100 : 0;

    // Average project duration for closed projects
    const durations = closedInRange.map(p => {
      const history = p.status_history || [];
      const startEntry = history.find(h => h.status === 'active_construction' || h.status === 'mobilization');
      const closedEntry = [...history].reverse().find(h => h.status === 'closed');
      if (startEntry && closedEntry) {
        return differenceInDays(new Date(closedEntry.entered_date), new Date(startEntry.entered_date));
      }
      if (p.start_date && p.actual_completion_date) {
        return differenceInDays(new Date(p.actual_completion_date), new Date(p.start_date));
      }
      return null;
    }).filter(Boolean);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Budget variance using margin-aware costs
    const varianceProjects = closedInRange.filter(p => p.contract_value);
    const avgVariance = varianceProjects.length > 0
      ? varianceProjects.reduce((sum, p) => {
          const trueCost = (p.actual_margin != null && p.actual_margin > 0)
            ? p.contract_value * (1 - p.actual_margin / 100)
            : (p.actual_costs || 0);
          const variance = ((trueCost - p.contract_value) / p.contract_value) * 100;
          return sum + variance;
        }, 0) / varianceProjects.length
      : 0;

    const activeContractValue = activeProjects.reduce((s, p) => s + (p.contract_value || 0), 0);

    return {
      closedCount: closedInRange.length,
      activeCount: activeProjects.length,
      totalContractValue,
      totalActualCosts,
      totalGrossProfit,
      avgMargin,
      avgDuration,
      avgVariance,
      activeContractValue,
    };
  }, [closedInRange, activeProjects]);

  // Project-level detail table for closed projects
  const closedProjectDetails = useMemo(() => {
    return closedInRange.map(p => {
      // Use actual_margin field if available (historical imports have actual_costs === contract_value)
      let margin;
      if (p.actual_margin != null && p.actual_margin > 0) {
        margin = p.actual_margin;
      } else if (p.contract_value && p.actual_costs && p.actual_costs !== p.contract_value) {
        margin = ((p.contract_value - p.actual_costs) / p.contract_value) * 100;
      } else {
        margin = 0;
      }
      
      // Calculate true cost and variance using margin
      const trueCost = p.contract_value ? p.contract_value * (1 - margin / 100) : 0;
      const variance = p.contract_value ? ((trueCost - p.contract_value) / p.contract_value) * 100 : 0;
      
      return { ...p, variance, margin, trueCost };
    }).sort((a, b) => (b.contract_value || 0) - (a.contract_value || 0));
  }, [closedInRange]);

  // Monthly revenue recognition from allocations
  const monthlyRevenue = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });

    return months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const period = format(monthStart, 'yyyy-MM');
      let recognized = 0;
      let costAllocated = 0;

      constructionProjects.forEach(p => {
        // Allocations store year/month separately, not as a period string
        const monthNum = monthStart.getMonth() + 1;
        const yearNum = monthStart.getFullYear();
        const alloc = (p.monthly_revenue_allocations || []).find(a => 
          (a.period === period) || (a.year === yearNum && a.month === monthNum)
        );
        if (alloc && (p.actual_costs || p.contract_value)) {
          const revenueBase = p.actual_costs || p.contract_value;
          const amount = (alloc.percentage / 100) * revenueBase;
          recognized += amount;
          // Estimate cost proportionally using margin
          if (p.actual_margin) {
            costAllocated += amount * (1 - (p.actual_margin / 100));
          } else if (p.actual_costs && p.contract_value) {
            costAllocated += (alloc.percentage / 100) * p.actual_costs;
          }
        }
      });

      return {
        month: format(monthStart, 'MMM yyyy'),
        revenue: Math.round(recognized),
        cost: Math.round(costAllocated),
        profit: Math.round(recognized - costAllocated),
      };
    });
  }, [constructionProjects, dateRange]);

  // Crew utilization
  const crewSummary = useMemo(() => {
    const crews = {};
    activeProjects.forEach(p => {
      const crew = p.crew_assignment || 'unassigned';
      if (!crews[crew]) crews[crew] = { count: 0, value: 0 };
      crews[crew].count++;
      crews[crew].value += p.contract_value || 0;
    });
    return Object.entries(crews).map(([name, data]) => ({
      crew: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ...data,
    })).sort((a, b) => b.count - a.count);
  }, [activeProjects]);

  // PM performance
  const pmPerformance = useMemo(() => {
    const pms = {};
    closedInRange.forEach(p => {
      const pmId = p.project_manager_id || 'unassigned';
      if (!pms[pmId]) pms[pmId] = { projects: 0, totalContract: 0, totalCost: 0 };
      pms[pmId].projects++;
      pms[pmId].totalContract += p.contract_value || 0;
      pms[pmId].totalCost += p.actual_costs || 0;
    });
    return Object.entries(pms).map(([pmId, data]) => ({
      name: getPMName(pmId),
      ...data,
      margin: data.totalContract > 0 ? ((data.totalContract - data.totalCost) / data.totalContract * 100) : 0,
      profit: data.totalContract - data.totalCost,
    })).sort((a, b) => b.totalContract - a.totalContract);
  }, [closedInRange, users]);

  if (!dateRange.start || !dateRange.end) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          Please select a date range to view construction reports
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-600">Closed Projects</p>
            <p className="text-3xl font-bold text-slate-900">{kpis.closedCount}</p>
            <p className="text-xs text-slate-500 mt-1">in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-600">Revenue (Closed)</p>
            <p className="text-3xl font-bold text-emerald-600">${(kpis.totalContractValue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-500 mt-1">contract value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-600">Gross Margin</p>
            <p className={`text-3xl font-bold ${kpis.avgMargin >= 20 ? 'text-emerald-600' : kpis.avgMargin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
              {kpis.avgMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">${(kpis.totalGrossProfit / 1000).toFixed(0)}K profit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-600">Avg Duration</p>
            <p className="text-3xl font-bold text-blue-600">{kpis.avgDuration}</p>
            <p className="text-xs text-slate-500 mt-1">days to close</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-600">Active Projects</p>
            <p className="text-3xl font-bold text-blue-600">{kpis.activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-600">Active Pipeline Value</p>
            <p className="text-3xl font-bold text-blue-600">${(kpis.activeContractValue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-600">Avg Budget Variance</p>
            <p className={`text-3xl font-bold ${kpis.avgVariance <= 0 ? 'text-emerald-600' : kpis.avgVariance <= 5 ? 'text-amber-600' : 'text-red-600'}`}>
              {kpis.avgVariance > 0 ? '+' : ''}{kpis.avgVariance.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Recognition Chart */}
      {monthlyRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Monthly Revenue Recognition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="cost" fill="#ef4444" name="Cost" opacity={0.6} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Closed Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            Closed Projects Detail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closedProjectDetails.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No projects closed in the selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>PM</TableHead>
                    <TableHead className="text-right">Contract</TableHead>
                    <TableHead className="text-right">Actual Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedProjectDetails.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="text-sm text-slate-600">{getClientName(p.client_id)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{getPMName(p.project_manager_id)}</TableCell>
                      <TableCell className="text-right">${Math.round(p.contract_value || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${Math.round(p.trueCost || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={p.margin >= 20 ? 'text-emerald-600 font-semibold' : p.margin >= 10 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {p.margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={p.variance <= 0 ? 'bg-emerald-100 text-emerald-800' : p.variance <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                          {p.variance > 0 ? '+' : ''}{p.variance.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={3}>Totals</TableCell>
                    <TableCell className="text-right">${Math.round(kpis.totalContractValue).toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Math.round(kpis.totalActualCosts).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">{kpis.avgMargin.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{kpis.avgVariance > 0 ? '+' : ''}{kpis.avgVariance.toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PM Performance */}
      {pmPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Project Manager Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Manager</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Total Contract</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pmPerformance.map((pm, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{pm.name}</TableCell>
                    <TableCell className="text-right">{pm.projects}</TableCell>
                    <TableCell className="text-right">${Math.round(pm.totalContract).toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Math.round(pm.totalCost).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={pm.profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                        ${Math.round(pm.profit).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={pm.margin >= 20 ? 'bg-emerald-100 text-emerald-800' : pm.margin >= 10 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                        {pm.margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Crew Utilization */}
      {crewSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Crew Utilization (Active Projects)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={crewSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="crew" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" name="Active Projects" />
                </BarChart>
              </ResponsiveContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crew</TableHead>
                    <TableHead className="text-right">Active Projects</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewSummary.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{c.crew}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right">${Math.round(c.value).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}