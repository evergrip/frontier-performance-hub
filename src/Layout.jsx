import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, Users, Target, Briefcase, Building2, 
  Settings, Menu, X, ChevronRight, LogOut, DollarSign, CalendarDays, Upload 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Clients', icon: Users, page: 'Clients' },
    { name: 'Leads', icon: Target, page: 'Leads' },
    { name: 'Pre-Construction', icon: Briefcase, page: 'Sales' },
    { name: 'Projects', icon: Building2, page: 'Projects' },
    { name: 'Scheduler', icon: CalendarDays, page: 'Scheduler' },
    { name: 'Reports', icon: Settings, page: 'Reports' },
    { name: 'My KPIs', icon: Target, page: 'MyKPIs' },
  ];

  const adminNavigation = [
    { name: 'Company Admin', icon: Settings, page: 'CompanyAdmin' },
    { name: 'Import Historical Data', icon: Upload, page: 'ImportHistoricalData' },
  ];

  const userNavigation = [
    { name: 'My Commissions', icon: DollarSign, page: 'Commissions' },
  ];

  const isActive = (pageName) => currentPageName === pageName;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <style>{`
        :root {
          --navy: #0F172A;
          --gold: #F59E0B;
          --slate-dark: #64748B;
          --slate-light: #CBD5E1;
          --slate-bg: #F1F5F9;
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Frontier</h1>
                  <p className="text-xs text-slate-500">Performance Hub</p>
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
            {navigation.map((item) => {
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
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-amber-500'}`} />
                  <span className="font-medium">{item.name}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}

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
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-amber-500'}`} />
                      <span className="font-medium">{item.name}</span>
                      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  );
                })}
              </>
            )}

            {/* Admin-only navigation */}
            {user?.role === 'admin' && (
              <>
                <div className="h-px bg-slate-200 my-4" />
                <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-amber-500'}`} />
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
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
              <Building2 className="w-6 h-6 text-amber-500" />
              <span className="font-bold text-slate-900">Frontier</span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}