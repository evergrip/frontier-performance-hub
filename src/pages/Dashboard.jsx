import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import MyMeetingsDashboard from '../components/dashboard/MyMeetingsDashboard';
import GettingStartedChecklist from '../components/dashboard/GettingStartedChecklist';
import MeetingReminderPopup from '../components/meetings/MeetingReminderPopup';
import CEOGrossMarginDialog from '../components/dashboard/CEOGrossMarginDialog';

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
  const [ceoGMDialogOpen, setCeoGMDialogOpen] = useState(false);

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
    winRate: true,
    avgProjectSize: true,
    medianProjectSize: true
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
    staleTime: 5 * 60 * 1000,
  });

  const { data: fiscalGoals = [] } = useQuery({
    queryKey: ['fiscalGoals'],
    queryFn: () => base44.entities.FiscalGoal.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allMeetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date'),
    staleTime: 60 * 1000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listUsersBasic');
      return response.data?.users || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter meetings for privacy
  const visibleMeetings = allMeetings.filter(m => {
    if (!m.is_private) return true;
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (m.organizer_id === user.id) return true;
    if ((m.attendees || []).includes(user.id)) return true;
    if ((m.visible_to_user_ids || []).includes(user.id)) return true;
    return false;
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: gmReports = [] } = useQuery({
    queryKey: ['gross-margin-reports'],
    queryFn: () => base44.entities.GrossMarginReport.list('-reporting_date'),
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();
  const isLoading = settingsLoading || leadsLoading || salesLoading || projectsLoading;

  const handleUpdateActionItem = async (meetingId, actionIndex, markComplete, alreadySaved = false) => {
    if (!alreadySaved) {
      const meeting = allMeetings.find(m => m.id === meetingId);
      if (!meeting) return;
      const items = [...(meeting.action_items || [])];
      items[actionIndex] = {
        ...items[actionIndex],
        is_completed: markComplete,
        completed_date: markComplete ? new Date().toISOString().split('T')[0] : null,
      };
      await base44.entities.Meeting.update(meetingId, { action_items: items });
    }
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
  };

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

  // For non-admin users, scope data to their own records
  const isAdmin = user?.role === 'admin';

  const isUserSale = (sale) => {
    if (!user) return false;
    if (sale.assigned_to === user.id) return true;
    if ((sale.sale_contributors || []).some(c => c.user_id === user.id)) return true;
    return false;
  };

  const isUserProject = (project) => {
    if (!user) return false;
    if (project.project_manager_id === user.id) return true;
    // Check if user was on the originating sale
    const originatingSale = sales.find(s => s.id === project.sale_id);
    if (originatingSale && isUserSale(originatingSale)) return true;
    return false;
  };

  const isUserLead = (lead) => {
    if (!user) return false;
    return lead.assigned_to === user.id;
  };

  const scopedSales = useMemo(() => isAdmin ? sales : sales.filter(isUserSale), [sales, user, isAdmin]);
  const scopedProjects = useMemo(() => isAdmin ? projects : projects.filter(isUserProject), [projects, sales, user, isAdmin]);
  const scopedLeads = useMemo(() => isAdmin ? leads : leads.filter(isUserLead), [leads, user, isAdmin]);

  // Memoized filtered data (date range applied on top of scoped data)
  const filteredSales = useMemo(() => scopedSales.filter(sale => {
    if (!dateRange.start || !dateRange.end) return true;
    const effectiveDate = getSaleEffectiveDate(sale);
    return effectiveDate >= dateRange.start && effectiveDate <= dateRange.end;
  }), [scopedSales, dateRange]);

  const filteredProjects = useMemo(() => scopedProjects.filter(project => {
    if (!dateRange.start || !dateRange.end) return true;
    const effectiveDate = getProjectEffectiveDate(project);
    return effectiveDate >= dateRange.start && effectiveDate <= dateRange.end;
  }), [scopedProjects, dateRange]);

  const filteredLeads = useMemo(() => scopedLeads.filter(lead => {
    if (!dateRange.start || !dateRange.end) return true;
    const leadDate = new Date(lead.created_date);
    return leadDate >= dateRange.start && leadDate <= dateRange.end;
  }), [scopedLeads, dateRange]);

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
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    const activeRecognizedRevenue = scopedProjects
      .filter(p => 
        p.project_type === 'construction' && 
        ['active_construction', 'substantial_completion_closeout'].includes(p.status) &&
        p.monthly_revenue_allocations?.length > 0
      )
      .reduce((sum, p) => {
        const revenueBase = p.contract_value || 0;
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
    
    const activeProjectsCount = scopedProjects.filter(p => !['closed', 'completion'].includes(p.status)).length;
    const activeSalesCount = scopedSales.filter(s => ['feasibility', 'design_material_selections', 'engineering_permits', 'pending_construction_sale'].includes(s.status)).length;
    const activeLeadsCount = scopedLeads.filter(l => !['converted', 'disqualified'].includes(l.status)).length;
    
    let totalProjectRevenue = 0;
    let totalGrossProfit = 0;
    closedProjects.forEach(p => {
      const revenue = p.contract_value || 0;
      const marginPct = p.actual_margin || 0;
      totalProjectRevenue += revenue;
      totalGrossProfit += revenue * (marginPct / 100);
    });
    const marginPercent = totalProjectRevenue > 0 ? (totalGrossProfit / totalProjectRevenue) * 100 : 0;

    const closedConstructionProjects = closedProjects.filter(p => p.project_type === 'construction');
    const avgProjectSize = closedConstructionProjects.length > 0
      ? closedConstructionProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0) / closedConstructionProjects.length
      : 0;

    const medianProjectSize = (() => {
      const vals = closedConstructionProjects.map(p => p.contract_value || 0).sort((a, b) => a - b);
      if (vals.length === 0) return 0;
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    })();

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
      activeRecognizedRevenue,
      avgProjectSize, medianProjectSize, closedConstructionProjects
    };
  }, [filteredSales, filteredProjects, filteredLeads, scopedProjects, scopedSales, scopedLeads, dateRange]);

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

    // Dynamic precon→construction conversion rate
    // "Converted" = closed_won precon sale that has a construction sale linked to it
    // "Not converted" = closed_won precon-only (no construction link) + closed_lost
    const closedPreconSales = scopedSales.filter(s => s.sale_type === 'preconstruction' && ['closed_won', 'closed_lost'].includes(s.status));
    const convertedToConstruction = closedPreconSales.filter(s => {
      if (s.status !== 'closed_won') return false;
      return scopedSales.some(cs => cs.linked_precon_sale_id === s.id);
    }).length;
    const totalClosedPrecon = closedPreconSales.length;
    const notConverted = totalClosedPrecon - convertedToConstruction;
    // Need 3+ closed precon sales for meaningful data; default to 50% otherwise
    const preconConversionRate = totalClosedPrecon >= 3 ? convertedToConstruction / totalClosedPrecon : 0.5;

    // Filter projects by include_in_forecast (default true)
    const forecastProjects = scopedProjects.filter(p => p.include_in_forecast !== false && p.status !== 'closed');
    const excludedProjectsCount = scopedProjects.filter(p => p.include_in_forecast === false && p.status !== 'closed').length;

    let activeInHouse = 0, activeSub = 0, activeMixed = 0;
    const activeProjectsValue = forecastProjects
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
        const remaining = contractVal - (contractVal * pastAllocPct / 100);
        const buildType = p.forecast_build_type || 'in_house';
        if (buildType === 'in_house') activeInHouse += remaining;
        else if (buildType === 'subcontractor') activeSub += remaining;
        else activeMixed += remaining;
        return sum + remaining;
      }, 0);

    // Filter precon sales
    const forecastSales = scopedSales.filter(s => s.sale_type === 'preconstruction' && s.status !== 'closed_won' && s.status !== 'closed_lost' && s.include_in_forecast !== false);
    const excludedSalesCount = scopedSales.filter(s => s.sale_type === 'preconstruction' && s.status !== 'closed_won' && s.status !== 'closed_lost' && s.include_in_forecast === false).length;

    let preconInHouseRaw = 0, preconSubRaw = 0, preconMixedRaw = 0;
    const preconPipelineValueRaw = forecastSales
      .reduce((sum, s) => {
        const val = s.estimated_construction_budget || 0;
        const buildType = s.forecast_build_type || 'in_house';
        if (buildType === 'in_house') preconInHouseRaw += val;
        else if (buildType === 'subcontractor') preconSubRaw += val;
        else preconMixedRaw += val;
        return sum + val;
      }, 0);

    // Apply conversion rate to precon pipeline
    const preconPipelineValue = preconPipelineValueRaw * preconConversionRate;
    const preconInHouse = preconInHouseRaw * preconConversionRate;
    const preconSub = preconSubRaw * preconConversionRate;
    const preconMixed = preconMixedRaw * preconConversionRate;

    const totalPipeline = activeProjectsValue + preconPipelineValue;

    // In-house load only — sub work doesn't count against crew capacity
    // Mixed = 50% in-house assumption
    const activeInHouseLoad = activeInHouse + (activeMixed * 0.5);
    const preconInHouseLoad = preconInHouse + (preconMixed * 0.5);

    // Booked in-house backlog (active projects only)
    let bookedRemaining = activeInHouseLoad;
    let bookedBacklog = 0;
    const bookedCapYR = currentYearMonthlyCapacity * monthsLeftInYear;
    if (bookedRemaining > bookedCapYR) {
      bookedBacklog += monthsLeftInYear;
      bookedRemaining -= bookedCapYR;
      bookedBacklog += nextYearMonthlyCapacity > 0 ? bookedRemaining / nextYearMonthlyCapacity : 0;
    } else {
      bookedBacklog = currentYearMonthlyCapacity > 0 ? bookedRemaining / currentYearMonthlyCapacity : 0;
    }

    // Total in-house backlog (booked + adjusted precon)
    let remainingPipeline = activeInHouseLoad + preconInHouseLoad;
    let monthsOfBacklog = 0;
    const currentYearCapacityTotal = currentYearMonthlyCapacity * monthsLeftInYear;
    if (remainingPipeline > currentYearCapacityTotal) {
      monthsOfBacklog += monthsLeftInYear;
      remainingPipeline -= currentYearCapacityTotal;
      monthsOfBacklog += nextYearMonthlyCapacity > 0 ? remainingPipeline / nextYearMonthlyCapacity : 0;
    } else {
      monthsOfBacklog = currentYearMonthlyCapacity > 0 ? remainingPipeline / currentYearMonthlyCapacity : 0;
    }

    return {
      monthlyCapacity: currentYearMonthlyCapacity, nextYearMonthlyCapacity,
      activeProjectsValue, preconPipelineValue, preconPipelineValueRaw, totalPipeline, monthsOfBacklog,
      bookedBacklog,
      preconConversionRate, convertedToConstruction, totalClosedPrecon,
      inHouseLoad: activeInHouseLoad + preconInHouseLoad,
      usingGrowthForecast: !!settings.next_year_revenue_target || !!nextYearCapacity,
      hasManualCapacity,
      activeInHouse, activeSub, activeMixed,
      preconInHouse, preconSub, preconMixed,
      excludedProjectsCount, excludedSalesCount,
    };
  }, [currentFiscalGoal, scopedProjects, scopedSales, settings, fiscalYear, fiscalYearStartMonth]);

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    return eachMonthOfInterval({ start: dateRange.start, end: dateRange.end }).map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const monthNum = month.getMonth() + 1;
      const yearNum = month.getFullYear();
      
      const monthPrecon = scopedSales.filter(s => {
        if (s.sale_type !== 'preconstruction' || s.status !== 'closed_won') return false;
        const d = getSaleEffectiveDate(s);
        return d >= mStart && d <= mEnd;
      }).reduce((sum, s) => sum + (s.contract_value || 0), 0);
      
      let monthConstruction = 0;
      const targetPeriod = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
      scopedProjects.filter(p => p.project_type === 'construction').forEach(p => {
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

      scopedProjects.filter(p => {
        if (p.project_type !== 'construction' || p.status !== 'closed') return false;
        if (p.monthly_revenue_allocations?.length > 0) return false;
        const d = getProjectEffectiveDate(p);
        return d >= mStart && d <= mEnd;
      }).forEach(p => {
        monthConstruction += p.contract_value || 0;
      });
      
      return { month: format(month, 'MMM yy'), revenue: (monthPrecon + monthConstruction) / 1000 };
    });
  }, [dateRange, scopedSales, scopedProjects]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-lg text-slate-500">Real-time snapshot of revenue, pipeline, and project performance</p>
        </div>
        <Button onClick={() => setCustomizeDialogOpen(true)} variant="outline">
          <Settings2 className="w-4 h-4 mr-2" />
          Customize
        </Button>
      </div>

      {/* Meeting Reminders */}
      {user && (
        <MeetingReminderPopup
          meetings={visibleMeetings}
          currentUser={user}
          onMarkComplete={(meeting) => {
            base44.entities.Meeting.update(meeting.id, { status: 'completed' });
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
          }}
          onStartMeeting={(meeting) => {
            base44.entities.Meeting.update(meeting.id, { status: 'in_progress', actual_start_time: new Date().toISOString() });
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
          }}
        />
      )}

      {/* Getting Started Checklist - for new companies */}
      <GettingStartedChecklist
        clientCount={clients.length}
        leadCount={leads.length}
        saleCount={sales.length}
        projectCount={projects.length}
        hasCompanySettings={!!(settings.company_name)}
        userCount={allUsers.length}
        isAdmin={user?.role === 'admin'}
      />

      {/* Meetings & Action Items - Top of Dashboard */}
      <MyMeetingsDashboard
        meetings={visibleMeetings}
        users={allUsers}
        currentUser={user}
        onUpdateActionItem={handleUpdateActionItem}
      />

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
            subtitle={`${scopedProjects.length} total projects`} onClick={() => setDrilldownMetric('activeProjects')} />
        )}
        {visibleMetrics.activeSales && (
          <StatCard title="Active Pre-Con Sales" value={metrics.activeSalesCount} icon={Briefcase}
            subtitle="In pipeline" onClick={() => setDrilldownMetric('activeSales')} />
        )}
        {visibleMetrics.activeLeads && (
          <StatCard title="Active Leads" value={metrics.activeLeadsCount} icon={Target}
            subtitle={`${scopedLeads.length} total leads`} onClick={() => setDrilldownMetric('activeLeads')} />
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
        {isAdmin && (() => {
          const activeConstruction = projects.filter(p => !['closed'].includes(p.status) && p.project_type === 'construction');
          const withProjections = activeConstruction.filter(p => {
            const latestReport = gmReports.find(r => r.project_id === p.id);
            return latestReport?.projected_gross_margin_at_completion != null;
          });
          const atRisk = withProjections.filter(p => {
            const sale = sales.find(s => s.id === p.sale_id);
            const latestReport = gmReports.find(r => r.project_id === p.id);
            if (!sale?.estimated_margin || !latestReport?.projected_gross_margin_at_completion) return false;
            return latestReport.projected_gross_margin_at_completion < sale.estimated_margin - 3;
          });
          const avgGM = withProjections.length > 0
            ? withProjections.reduce((sum, p) => {
                const r = gmReports.find(r => r.project_id === p.id);
                return sum + (r?.projected_gross_margin_at_completion || 0);
              }, 0) / withProjections.length
            : 0;
          return (
            <StatCard
              title="Projected GM at Completion"
              value={withProjections.length > 0 ? `${avgGM.toFixed(1)}%` : '—'}
              icon={TrendingUp}
              subtitle={`${withProjections.length} reported · ${atRisk.length} at risk`}
              trend={atRisk.length > 0 ? `${atRisk.length} at risk` : 'On track'}
              trendDirection={atRisk.length > 0 ? 'down' : 'up'}
              onClick={() => setCeoGMDialogOpen(true)}
            />
          );
        })()}
        {visibleMetrics.conversionRate && (
          <StatCard title="Lead Conversion Rate" value={`${metrics.conversionRate.toFixed(1)}%`} icon={Target}
            subtitle={`${metrics.convertedLeads}/${metrics.totalLeadsForConversion} converted`} onClick={() => setDrilldownMetric('conversionRate')} />
        )}
        {visibleMetrics.winRate && (
          <StatCard title="Win Rate (After Proposal)" value={`${metrics.winRate.toFixed(1)}%`} icon={CheckCircle2}
            subtitle={`${metrics.convertedAfterProposal}/${metrics.proposalLeads.length} won`} onClick={() => setDrilldownMetric('winRate')} />
        )}
        {visibleMetrics.avgProjectSize && (
          <StatCard title="Avg Project Size" value={`$${(metrics.avgProjectSize / 1000).toFixed(0)}K`} icon={Building2}
            subtitle={`${metrics.closedConstructionProjects.length} closed construction projects`} onClick={() => setDrilldownMetric('avgProjectSize')} />
        )}
        {visibleMetrics.medianProjectSize && (
          <StatCard title="Median Project Size" value={`$${(metrics.medianProjectSize / 1000).toFixed(0)}K`} icon={Building2}
            subtitle={`${metrics.closedConstructionProjects.length} closed construction projects`} onClick={() => setDrilldownMetric('avgProjectSize')} />
        )}
      </div>

      {/* Build Capacity Forecast */}
      <BuildCapacityForecast
        capacityForecast={capacityForecast}
        currentFiscalGoal={currentFiscalGoal}
        fiscalYear={fiscalYear}
        fiscalYearStartMonth={fiscalYearStartMonth}
        settings={settings}
        projects={scopedProjects}
        preconSales={scopedSales.filter(s => s.sale_type === 'preconstruction' && s.status !== 'closed_won' && s.status !== 'closed_lost')}
        clients={clients}
        sales={scopedSales}
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
        sales={scopedSales}
        projects={scopedProjects}
        leads={scopedLeads}
        clients={clients}
        dateRange={dateRange}
        getSaleEffectiveDate={getSaleEffectiveDate}
        getProjectEffectiveDate={getProjectEffectiveDate}
      />

      {/* CEO Gross Margin Dialog */}
      <CEOGrossMarginDialog
        open={ceoGMDialogOpen}
        onOpenChange={setCeoGMDialogOpen}
        projects={projects}
        sales={sales}
        gmReports={gmReports}
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