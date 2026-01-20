import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Target, Briefcase, Building2, TrendingUp } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
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

  // Calculate metrics
  const totalRevenue = sales
    .filter(s => s.status === 'closed_won')
    .reduce((sum, s) => sum + (s.contract_value || 0), 0);

  const activeLeads = leads.filter(l => 
    ['new', 'contacted', 'qualified'].includes(l.status)
  ).length;

  const activeSales = sales.filter(s => 
    ['prospect', 'proposal_sent', 'negotiation'].includes(s.status)
  ).length;

  const activeProjects = projects.filter(p => 
    ['planning', 'design', 'permitting', 'execution'].includes(p.status)
  ).length;

  const conversionRate = leads.length > 0 
    ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1)
    : 0;

  // Recent activity
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-lg text-slate-500">Here's your performance overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(0)}K`}
          icon={DollarSign}
          trend="+12.5%"
          trendDirection="up"
          subtitle="Closed Won Sales"
        />
        <StatCard
          title="Active Leads"
          value={activeLeads}
          icon={Target}
          trend={`${conversionRate}% conversion`}
          trendDirection="up"
          subtitle="In Pipeline"
        />
        <StatCard
          title="Active Sales"
          value={activeSales}
          icon={Briefcase}
          subtitle="In Progress"
        />
        <StatCard
          title="Active Projects"
          value={activeProjects}
          icon={Building2}
          subtitle="Under Construction"
        />
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Recent Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{lead.title}</p>
                      <p className="text-sm text-slate-500 capitalize">{lead.status.replace('_', ' ')}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'qualified' ? 'bg-emerald-100 text-emerald-700' :
                      lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {lead.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No leads yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{sale.title}</p>
                      <p className="text-sm text-slate-500">
                        ${(sale.contract_value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'closed_won' ? 'bg-emerald-100 text-emerald-700' :
                      sale.status === 'negotiation' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {sale.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No sales yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}