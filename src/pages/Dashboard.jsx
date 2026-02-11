import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Target, Briefcase, Building2, TrendingUp, Settings2, Calendar, CheckCircle2, AlertCircle, Activity, Clock } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart, Bar, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, eachMonthOfInterval } from 'date-fns';
import { getFiscalYearLabel, getFiscalYearDates } from '../components/utils/fiscalYear';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedDateRangeType, setSelectedDateRangeType] = useState('fiscal_year');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  const [visibleMetrics, setVisibleMetrics] = useState({
    totalRevenue: true,
    activeProjects: true,
    activeSales: true,
    activeLead: true,
    cashFlow: true,
    margins: true,
    grossProfit: true,
    conversionRate: true,
    preconRevenue: true,
    constructionRevenue: true,
    winRate: true
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: companySettings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    initialData: [],
  });

  const { data: fiscalGoals = [] } = useQuery({
    queryKey: ['fiscalGoals'],
    queryFn: () => base44.entities.FiscalGoal.list(),
    initialData: [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
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

  const settings = companySettings[0] || {};
  const fiscalYearStartMonth = settings.fiscal_year_start_month || 10;

  const getDateRange = () => {
    const now = new Date();
    
    if (selectedDateRangeType === 'month') {
      return {
        start: startOfMonth(new Date(selectedYear, selectedMonth - 1, 1)),
        end: endOfMonth(new Date(selectedYear, selectedMonth - 1, 1))
      };
    } else if (selectedDateRangeType === 'quarter') {
      const quarterStartMonth = (selectedQuarter - 1) * 3;
      return {
        start: startOfQuarter(new Date(selectedYear, quarterStartMonth, 1)),
        end: endOfQuarter(new Date(selectedYear, quarterStartMonth, 1))
      };
    } else if (selectedDateRangeType === 'fiscal_year') {
      // Use centralized fiscal year calculation
      const { startDate, endDate } = getFiscalYearDates(fiscalYear, fiscalYearStartMonth);
      return { start: startDate, end: endDate };
    } else if (selectedDateRangeType === 'custom') {
      return {
        start: customStartDate ? new Date(customStartDate) : null,
        end: customEndDate ? new Date(customEndDate) : null
      };
    }
    return { start: null, end: null };
  };

  const dateRange = getDateRange();

  const filteredSales = sales.filter(sale => {
    if (!dateRange.start || !dateRange.end) return true;
    if (!sale.close_date) return false;
    const closeDate = new Date(sale.close_date);
    return closeDate >= dateRange.start && closeDate <= dateRange.end;
  });

  const filteredProjects = projects.filter(project => {
    if (!dateRange.start || !dateRange.end) return true;
    const projectDate = project.start_date ? new Date(project.start_date) : new Date(project.created_date);
    return projectDate >= dateRange.start && projectDate <= dateRange.end;
  });

  const filteredLeads = leads.filter(lead => {
    if (!dateRange.start || !dateRange.end) return true;
    const leadDate = new Date(lead.created_date);
    return leadDate >= dateRange.start && leadDate <= dateRange.end;
  });

  // Calculate metrics - closed jobs only
  const closedSales = filteredSales.filter(s => s.status === 'closed_won');
  const closedProjects = filteredProjects.filter(p => p.status === 'closed');
  
  // Precon revenue = the actual precon fees earned (contract_value on closed precon sales = Final Pre-Construction Value)
  const preconRevenue = closedSales.filter(s => s.sale_type === 'preconstruction').reduce((sum, s) => sum + (s.contract_value || 0), 0);
  // Construction revenue = construction contract values (separate from precon fees)
  const constructionRevenue = closedSales.filter(s => s.sale_type === 'construction').reduce((sum, s) => sum + (s.contract_value || 0), 0);
  // Total revenue = precon fees + construction contracts
  const totalRevenue = preconRevenue + constructionRevenue;
  
  const activeProjects = projects.filter(p => !['closed', 'completion'].includes(p.status)).length;
  const activeSales = sales.filter(s => ['feasibility', 'design_material_selections', 'engineering_permits', 'pending_construction_sale'].includes(s.status)).length;
  const activeLeads = leads.filter(l => !['converted', 'disqualified'].includes(l.status)).length;
  
  // Calculate weighted average margin from closed projects
  let totalProjectRevenue = 0;
  let totalGrossProfit = 0;
  
  closedProjects.forEach(p => {
    const revenue = p.contract_value || 0;
    const marginPct = p.actual_margin || 0;
    totalProjectRevenue += revenue;
    totalGrossProfit += revenue * (marginPct / 100);
  });
  
  const marginPercent = totalProjectRevenue > 0 ? (totalGrossProfit / totalProjectRevenue) * 100 : 0;

  const convertedLeads = filteredLeads.filter(l => l.status === 'converted').length;
  const totalLeadsForConversion = filteredLeads.filter(l => ['converted', 'disqualified'].includes(l.status)).length;
  const conversionRate = totalLeadsForConversion > 0 ? (convertedLeads / totalLeadsForConversion) * 100 : 0;

  const proposalLeads = filteredLeads.filter(l => {
    const statusHistory = l.status_history || [];
    return statusHistory.some(h => h.status === 'preconstruction_proposal');
  });
  const convertedAfterProposal = proposalLeads.filter(l => l.status === 'converted').length;
  const winRate = proposalLeads.length > 0 ? (convertedAfterProposal / proposalLeads.length) * 100 : 0;

  const currentFiscalGoal = fiscalGoals.find(g => g.fiscal_year === fiscalYear);

  // Calculate build capacity forecast
  const capacityForecast = useMemo(() => {
    if (!currentFiscalGoal?.revenue_target) return null;

    const currentDate = new Date();
    const fiscalYearEnd = new Date(fiscalYear, fiscalYearStartMonth - 1, 0);
    const monthsLeftInYear = Math.max(0, (fiscalYearEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    // Use current year capacity for remaining months, then next year capacity
    const currentYearMonthlyCapacity = currentFiscalGoal.revenue_target / 12;
    const nextYearMonthlyCapacity = settings.next_year_revenue_target 
      ? settings.next_year_revenue_target / 12 
      : currentYearMonthlyCapacity;

    // Sum active construction projects (not closed)
    const activeProjectsValue = projects
      .filter(p => p.status !== 'closed')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // Sum precon pipeline expected construction budgets
    const preconPipelineValue = sales
      .filter(s => 
        s.sale_type === 'preconstruction' && 
        s.status !== 'closed_won' && 
        s.status !== 'closed_lost'
      )
      .reduce((sum, s) => sum + (s.estimated_construction_budget || 0), 0);

    // Total pipeline
    const totalPipeline = activeProjectsValue + preconPipelineValue;

    // Calculate months of backlog with growth consideration
    let remainingPipeline = totalPipeline;
    let monthsOfBacklog = 0;
    
    // First, use current year's remaining capacity
    const currentYearCapacity = currentYearMonthlyCapacity * monthsLeftInYear;
    if (remainingPipeline > currentYearCapacity) {
      monthsOfBacklog += monthsLeftInYear;
      remainingPipeline -= currentYearCapacity;
      // Use next year's capacity for remaining pipeline
      monthsOfBacklog += remainingPipeline / nextYearMonthlyCapacity;
    } else {
      monthsOfBacklog = remainingPipeline / currentYearMonthlyCapacity;
    }

    return {
      monthlyCapacity: currentYearMonthlyCapacity,
      nextYearMonthlyCapacity,
      activeProjectsValue,
      preconPipelineValue,
      totalPipeline,
      monthsOfBacklog,
      usingGrowthForecast: !!settings.next_year_revenue_target
    };
  }, [currentFiscalGoal, projects, sales, settings, fiscalYear, fiscalYearStartMonth]);

  // Monthly trend data
  const monthlyTrendData = dateRange.start && dateRange.end ? eachMonthOfInterval({
    start: dateRange.start,
    end: dateRange.end
  }).map(month => {
    const monthSales = sales.filter(s => {
      if (!s.close_date) return false;
      const closeDate = new Date(s.close_date);
      return closeDate >= startOfMonth(month) && closeDate <= endOfMonth(month);
    });
    const revenue = monthSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);
    return {
      month: format(month, 'MMM yy'),
      revenue: revenue / 1000
    };
  }) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Company Health Overview</h1>
          <p className="text-lg text-slate-500">Real-time snapshot of company performance</p>
        </div>
        <Button onClick={() => setCustomizeDialogOpen(true)} variant="outline">
          <Settings2 className="w-4 h-4 mr-2" />
          Customize
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-amber-600" />
            <Label className="text-base font-semibold">Date Range</Label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant={selectedDateRangeType === 'month' ? 'default' : 'outline'}
              onClick={() => setSelectedDateRangeType('month')}
              className={selectedDateRangeType === 'month' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              Month
            </Button>
            <Button
              variant={selectedDateRangeType === 'quarter' ? 'default' : 'outline'}
              onClick={() => setSelectedDateRangeType('quarter')}
              className={selectedDateRangeType === 'quarter' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              Quarter
            </Button>
            <Button
              variant={selectedDateRangeType === 'fiscal_year' ? 'default' : 'outline'}
              onClick={() => setSelectedDateRangeType('fiscal_year')}
              className={selectedDateRangeType === 'fiscal_year' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              Fiscal Year
            </Button>
            <Button
              variant={selectedDateRangeType === 'custom' ? 'default' : 'outline'}
              onClick={() => setSelectedDateRangeType('custom')}
              className={selectedDateRangeType === 'custom' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              Custom
            </Button>
          </div>

          {selectedDateRangeType === 'month' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs">Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {selectedDateRangeType === 'quarter' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs">Quarter</Label>
                <Input
                  type="number"
                  min="1"
                  max="4"
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {selectedDateRangeType === 'fiscal_year' && (
            <div className="mt-3">
              <Label className="text-xs">Fiscal Year</Label>
              <Input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value))}
              />
              <p className="text-xs text-slate-500 mt-1">
                {getFiscalYearLabel(fiscalYear, fiscalYearStartMonth, true)}
              </p>
            </div>
          )}

          {selectedDateRangeType === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleMetrics.totalRevenue && (
          <StatCard
            title="Total Revenue (Closed)"
            value={`$${(totalRevenue / 1000).toFixed(0)}K`}
            icon={DollarSign}
            subtitle={`${closedSales.length} closed sales`}
          />
        )}
        {visibleMetrics.preconRevenue && (
          <StatCard
            title="Pre-Construction Revenue"
            value={`$${(preconRevenue / 1000).toFixed(0)}K`}
            icon={Briefcase}
            subtitle={`${closedSales.filter(s => s.sale_type === 'preconstruction').length} closed precon sales`}
          />
        )}
        {visibleMetrics.constructionRevenue && (
          <StatCard
            title="Construction Revenue"
            value={`$${(constructionRevenue / 1000).toFixed(0)}K`}
            icon={Building2}
            subtitle={`${closedSales.filter(s => s.sale_type === 'construction').length} closed construction sales`}
          />
        )}
        {visibleMetrics.activeProjects && (
          <StatCard
            title="Active Projects"
            value={activeProjects}
            icon={Activity}
            subtitle={`${projects.length} total projects`}
          />
        )}
        {visibleMetrics.activeSales && (
          <StatCard
            title="Active Pre-Con Sales"
            value={activeSales}
            icon={Briefcase}
            subtitle="In pipeline"
          />
        )}
        {visibleMetrics.activeLeads && (
          <StatCard
            title="Active Leads"
            value={activeLeads}
            icon={Target}
            subtitle={`${leads.length} total leads`}
          />
        )}
        {visibleMetrics.grossProfit && (
          <StatCard
            title="Total Gross Profit"
            value={`$${(totalGrossProfit / 1000).toFixed(0)}K`}
            icon={DollarSign}
            subtitle={`${closedProjects.length} closed projects`}
          />
        )}
        {visibleMetrics.margins && (
          <StatCard
            title="Gross Margin %"
            value={`${marginPercent.toFixed(1)}%`}
            icon={TrendingUp}
            subtitle={`Weighted average`}
            trend={marginPercent > 20 ? 'Healthy' : 'Below target'}
            trendDirection={marginPercent > 20 ? 'up' : 'down'}
          />
        )}
        {visibleMetrics.conversionRate && (
          <StatCard
            title="Lead Conversion Rate"
            value={`${conversionRate.toFixed(1)}%`}
            icon={Target}
            subtitle={`${convertedLeads}/${totalLeadsForConversion} converted`}
          />
        )}
        {visibleMetrics.winRate && (
          <StatCard
            title="Win Rate (After Proposal)"
            value={`${winRate.toFixed(1)}%`}
            icon={CheckCircle2}
            subtitle={`${convertedAfterProposal}/${proposalLeads.length} won`}
          />
        )}
      </div>

      {/* Build Capacity Forecast */}
      {capacityForecast && (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Build Capacity Forecast
            </CardTitle>
            <CardDescription>
              Based on {getFiscalYearLabel(fiscalYear, fiscalYearStartMonth)} revenue target of ${(currentFiscalGoal.revenue_target / 1000000).toFixed(1)}M
              {capacityForecast.usingGrowthForecast && settings.next_year_revenue_target && (
                <> · Next year: ${(settings.next_year_revenue_target / 1000000).toFixed(1)}M</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Monthly Capacity</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${(capacityForecast.monthlyCapacity / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Current year
                  {capacityForecast.usingGrowthForecast && (
                    <> · Next: ${(capacityForecast.nextYearMonthlyCapacity / 1000).toFixed(0)}K</>
                  )}
                </p>
              </div>
              
              <div className="p-4 bg-white rounded-lg border border-amber-200">
                <p className="text-xs text-slate-600 mb-1">Active Projects</p>
                <p className="text-2xl font-bold text-amber-700">
                  ${(capacityForecast.activeProjectsValue / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-slate-500 mt-1">In construction</p>
              </div>
              
              <div className="p-4 bg-white rounded-lg border border-emerald-200">
                <p className="text-xs text-slate-600 mb-1">Precon Pipeline</p>
                <p className="text-2xl font-bold text-emerald-700">
                  ${(capacityForecast.preconPipelineValue / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-slate-500 mt-1">Expected construction</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg border-2 border-slate-300">
                <p className="text-xs text-slate-600 mb-1 font-semibold">New Client Wait Time</p>
                <p className="text-3xl font-bold text-slate-900">
                  {capacityForecast.monthsOfBacklog.toFixed(1)}
                </p>
                <p className="text-xs text-slate-600 mt-1">Months backlog</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Total Pipeline:</strong> ${(capacityForecast.totalPipeline / 1000).toFixed(0)}K
                <span className="mx-2">•</span>
                New clients can expect to start construction in approximately <strong>{Math.ceil(capacityForecast.monthsOfBacklog)} months</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fiscal Goal Progress */}
      {currentFiscalGoal && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              {getFiscalYearLabel(fiscalYear, fiscalYearStartMonth, true)} Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentFiscalGoal.revenue_target && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Revenue Target</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${(totalRevenue / 1000).toFixed(0)}K / ${(currentFiscalGoal.revenue_target / 1000).toFixed(0)}K
                  </p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((totalRevenue / currentFiscalGoal.revenue_target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {currentFiscalGoal.gross_margin_target && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Margin Target</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {marginPercent.toFixed(1)}% / {currentFiscalGoal.gross_margin_target}%
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {marginPercent >= currentFiscalGoal.gross_margin_target ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                </div>
              )}
              {currentFiscalGoal.project_count_target && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Project Target</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {filteredProjects.length} / {currentFiscalGoal.project_count_target}
                  </p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((filteredProjects.length / currentFiscalGoal.project_count_target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(0)}K`} />
                <Legend />
                <Bar dataKey="revenue" fill="#F59E0B" name="Revenue ($K)" />
                <Line type="monotone" dataKey="revenue" stroke="#0F172A" strokeWidth={2} name="Trend" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-400 py-8">No data for selected period</p>
          )}
        </CardContent>
      </Card>

      {/* Customize Dialog */}
      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Select which metrics to display on your dashboard:</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="totalRevenue"
                  checked={visibleMetrics.totalRevenue}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, totalRevenue: checked})}
                />
                <Label htmlFor="totalRevenue" className="cursor-pointer">Total Revenue</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preconRevenue"
                  checked={visibleMetrics.preconRevenue}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, preconRevenue: checked})}
                />
                <Label htmlFor="preconRevenue" className="cursor-pointer">Pre-Construction Revenue</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="constructionRevenue"
                  checked={visibleMetrics.constructionRevenue}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, constructionRevenue: checked})}
                />
                <Label htmlFor="constructionRevenue" className="cursor-pointer">Construction Revenue</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activeProjects"
                  checked={visibleMetrics.activeProjects}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, activeProjects: checked})}
                />
                <Label htmlFor="activeProjects" className="cursor-pointer">Active Projects</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activeSales"
                  checked={visibleMetrics.activeSales}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, activeSales: checked})}
                />
                <Label htmlFor="activeSales" className="cursor-pointer">Active Pre-Con Sales</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activeLeads"
                  checked={visibleMetrics.activeLeads}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, activeLeads: checked})}
                />
                <Label htmlFor="activeLeads" className="cursor-pointer">Active Leads</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="grossProfit"
                  checked={visibleMetrics.grossProfit}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, grossProfit: checked})}
                />
                <Label htmlFor="grossProfit" className="cursor-pointer">Total Gross Profit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="margins"
                  checked={visibleMetrics.margins}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, margins: checked})}
                />
                <Label htmlFor="margins" className="cursor-pointer">Gross Margin %</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conversionRate"
                  checked={visibleMetrics.conversionRate}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, conversionRate: checked})}
                />
                <Label htmlFor="conversionRate" className="cursor-pointer">Lead Conversion Rate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="winRate"
                  checked={visibleMetrics.winRate}
                  onCheckedChange={(checked) => setVisibleMetrics({...visibleMetrics, winRate: checked})}
                />
                <Label htmlFor="winRate" className="cursor-pointer">Win Rate (After Proposal)</Label>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setCustomizeDialogOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}