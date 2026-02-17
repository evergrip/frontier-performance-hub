import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Target, Briefcase, Building2, TrendingUp, Settings2, CheckCircle2, Activity } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, format, eachMonthOfInterval } from 'date-fns';
import { getFiscalYearLabel, getFiscalYearDates } from '../components/utils/fiscalYear';
import MetricDrilldownDialog from '../components/dashboard/MetricDrilldownDialog';
import DateRangeSelector from '../components/dashboard/DateRangeSelector';
import BuildCapacityForecast from '../components/dashboard/BuildCapacityForecast';
import FiscalGoalProgress from '../components/dashboard/FiscalGoalProgress';
import RevenueTrendChart from '../components/dashboard/RevenueTrendChart';
import CustomizeMetricsDialog from '../components/dashboard/CustomizeMetricsDialog';

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
  const [drilldownMetric, setDrilldownMetric] = useState(null);

  const [visibleMetrics, setVisibleMetrics] = useState({
    totalRevenue: true,
    activeProjects: true,
    activeSales: true,
    activeLeads: true,
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

  const { data: companySettings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    initialData: [],
  });

  const { data: fiscalGoals = [] } = useQuery({
    queryKey: ['fiscalGoals'],
    queryFn: () => base44.entities.FiscalGoal.list(),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: [],
  });

  const isLoading = settingsLoading || leadsLoading || salesLoading || projectsLoading;

  const settings = companySettings[0] || {};
  const fiscalYearStartMonth = settings.fiscal_year_start_month || 10;

  const dateRange = useMemo(() => {
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
      const { startDate, endDate } = getFiscalYearDates(fiscalYear, fiscalYearStartMonth);
      return { start: startDate, end: endDate };
    } else if (selectedDateRangeType === 'custom') {
      return {
        start: customStartDate ? new Date(customStartDate) : null,
        end: customEndDate ? new Date(customEndDate) : null
      };
    }
    return { start: null, end: null };
  }, [selectedDateRangeType, selectedMonth, selectedYear, selectedQuarter, fiscalYear, fiscalYearStartMonth, customStartDate, customEndDate]);

  // Helper: get effective date for a sale using phase_history dates
  const getSaleEffectiveDate = (sale) => {
    const history = sale.phase_history || [];
    if (history.length > 0) return new Date(history[0].entered_date);
    if (sale.close_date) return new Date(sale.close_date);
    return new Date(sale.created_date);
  };

  // Helper: get effective date for a project using status_history dates
  const getProjectEffectiveDate = (project) => {
    const history = project.status_history || [];
    const constructionEntry = history.find(h => h.status === 'awaiting_to_be_scheduled');
    if (constructionEntry) return new Date(constructionEntry.entered_date);
    if (history.length > 0) return new Date(history[0].entered_date);
    if (project.start_date) return new Date(project.start_date);
    return new Date(project.created_date);
  };

  // Memoized filtered data
  const filteredSales = useMemo(() => sales.filter(sale => {
    if (!dateRange.start || !dateRange.end) return true;
    const effectiveDate = getSaleEffectiveDate(sale);
    return effectiveDate >= dateRange.start && effectiveDate <= dateRange.end;
  }), [sales, dateRange]);

  const filteredProjects = useMemo(() => projects.filter(project => {
    if (!dateRange.start || !dateRange.end) return true;
    const effectiveDate = getProjectEffectiveDate(project);
    return effectiveDate >= dateRange.start && effectiveDate <= dateRange.end;
  }), [projects, dateRange]);

  const filteredLeads = useMemo(() => leads.filter(lead => {
    if (!dateRange.start || !dateRange.end) return true;
    const leadDate = new Date(lead.created_date);
    return leadDate >= dateRange.start && leadDate <= dateRange.end;
  }), [leads, dateRange]);

  // Memoized metrics calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const closedSales = filteredSales.filter(s => s.status === 'closed_won');
    const closedProjects = filteredProjects.filter(p => p.status === 'closed');
    
    const preconRevenue = closedSales.filter(s => s.sale_type === 'preconstruction').reduce((sum, s) => sum + (s.contract_value || 0), 0);
    
    const closedConstructionRevenue = closedProjects
      .filter(p => p.project_type === 'construction')
      .reduce((sum, p) => sum + (p.actual_costs || p.contract_value || 0), 0);

    const activeRecognizedRevenue = projects
      .filter(p => 
        p.project_type === 'construction' && 
        ['active_construction', 'substantial_completion_closeout'].includes(p.status) &&
        p.monthly_revenue_allocations?.length > 0
      )
      .reduce((sum, p) => {
        const revenueBase = p.actual_costs || p.contract_value || 0;
        const pastAllocations = (p.monthly_revenue_allocations || []).filter(a => {
          let aYear = a.year != null ? Number(a.year) : null;
          let aMonth = a.month != null ? Number(a.month) : null;
          if (!aYear && a.period) {
            const parts = a.period.split('-');
            aYear = parseInt(parts[0]);
            aMonth = parseInt(parts[1]);
          }
          if (!aYear || !aMonth) return false;
          const isPast = (aYear < currentYear) || (aYear === currentYear && aMonth < currentMonth);
          if (!isPast) return false;
          if (dateRange.start && dateRange.end) {
            const allocDate = new Date(aYear, aMonth - 1, 1);
            if (allocDate < dateRange.start || allocDate > dateRange.end) return false;
          }
          return true;
        });
        const pastPercent = pastAllocations.reduce((s, a) => s + (a.percentage || 0), 0);
        return sum + (revenueBase * pastPercent / 100);
      }, 0);

    const constructionRevenue = closedConstructionRevenue + activeRecognizedRevenue;
    const totalRevenue = preconRevenue + constructionRevenue;
    
    const activeProjectsCount = projects.filter(p => !['closed', 'completion'].includes(p.status)).length;
    const activeSalesCount = sales.filter(s => ['feasibility', 'design_material_selections', 'engineering_permits', 'pending_construction_sale'].includes(s.status)).length;
    const activeLeadsCount = leads.filter(l => !['converted', 'disqualified'].includes(l.status)).length;
    
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

    return {
      closedSales, closedProjects, preconRevenue, constructionRevenue, totalRevenue,
      activeProjectsCount, activeSalesCount, activeLeadsCount,
      totalGrossProfit, marginPercent,
      convertedLeads, totalLeadsForConversion, conversionRate,
      proposalLeads, convertedAfterProposal, winRate,
      activeRecognizedRevenue
    };
  }, [filteredSales, filteredProjects, filteredLeads, projects, sales, leads, dateRange]);

  const currentFiscalGoal = useMemo(() => fiscalGoals.find(g => g.fiscal_year === fiscalYear), [fiscalGoals, fiscalYear]);

  // Build capacity forecast
  const capacityForecast = useMemo(() => {
    if (!currentFiscalGoal?.revenue_target) return null;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const fiscalYearEnd = new Date(fiscalYear, fiscalYearStartMonth - 1, 0);
    const monthsLeftInYear = Math.max(0, (fiscalYearEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    const capacitySchedule = (settings.monthly_capacity_schedule || [])
      .filter(e => e.effective_year && e.effective_month && e.monthly_capacity)
      .sort((a, b) => a.effective_year !== b.effective_year ? a.effective_year - b.effective_year : a.effective_month - b.effective_month);

    const getCapacityForMonth = (year, month) => {
      let capacity = null;
      for (const entry of capacitySchedule) {
        if (entry.effective_year < year || (entry.effective_year === year && entry.effective_month <= month)) {
          capacity = entry.monthly_capacity;
        }
      }
      return capacity;
    };

    const currentCapacity = getCapacityForMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
    const currentYearMonthlyCapacity = currentCapacity || (currentFiscalGoal.revenue_target / 12);
    const nextYearCapacity = getCapacityForMonth(currentDate.getFullYear() + 1, 1);
    const nextYearMonthlyCapacity = nextYearCapacity || (settings.next_year_revenue_target ? settings.next_year_revenue_target / 12 : currentYearMonthlyCapacity);
    const hasManualCapacity = !!currentCapacity;

    const activeProjectsValue = projects
      .filter(p => p.status !== 'closed')
      .reduce((sum, p) => {
        const contractVal = p.contract_value || 0;
        const pastAllocPct = (p.monthly_revenue_allocations || [])
          .filter(a => {
            let aYear = a.year != null ? Number(a.year) : null;
            let aMonth = a.month != null ? Number(a.month) : null;
            if (!aYear && a.period) { const parts = a.period.split('-'); aYear = parseInt(parts[0]); aMonth = parseInt(parts[1]); }
            if (!aYear || !aMonth) return false;
            return (aYear < currentYear) || (aYear === currentYear && aMonth < currentMonth);
          })
          .reduce((s, a) => s + (a.percentage || 0), 0);
        return sum + contractVal - (contractVal * pastAllocPct / 100);
      }, 0);

    const preconPipelineValue = sales
      .filter(s => s.sale_type === 'preconstruction' && s.status !== 'closed_won' && s.status !== 'closed_lost')
      .reduce((sum, s) => sum + (s.estimated_construction_budget || 0), 0);

    const totalPipeline = activeProjectsValue + preconPipelineValue;

    let remainingPipeline = totalPipeline;
    let monthsOfBacklog = 0;
    const currentYearCapacityTotal = currentYearMonthlyCapacity * monthsLeftInYear;
    if (remainingPipeline > currentYearCapacityTotal) {
      monthsOfBacklog += monthsLeftInYear;
      remainingPipeline -= currentYearCapacityTotal;
      monthsOfBacklog += remainingPipeline / nextYearMonthlyCapacity;
    } else {
      monthsOfBacklog = remainingPipeline / currentYearMonthlyCapacity;
    }

    return {
      monthlyCapacity: currentYearMonthlyCapacity, nextYearMonthlyCapacity,
      activeProjectsValue, preconPipelineValue, totalPipeline, monthsOfBacklog,
      usingGrowthForecast: !!settings.next_year_revenue_target || !!nextYearCapacity,
      hasManualCapacity
    };
  }, [currentFiscalGoal, projects, sales, settings, fiscalYear, fiscalYearStartMonth]);

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    return eachMonthOfInterval({ start: dateRange.start, end: dateRange.end }).map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const monthNum = month.getMonth() + 1;
      const yearNum = month.getFullYear();
      
      const monthPrecon = sales.filter(s => {
        if (s.sale_type !== 'preconstruction' || s.status !== 'closed_won') return false;
        const d = getSaleEffectiveDate(s);
        return d >= mStart && d <= mEnd;
      }).reduce((sum, s) => sum + (s.contract_value || 0), 0);
      
      let monthConstruction = 0;
      const targetPeriod = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
      projects.filter(p => p.project_type === 'construction').forEach(p => {
        const allocations = p.monthly_revenue_allocations || [];
        const alloc = allocations.find(a => {
          if (a.period === targetPeriod) return true;
          let aYear = a.year != null ? Number(a.year) : null;
          let aMonth = a.month != null ? Number(a.month) : null;
          if (!aYear && a.period) { const parts = a.period.split('-'); aYear = parseInt(parts[0]); aMonth = parseInt(parts[1]); }
          return aYear === yearNum && aMonth === monthNum;
        });
        if (alloc && alloc.percentage > 0) {
          monthConstruction += (p.contract_value || 0) * (alloc.percentage / 100);
        }
      });

      projects.filter(p => {
        if (p.project_type !== 'construction' || p.status !== 'closed') return false;
        if (p.monthly_revenue_allocations?.length > 0) return false;
        const d = getProjectEffectiveDate(p);
        return d >= mStart && d <= mEnd;
      }).forEach(p => {
        monthConstruction += p.actual_costs || p.contract_value || 0;
      });
      
      return { month: format(month, 'MMM yy'), revenue: (monthPrecon + monthConstruction) / 1000 };
    });
  }, [dateRange, sales, projects]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Company Health Overview</h1>
          <p className="text-lg text-slate-500">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

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
      <DateRangeSelector
        selectedDateRangeType={selectedDateRangeType} setSelectedDateRangeType={setSelectedDateRangeType}
        selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear} setSelectedYear={setSelectedYear}
        selectedQuarter={selectedQuarter} setSelectedQuarter={setSelectedQuarter}
        customStartDate={customStartDate} setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate} setCustomEndDate={setCustomEndDate}
        fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
        fiscalYearStartMonth={fiscalYearStartMonth}
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleMetrics.totalRevenue && (
          <StatCard title="Total Revenue (Closed)" value={`$${(metrics.totalRevenue / 1000).toFixed(0)}K`} icon={DollarSign}
            subtitle={`${metrics.closedSales.length} closed sales`} onClick={() => setDrilldownMetric('totalRevenue')} />
        )}
        {visibleMetrics.preconRevenue && (
          <StatCard title="Pre-Construction Revenue" value={`$${(metrics.preconRevenue / 1000).toFixed(0)}K`} icon={Briefcase}
            subtitle={`${metrics.closedSales.filter(s => s.sale_type === 'preconstruction').length} closed precon sales`} onClick={() => setDrilldownMetric('preconRevenue')} />
        )}
        {visibleMetrics.constructionRevenue && (
          <StatCard title="Construction Revenue" value={`$${(metrics.constructionRevenue / 1000).toFixed(0)}K`} icon={Building2}
            subtitle={`${metrics.closedProjects.filter(p => p.project_type === 'construction').length} closed + $${(metrics.activeRecognizedRevenue / 1000).toFixed(0)}K recognized from active`}
            onClick={() => setDrilldownMetric('constructionRevenue')} />
        )}
        {visibleMetrics.activeProjects && (
          <StatCard title="Active Projects" value={metrics.activeProjectsCount} icon={Activity}
            subtitle={`${projects.length} total projects`} onClick={() => setDrilldownMetric('activeProjects')} />
        )}
        {visibleMetrics.activeSales && (
          <StatCard title="Active Pre-Con Sales" value={metrics.activeSalesCount} icon={Briefcase}
            subtitle="In pipeline" onClick={() => setDrilldownMetric('activeSales')} />
        )}
        {visibleMetrics.activeLeads && (
          <StatCard title="Active Leads" value={metrics.activeLeadsCount} icon={Target}
            subtitle={`${leads.length} total leads`} onClick={() => setDrilldownMetric('activeLeads')} />
        )}
        {visibleMetrics.grossProfit && (
          <StatCard title="Total Gross Profit" value={`$${(metrics.totalGrossProfit / 1000).toFixed(0)}K`} icon={DollarSign}
            subtitle={`${metrics.closedProjects.length} closed projects`} onClick={() => setDrilldownMetric('grossProfit')} />
        )}
        {visibleMetrics.margins && (
          <StatCard title="Gross Margin %" value={`${metrics.marginPercent.toFixed(1)}%`} icon={TrendingUp}
            subtitle="Weighted average" trend={metrics.marginPercent > 20 ? 'Healthy' : 'Below target'}
            trendDirection={metrics.marginPercent > 20 ? 'up' : 'down'} onClick={() => setDrilldownMetric('margins')} />
        )}
        {visibleMetrics.conversionRate && (
          <StatCard title="Lead Conversion Rate" value={`${metrics.conversionRate.toFixed(1)}%`} icon={Target}
            subtitle={`${metrics.convertedLeads}/${metrics.totalLeadsForConversion} converted`} onClick={() => setDrilldownMetric('conversionRate')} />
        )}
        {visibleMetrics.winRate && (
          <StatCard title="Win Rate (After Proposal)" value={`${metrics.winRate.toFixed(1)}%`} icon={CheckCircle2}
            subtitle={`${metrics.convertedAfterProposal}/${metrics.proposalLeads.length} won`} onClick={() => setDrilldownMetric('winRate')} />
        )}
      </div>

      {/* Build Capacity Forecast */}
      <BuildCapacityForecast
        capacityForecast={capacityForecast}
        currentFiscalGoal={currentFiscalGoal}
        fiscalYear={fiscalYear}
        fiscalYearStartMonth={fiscalYearStartMonth}
        settings={settings}
      />

      {/* Fiscal Goal Progress */}
      <FiscalGoalProgress
        currentFiscalGoal={currentFiscalGoal}
        totalRevenue={metrics.totalRevenue}
        marginPercent={metrics.marginPercent}
        filteredProjectsCount={filteredProjects.length}
        fiscalYear={fiscalYear}
        fiscalYearStartMonth={fiscalYearStartMonth}
      />

      {/* Revenue Trend Chart */}
      <RevenueTrendChart monthlyTrendData={monthlyTrendData} />

      {/* Metric Drilldown Dialog */}
      <MetricDrilldownDialog
        open={!!drilldownMetric}
        onOpenChange={(open) => !open && setDrilldownMetric(null)}
        metricKey={drilldownMetric}
        sales={sales}
        projects={projects}
        leads={leads}
        clients={clients}
        dateRange={dateRange}
        getSaleEffectiveDate={getSaleEffectiveDate}
        getProjectEffectiveDate={getProjectEffectiveDate}
      />

      {/* Customize Dialog */}
      <CustomizeMetricsDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        visibleMetrics={visibleMetrics}
        setVisibleMetrics={setVisibleMetrics}
      />
    </div>
  );
}