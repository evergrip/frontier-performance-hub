import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { hasPermission } from '@/lib/permissions';
import { useQuery } from '@tanstack/react-query';
import { 
LayoutDashboard, Users, Target, Briefcase, Building2, 
Settings, Menu, X, ChevronRight, LogOut, DollarSign, CalendarDays, Upload, Flag, Wrench, MessageSquare, Megaphone, ClipboardList, Wallet, Bell, PieChart, FileText, FolderOpen, Map, Bug, ListChecks 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import FloatingReportButton from '@/components/devlog/FloatingReportButton';

const PUBLIC_PAGES = ['SurveyPublic'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Use react-query for CompanySettings — shared cache with Dashboard
  const { data: settingsList = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    staleTime: 5 * 60 * 1000,
  });

  const settings = settingsList[0] || {};
  const schedulerEnabled = !!settings.scheduler_enabled;
  const branding = {
    company_name: settings.company_name || 'Frontier Building Group',
    logo_url: settings.logo_url || '',
    primary_color: settings.primary_color || '#ea7924',
    accent_color: settings.accent_color || '#d66a1f',
  };

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
        } else if (!PUBLIC_PAGES.includes(currentPageName)) {
          base44.auth.redirectToLogin();
          return;
        }
      } catch (error) {
        if (!PUBLIC_PAGES.includes(currentPageName)) {
          base44.auth.redirectToLogin();
          return;
        }
      }
      setAuthChecked(true);
    };
    init();
  }, [currentPageName]);

  const navigationSections = [
    {
      label: null,
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
      ]
    },
    {
      label: 'Pipeline',
      items: [
        { name: '1. Clients', icon: Users, page: 'Clients', permission: 'pipeline_clients' },
        { name: '2. Leads', icon: Target, page: 'Leads', permission: 'pipeline_leads' },
        { name: '3. Pre-Construction', icon: Briefcase, page: 'Sales', permission: 'pipeline_precon' },
        { name: '4. Projects', icon: Building2, page: 'Projects', permission: 'pipeline_projects' },
      ]
    },
    {
      label: 'Operations',
      permission: 'operations',
      items: [
        ...(schedulerEnabled ? [{ name: 'Scheduler', icon: CalendarDays, page: 'Scheduler' }] : []),
        { name: 'Budgets', icon: Wallet, page: 'Budgets' },
        { name: 'Meetings', icon: MessageSquare, page: 'Meetings' },
      ]
    },
    {
      label: 'Insights',
      permission: 'insights',
      items: [
        { name: 'Reports', icon: Settings, page: 'Reports' },
        { name: 'My Performance', icon: Target, page: 'MyKPIs' },
      ]
    },
    {
      label: 'Company',
      permission: 'company',
      items: [
        { name: 'Resources', icon: FolderOpen, page: 'CompanyResources' },
        { name: 'Marketing', icon: Megaphone, page: 'MarketingCampaigns' },
        { name: 'Surveys', icon: ClipboardList, page: 'Surveys' },
      ]
    },
    {
      label: 'Processes',
      permission: 'process_maps',
      items: [
        { name: 'Process Maps', icon: Map, page: 'ProcessMaps' },
      ]
    },
    {
      label: 'Development',
      items: [
        { name: 'Dev Log', icon: Bug, page: 'DevelopmentLog' },
      ]
    },
  ];

  const isManager = user?.is_department_manager && user?.managed_departments?.length > 0;

  const managerNavigation = [
    { name: 'KPI Definitions', icon: Target, page: 'KPIDefinitions' },
  ];

  const adminNavigation = [
    ...(hasPermission(user, 'company_admin') ? [
      { name: 'Company Admin', icon: Settings, page: 'CompanyAdmin' },
      { name: 'Data Quality', icon: Flag, page: 'DataQuality' },
      { name: 'Import Historical Data', icon: Upload, page: 'ImportHistoricalData' },
      ...(schedulerEnabled ? [{ name: 'Subtrades', icon: Wrench, page: 'Subtrades' }] : []),
      { name: 'KPI Definitions', icon: Target, page: 'KPIDefinitions' },
    ] : []),
    ...(hasPermission(user, 'insights') ? [
      { name: 'KPI Dashboard', icon: LayoutDashboard, page: 'KPIDashboard' },
    ] : []),
    ...(hasPermission(user, 'varcomp_admin') ? [
      { name: 'Var Comp Admin', icon: PieChart, page: 'VarCompAdmin' },
    ] : []),
    ...(hasPermission(user, 'commissions_admin') ? [
    { name: 'Commission Rules', icon: DollarSign, page: 'CommissionRules' },
    ] : []),
    ...(hasPermission(user, 'company_admin') || hasPermission(user, 'precon_process') ? [
    { name: 'Precon Stages', icon: ListChecks, page: 'PreconStagesAdmin' },
    ] : []),
  ];

  const userNavigation = [
    { name: 'My Commissions', icon: DollarSign, page: 'Commissions' },
    { name: 'My Alerts', icon: Bell, page: 'MyAlerts' },
    { name: 'My Profit Share', icon: PieChart, page: 'MyProfitShare' },
  ];

  const isActive = (pageName) => currentPageName === pageName;

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea7924]"></div></div>;
  }

  // Public pages: render without sidebar/layout
  if (PUBLIC_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <style>{`
        :root {
          --navy: #333645;
          --orange: ${branding.primary_color};
          --slate-dark: #333333;
          --slate-light: #CBD5E1;
          --slate-bg: #F1F5F9;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap');
        
        body {
          font-family: 'Work Sans', Helvetica, Arial, Lucida, sans-serif;
        }
      `}</style>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-out z-50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})`, boxShadow: `0 4px 14px ${branding.primary_color}33` }}>
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#333645]">{branding.company_name}</h1>
                  <p className="text-xs text-[#333333]">Performance Hub</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationSections.filter(section => {
                if (!section.permission) {
                  // If section has no top-level permission, check if at least one item is accessible
                  if (section.items?.some(i => i.permission)) {
                    return section.items.some(i => hasPermission(user, i.permission));
                  }
                  return true;
                }
                return hasPermission(user, section.permission);
              }).map((section, sIdx) => (
              <div key={sIdx}>
                {section.label && (
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-3">
                    {section.label}
                  </p>
                )}
                {section.items.filter(item => !item.permission || hasPermission(user, item.permission)).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200 group
                        ${active 
                          ? 'text-white shadow-lg' 
                          : 'text-[#333333] hover:bg-slate-50 hover:text-[#333645]'
                        }
                      `}
                      style={active ? { background: `linear-gradient(to right, ${branding.primary_color}, ${branding.accent_color})`, boxShadow: `0 4px 14px ${branding.primary_color}33` } : {}}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span className="font-medium">{item.name}</span>
                      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* User-specific navigation */}
            {user && (
              <>
                <div className="h-px bg-slate-200 my-4" />
                {userNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200 group
                        ${active 
                          ? 'text-white shadow-lg' 
                          : 'text-[#333333] hover:bg-slate-50 hover:text-[#333645]'
                        }
                      `}
                      style={active ? { background: `linear-gradient(to right, ${branding.primary_color}, ${branding.accent_color})`, boxShadow: `0 4px 14px ${branding.primary_color}33` } : {}}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span className="font-medium">{item.name}</span>
                      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  );
                })}
              </>
            )}

            {/* Manager navigation (non-admin managers) */}
            {user?.role !== 'admin' && isManager && (
              <>
                <div className="h-px bg-slate-200 my-4" />
                <p className="px-4 py-2 text-xs font-semibold text-[#333333] uppercase tracking-wider">
                  Manager
                </p>
                {managerNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200 group
                        ${active 
                          ? 'text-white shadow-lg' 
                          : 'text-[#333333] hover:bg-slate-50 hover:text-[#333645]'
                        }
                      `}
                      style={active ? { background: `linear-gradient(to right, ${branding.primary_color}, ${branding.accent_color})`, boxShadow: `0 4px 14px ${branding.primary_color}33` } : {}}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span className="font-medium">{item.name}</span>
                      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  );
                })}
              </>
            )}

            {/* Admin & permission-based navigation */}
            {user && adminNavigation.length > 0 && (
              <>
                <div className="h-px bg-slate-200 my-4" />
                <p className="px-4 py-2 text-xs font-semibold text-[#333333] uppercase tracking-wider">
                  Admin
                </p>
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200 group
                        ${active 
                          ? 'text-white shadow-lg' 
                          : 'text-[#333333] hover:bg-slate-50 hover:text-[#333645]'
                        }
                      `}
                      style={active ? { background: `linear-gradient(to right, ${branding.primary_color}, ${branding.accent_color})`, boxShadow: `0 4px 14px ${branding.primary_color}33` } : {}}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span className="font-medium">{item.name}</span>
                      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User section */}
          {user && (
            <div className="p-4 border-t border-slate-200">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#333645] to-[#2a2d3a] flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#333645] truncate">{user.full_name}</p>
                  <p className="text-xs text-[#333333] truncate">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-slate-600"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
              ) : (
                <Building2 className="w-6 h-6" style={{ color: branding.primary_color }} />
              )}
              <span className="font-bold text-[#333645]">{branding.company_name?.split(' ')[0] || 'Frontier'}</span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen p-6 lg:p-8">
          {children}
        </main>
      </div>

      <FloatingReportButton />
    </div>
  );
}