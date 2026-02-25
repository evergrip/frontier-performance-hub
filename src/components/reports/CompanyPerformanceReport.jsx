import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Target, Building2, Briefcase, Users, Info } from 'lucide-react';
import { format, eachMonthOfInterval, endOfMonth } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CompanyPerformanceReport({ dateRange, staffId }) {
  const [drilldown, setDrilldown] = useState(null);

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

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
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

  const { data: fiscalGoals = [] } = useQuery({
    queryKey: ['fiscalGoals'],
    queryFn: () => base44.entities.FiscalGoal.list(),
    initialData: [],
  });

  const { data: companySettings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    initialData: [],
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || 'Unknown';
  };

  // High level company KPIs
  const companyKPIs = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return null;

    // All construction projects
    const constructionProjects = projects.filter(p => p.project_type === 'construction');
    const closedConstruction = constructionProjects.filter(p => {
      if (p.status !== 'closed') return false;
      const history = p.status_history || [];
      const closedEntry = [...history].reverse().find(h => h.status === 'closed');
      const closedDate = closedEntry ? new Date(closedEntry.entered_date) : (p.actual_completion_date ? new Date(p.actual_completion_date) : null);
      if (!closedDate) return false;
      return closedDate >= dateRange.start && closedDate <= dateRange.end;
    });

    const conRevenue = closedConstruction.reduce((s, p) => s + (p.contract_value || 0), 0);
    const conCosts = closedConstruction.reduce((s, p) => s + (p.actual_costs || 0), 0);

    // Precon sales closed in range
    const closedPrecon = sales.filter(s => {
      if (s.sale_type !== 'preconstruction') return false;
      if (s.status !== 'closed_won') return false;
      const history = s.phase_history || [];
      const closedEntry = [...history].reverse().find(h => h.status === 'closed_won');
      const closedDate = closedEntry ? new Date(closedEntry.entered_date) : (s.close_date ? new Date(s.close_date) : null);
      if (!closedDate) return false;
      return closedDate >= dateRange.start && closedDate <= dateRange.end;
    });
    const preconRevenue = closedPrecon.reduce((s, sale) => s + (sale.contract_value || 0), 0);

    const totalRevenue = conRevenue + preconRevenue;
    const totalGrossProfit = totalRevenue - conCosts; // precon costs not tracked separately
    const grossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    // Pipeline
    const activeLeads = leads.filter(l => !['converted', 'disqualified'].includes(l.status)).length;
    const activeSales = sales.filter(s => s.sale_type === 'preconstruction' && !['closed_won', 'closed_lost'].includes(s.status)).length;
    const activeProjectCount = constructionProjects.filter(p => p.status !== 'closed').length;
    const activePipelineValue = constructionProjects.filter(p => p.status !== 'closed').reduce((s, p) => s + (p.contract_value || 0), 0);

    // Conversion funnel
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;
    const leadConversion = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const totalPreconSales = sales.filter(s => s.sale_type === 'preconstruction').length;
    const wonPreconSales = sales.filter(s => s.sale_type === 'preconstruction' && s.status === 'closed_won').length;
    const preconWinRate = totalPreconSales > 0 ? (wonPreconSales / totalPreconSales) * 100 : 0;

    return {
      totalRevenue, preconRevenue, conRevenue, conCosts,
      totalGrossProfit, grossMargin,
      activeLeads, activeSales, activeProjectCount, activePipelineValue,
      closedConstructionCount: closedConstruction.length,
      closedPreconCount: closedPrecon.length,
      leadConversion, preconWinRate,
      totalLeads, convertedLeads, totalPreconSales, wonPreconSales,
    };
  }, [projects, sales, leads, dateRange]);

  // Revenue by month (combined precon + construction)
  const monthlyRevenue = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });

    return months.map(monthStart => {
      const period = format(monthStart, 'yyyy-MM');
      let conRevenue = 0;
      let preconRevenue = 0;

      // Construction revenue from allocations
      projects.filter(p => p.project_type === 'construction').forEach(p => {
        const alloc = (p.monthly_revenue_allocations || []).find(a => a.period === period);
        if (alloc && p.contract_value) {
          conRevenue += (alloc.percentage / 100) * p.contract_value;
        }
      });

      // Precon revenue - attribute to close month
      sales.filter(s => s.sale_type === 'preconstruction' && s.status === 'closed_won').forEach(s => {
        const history = s.phase_history || [];
        const closedEntry = [...history].reverse().find(h => h.status === 'closed_won');
        const closeDate = closedEntry ? new Date(closedEntry.entered_date) : (s.close_date ? new Date(s.close_date) : null);
        if (closeDate && format(closeDate, 'yyyy-MM') === period) {
          preconRevenue += s.contract_value || 0;
        }
      });

      return {
        month: format(monthStart, 'MMM yyyy'),
        construction: Math.round(conRevenue),
        preconstruction: Math.round(preconRevenue),
        total: Math.round(conRevenue + preconRevenue),
      };
    });
  }, [projects, sales, dateRange]);

  // Revenue by client (top clients)
  const clientRevenue = useMemo(() => {
    const byClient = {};

    // Construction revenue from closed projects
    projects.filter(p => p.project_type === 'construction' && p.status === 'closed').forEach(p => {
      const clientId = p.client_id;
      if (!byClient[clientId]) byClient[clientId] = { construction: 0, precon: 0 };
      byClient[clientId].construction += p.contract_value || 0;
    });

    // Precon revenue from closed sales
    sales.filter(s => s.sale_type === 'preconstruction' && s.status === 'closed_won').forEach(s => {
      const clientId = s.client_id;
      if (!byClient[clientId]) byClient[clientId] = { construction: 0, precon: 0 };
      byClient[clientId].precon += s.contract_value || 0;
    });

    return Object.entries(byClient)
      .map(([clientId, data]) => ({
        name: getClientName(clientId),
        ...data,
        total: data.construction + data.precon,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [projects, sales, clients]);

  // Fiscal goal progress
  const goalProgress = useMemo(() => {
    if (!companyKPIs) return null;
    // Find the matching fiscal goal
    const goal = fiscalGoals.find(g => {
      // Simple match: just find a goal that seems relevant
      return g.revenue_target;
    });
    if (!goal) return null;

    return {
      revenueTarget: goal.revenue_target,
      revenueActual: companyKPIs.totalRevenue,
      revenuePercent: goal.revenue_target > 0 ? (companyKPIs.totalRevenue / goal.revenue_target) * 100 : 0,
      marginTarget: goal.gross_margin_target,
      marginActual: companyKPIs.grossMargin,
      projectTarget: goal.project_count_target,
      projectActual: companyKPIs.closedConstructionCount,
      salesVolumeTarget: goal.sales_volume_target,
    };
  }, [companyKPIs, fiscalGoals]);

  // Pipeline funnel data
  const funnelData = useMemo(() => {
    if (!companyKPIs) return [];
    return [
      { stage: 'Leads', count: companyKPIs.totalLeads },
      { stage: 'Converted Leads', count: companyKPIs.convertedLeads },
      { stage: 'Precon Sales Won', count: companyKPIs.wonPreconSales },
      { stage: 'Construction Closed', count: companyKPIs.closedConstructionCount },
    ];
  }, [companyKPIs]);

  // Revenue type breakdown for pie chart
  const revenueBreakdown = useMemo(() => {
    if (!companyKPIs || companyKPIs.totalRevenue === 0) return [];
    return [
      { name: 'Construction', value: companyKPIs.conRevenue },
      { name: 'Pre-Construction', value: companyKPIs.preconRevenue },
    ].filter(d => d.value > 0);
  }, [companyKPIs]);

  // Drilldown configurations
  const drilldownConfigs = useMemo(() => {
    if (!companyKPIs) return {};

    const closedConstruction = projects.filter(p => {
      if (p.project_type !== 'construction' || p.status !== 'closed') return false;
      const history = p.status_history || [];
      const closedEntry = [...history].reverse().find(h => h.status === 'closed');
      const closedDate = closedEntry ? new Date(closedEntry.entered_date) : (p.actual_completion_date ? new Date(p.actual_completion_date) : null);
      if (!closedDate) return false;
      return closedDate >= dateRange.start && closedDate <= dateRange.end;
    });

    const closedPrecon = sales.filter(s => {
      if (s.sale_type !== 'preconstruction' || s.status !== 'closed_won') return false;
      const history = s.phase_history || [];
      const closedEntry = [...history].reverse().find(h => h.status === 'closed_won');
      const closedDate = closedEntry ? new Date(closedEntry.entered_date) : (s.close_date ? new Date(s.close_date) : null);
      if (!closedDate) return false;
      return closedDate >= dateRange.start && closedDate <= dateRange.end;
    });

    return {
      totalRevenue: {
        title: 'Total Revenue Breakdown',
        formula: `Construction revenue (contract_value of ${closedConstruction.length} closed projects) + Pre-construction revenue (contract_value of ${closedPrecon.length} closed_won precon sales). Construction: $${(companyKPIs.conRevenue/1000).toFixed(0)}K + Precon: $${(companyKPIs.preconRevenue/1000).toFixed(0)}K = $${(companyKPIs.totalRevenue/1000).toFixed(0)}K`,
        items: [
          ...closedConstruction.map(p => ({ ...p, _type: 'construction', _value: p.contract_value || 0 })),
          ...closedPrecon.map(s => ({ ...s, _type: 'precon', _value: s.contract_value || 0 })),
        ],
        columns: ['Name', 'Type', 'Client', 'Value'],
      },
      grossMargin: {
        title: 'Gross Margin Breakdown',
        formula: `(Total Revenue - Construction Costs) / Total Revenue. ($${(companyKPIs.totalRevenue/1000).toFixed(0)}K - $${(companyKPIs.conCosts/1000).toFixed(0)}K) / $${(companyKPIs.totalRevenue/1000).toFixed(0)}K = ${companyKPIs.grossMargin.toFixed(1)}%. Note: precon costs are not tracked separately, so precon revenue is treated as 100% margin.`,
        items: closedConstruction.map(p => ({ ...p, _type: 'construction', _value: p.contract_value || 0, _cost: p.actual_costs || 0, _margin: p.contract_value ? ((p.contract_value - (p.actual_costs || 0)) / p.contract_value * 100) : 0 })),
        columns: ['Project', 'Client', 'Contract', 'Costs', 'Margin %'],
      },
      grossProfit: {
        title: 'Gross Profit Breakdown',
        formula: `Total Revenue ($${(companyKPIs.totalRevenue/1000).toFixed(0)}K) - Construction Costs ($${(companyKPIs.conCosts/1000).toFixed(0)}K) = $${(companyKPIs.totalGrossProfit/1000).toFixed(0)}K gross profit.`,
        items: closedConstruction,
        columns: ['Project', 'Client', 'Contract', 'Costs', 'Profit'],
      },
      activePipeline: {
        title: 'Active Pipeline',
        formula: `Sum of contract_value for all construction projects where status ≠ "closed". ${companyKPIs.activeProjectCount} active projects.`,
        items: projects.filter(p => p.project_type === 'construction' && p.status !== 'closed'),
        columns: ['Project', 'Client', 'Status', 'Contract Value'],
      },
      activeLeads: {
        title: 'Active Leads',
        formula: `Count of leads where status is NOT "converted" or "disqualified".`,
        items: leads.filter(l => !['converted', 'disqualified'].includes(l.status)),
        columns: ['Lead', 'Client', 'Status', 'Source'],
      },
      activeSales: {
        title: 'Active Pre-Construction Sales',
        formula: `Count of preconstruction sales not closed_won or closed_lost.`,
        items: sales.filter(s => s.sale_type === 'preconstruction' && !['closed_won', 'closed_lost'].includes(s.status)),
        columns: ['Sale', 'Client', 'Status', 'Contract Value'],
      },
      leadConversion: {
        title: 'Lead Conversion Rate',
        formula: `Converted leads / Total leads (all time). ${companyKPIs.convertedLeads} / ${companyKPIs.totalLeads} = ${companyKPIs.leadConversion.toFixed(1)}%`,
        items: leads.filter(l => ['converted', 'disqualified'].includes(l.status)),
        columns: ['Lead', 'Client', 'Status', 'Source'],
      },
      preconWinRate: {
        title: 'Pre-Con Win Rate',
        formula: `Won precon sales / Total precon sales (all time). ${companyKPIs.wonPreconSales} / ${companyKPIs.totalPreconSales} = ${companyKPIs.preconWinRate.toFixed(1)}%`,
        items: sales.filter(s => s.sale_type === 'preconstruction' && ['closed_won', 'closed_lost'].includes(s.status)),
        columns: ['Sale', 'Client', 'Status', 'Contract Value'],
      },
    };
  }, [companyKPIs, projects, sales, leads, dateRange]);

  if (!dateRange.start || !dateRange.end) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          Please select a date range to view company reports
        </CardContent>
      </Card>
    );
  }

  if (!companyKPIs) return null;

  return (
    <div className="space-y-6">
      {/* Company KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('totalRevenue')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <DollarSign className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm text-slate-600">Total Revenue</p>
            <p className="text-3xl font-bold text-emerald-600">${(companyKPIs.totalRevenue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('grossMargin')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-sm text-slate-600">Gross Margin</p>
            <p className={`text-3xl font-bold ${companyKPIs.grossMargin >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {companyKPIs.grossMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('grossProfit')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <DollarSign className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-sm text-slate-600">Gross Profit</p>
            <p className="text-3xl font-bold text-blue-600">${(companyKPIs.totalGrossProfit / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('activePipeline')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <Building2 className="w-6 h-6 mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-slate-600">Active Pipeline</p>
            <p className="text-3xl font-bold text-amber-600">${(companyKPIs.activePipelineValue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('activeLeads')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <p className="text-sm text-slate-600">Active Leads</p>
            <p className="text-2xl font-bold text-slate-900">{companyKPIs.activeLeads}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('activeSales')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <p className="text-sm text-slate-600">Active Sales</p>
            <p className="text-2xl font-bold text-slate-900">{companyKPIs.activeSales}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('activePipeline')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <p className="text-sm text-slate-600">Active Projects</p>
            <p className="text-2xl font-bold text-slate-900">{companyKPIs.activeProjectCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('leadConversion')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <p className="text-sm text-slate-600">Lead Conversion</p>
            <p className="text-2xl font-bold text-slate-900">{companyKPIs.leadConversion.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrilldown('preconWinRate')}>
          <CardContent className="pt-6 text-center relative">
            <Info className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-300" />
            <p className="text-sm text-slate-600">Precon Win Rate</p>
            <p className="text-2xl font-bold text-slate-900">{companyKPIs.preconWinRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Fiscal Goal Progress */}
      {goalProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Fiscal Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {goalProgress.revenueTarget > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Revenue Target</span>
                  <span className="text-sm text-slate-600">
                    ${Math.round(goalProgress.revenueActual).toLocaleString()} / ${Math.round(goalProgress.revenueTarget).toLocaleString()}
                  </span>
                </div>
                <Progress value={Math.min(goalProgress.revenuePercent, 100)} className="h-3" />
                <p className="text-xs text-slate-500 mt-1">{goalProgress.revenuePercent.toFixed(1)}% achieved</p>
              </div>
            )}
            {goalProgress.marginTarget > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Gross Margin Target</span>
                  <span className="text-sm text-slate-600">
                    {goalProgress.marginActual.toFixed(1)}% / {goalProgress.marginTarget}%
                  </span>
                </div>
                <Progress value={Math.min((goalProgress.marginActual / goalProgress.marginTarget) * 100, 100)} className="h-3" />
              </div>
            )}
            {goalProgress.projectTarget > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Projects Completed Target</span>
                  <span className="text-sm text-slate-600">
                    {goalProgress.projectActual} / {goalProgress.projectTarget}
                  </span>
                </div>
                <Progress value={Math.min((goalProgress.projectActual / goalProgress.projectTarget) * 100, 100)} className="h-3" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue by Month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Monthly Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="construction" stackId="rev" fill="#10b981" name="Construction" />
                <Bar dataKey="preconstruction" stackId="rev" fill="#3b82f6" name="Pre-Construction" />
                <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} name="Total" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-slate-500">No monthly data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown Pie */}
        {revenueBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Revenue Mix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: $${(value / 1000).toFixed(0)}K`}
                  >
                    {revenueBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Pipeline Funnel (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="count" name="Count">
                  {funnelData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      {clientRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              Top Clients by Revenue (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Construction</TableHead>
                  <TableHead className="text-right">Pre-Construction</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientRevenue.map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">${Math.round(c.construction).toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Math.round(c.precon).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">${Math.round(c.total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {/* Drilldown Dialog */}
      {drilldown && drilldownConfigs[drilldown] && (
        <Dialog open={!!drilldown} onOpenChange={(open) => !open && setDrilldown(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{drilldownConfigs[drilldown].title}</DialogTitle>
            </DialogHeader>
            
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">How this is calculated</p>
              <p className="text-xs text-slate-700 leading-relaxed">{drilldownConfigs[drilldown].formula}</p>
            </div>

            <p className="text-xs text-slate-500 mb-2">{drilldownConfigs[drilldown].items.length} items</p>

            {drilldownConfigs[drilldown].items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {drilldownConfigs[drilldown].columns.map(col => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownConfigs[drilldown].items.map(item => {
                      const config = drilldownConfigs[drilldown];
                      if (config.title.includes('Revenue Breakdown')) {
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>
                              <Badge className={item._type === 'precon' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>
                                {item._type === 'precon' ? 'Pre-Con' : 'Construction'}
                              </Badge>
                            </TableCell>
                            <TableCell>{getClientName(item.client_id)}</TableCell>
                            <TableCell className="font-semibold">${((item._value || 0) / 1000).toFixed(0)}K</TableCell>
                          </TableRow>
                        );
                      }
                      if (config.title.includes('Gross Margin')) {
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{getClientName(item.client_id)}</TableCell>
                            <TableCell>${((item._value || 0) / 1000).toFixed(0)}K</TableCell>
                            <TableCell>${((item._cost || 0) / 1000).toFixed(0)}K</TableCell>
                            <TableCell className={`font-semibold ${(item._margin || 0) >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{(item._margin || 0).toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      }
                      if (config.title.includes('Gross Profit')) {
                        const profit = (item.contract_value || 0) - (item.actual_costs || 0);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{getClientName(item.client_id)}</TableCell>
                            <TableCell>${((item.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
                            <TableCell>${((item.actual_costs || 0) / 1000).toFixed(0)}K</TableCell>
                            <TableCell className="font-semibold">${(profit / 1000).toFixed(0)}K</TableCell>
                          </TableRow>
                        );
                      }
                      if (config.title.includes('Pipeline') || config.title.includes('Active Pre-Construction')) {
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{getClientName(item.client_id)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{(item.status || '').replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell className="font-semibold">${((item.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
                          </TableRow>
                        );
                      }
                      if (config.title.includes('Lead')) {
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{getClientName(item.client_id)}</TableCell>
                            <TableCell>
                              <Badge className={item.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : item.status === 'disqualified' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                                {(item.status || '').replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{(item.source || '').replace(/_/g, ' ')}</TableCell>
                          </TableRow>
                        );
                      }
                      if (config.title.includes('Win Rate')) {
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{getClientName(item.client_id)}</TableCell>
                            <TableCell>
                              <Badge className={item.status === 'closed_won' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                {item.status === 'closed_won' ? 'Won' : 'Lost'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">${((item.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
                          </TableRow>
                        );
                      }
                      return null;
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No data for this metric</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}