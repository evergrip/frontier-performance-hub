import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DollarSign, Target, Briefcase, Building2, TrendingUp, BarChart3, PieChart, LineChart, Sparkles, RefreshCw } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart as RechartsLine, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [timePeriod, setTimePeriod] = useState('ytd');
  const [dashboardLayout, setDashboardLayout] = useState('default');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // AI-optimize layout based on role
      if (currentUser?.role === 'admin') {
        setDashboardLayout('admin');
      } else {
        setDashboardLayout('salesperson');
      }
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

  // Fetch KPIs
  const { data: kpiData, refetch: refetchKPIs } = useQuery({
    queryKey: ['kpis', timePeriod, user?.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('calculateKPIAggregates', {
        time_period: timePeriod,
        user_id: dashboardLayout === 'salesperson' ? user?.id : null
      });
      return response.data;
    },
    enabled: !!user,
  });

  // Fetch forecast data
  const { data: forecastData } = useQuery({
    queryKey: ['forecast', user?.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateForecastData', {
        forecast_months: 6,
        user_id: dashboardLayout === 'salesperson' ? user?.id : null
      });
      return response.data;
    },
    enabled: !!user,
  });

  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];

  // Pipeline data for charts
  const pipelineData = [
    { name: 'Prospect', value: sales.filter(s => s.status === 'prospect').length },
    { name: 'Proposal', value: sales.filter(s => s.status === 'proposal_sent').length },
    { name: 'Negotiation', value: sales.filter(s => s.status === 'negotiation').length },
    { name: 'Closed Won', value: sales.filter(s => s.status === 'closed_won').length },
  ];

  // Lead status data
  const leadStatusData = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length },
    { name: 'Qualified', value: leads.filter(l => l.status === 'qualified').length },
    { name: 'Converted', value: leads.filter(l => l.status === 'converted').length },
  ];

  // Monthly trend (last 6 months)
  const monthlyTrend = forecastData?.monthly_forecasts?.slice(0, 6).map(f => ({
    month: f.month,
    revenue: f.forecasted_revenue / 1000,
    margin: f.forecasted_margin / 1000
  })) || [];

  // Goal progress (example - would come from user settings)
  const salesGoal = 1000000;
  const currentSales = kpiData?.kpis?.sales?.total_contract_value || 0;
  const goalProgress = Math.min((currentSales / salesGoal) * 100, 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with AI Badge */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
            <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI-Optimized
            </span>
          </h1>
          <p className="text-lg text-slate-500">
            {dashboardLayout === 'admin' ? 'Company-wide performance overview' : 'Your personalized performance dashboard'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mtd">This Month</SelectItem>
              <SelectItem value="qtd">This Quarter</SelectItem>
              <SelectItem value="ytd">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetchKPIs()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Revenue"
          value={`$${((kpiData?.kpis?.sales?.total_contract_value || 0) / 1000).toFixed(0)}K`}
          icon={DollarSign}
          trend={`${kpiData?.kpis?.sales?.win_rate || 0}% win rate`}
          trendDirection="up"
          subtitle={`${kpiData?.kpis?.sales?.closed_won || 0} closed won`}
        />
        <StatCard
          title="Active Leads"
          value={kpiData?.kpis?.leads?.total_leads || 0}
          icon={Target}
          trend={`${kpiData?.kpis?.leads?.conversion_rate || 0}% conversion`}
          trendDirection="up"
          subtitle={`${kpiData?.kpis?.leads?.qualified_leads || 0} qualified`}
        />
        <StatCard
          title="Pipeline"
          value={`$${((kpiData?.kpis?.pipeline?.pipeline_value || 0) / 1000).toFixed(0)}K`}
          icon={Briefcase}
          subtitle={`${sales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status)).length} active deals`}
        />
        <StatCard
          title="Projects"
          value={kpiData?.kpis?.projects?.active_projects || 0}
          icon={Building2}
          trend={`${kpiData?.kpis?.projects?.avg_margin_percentage || 0}% margin`}
          trendDirection="up"
          subtitle={`$${((kpiData?.kpis?.projects?.total_margin || 0) / 1000).toFixed(0)}K total`}
        />
      </div>

      {/* Goal Progress */}
      {dashboardLayout === 'salesperson' && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              Sales Goal Progress
            </CardTitle>
            <CardDescription>Your year-to-date target</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">${(currentSales / 1000).toFixed(0)}K / ${(salesGoal / 1000).toFixed(0)}K</span>
                <span className="text-amber-600 font-bold">{goalProgress.toFixed(1)}%</span>
              </div>
              <Progress value={goalProgress} className="h-3" />
              <p className="text-xs text-slate-500">
                ${((salesGoal - currentSales) / 1000).toFixed(0)}K remaining to goal
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pipeline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="leads">
            <PieChart className="w-4 h-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="forecast">
            <LineChart className="w-4 h-4 mr-2" />
            Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Pipeline Overview</CardTitle>
              <CardDescription>Current opportunities by stage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Distribution</CardTitle>
              <CardDescription>Breakdown by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leadStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>6-Month Revenue Forecast</CardTitle>
              <CardDescription>
                Projected revenue and margin • {forecastData?.assumptions?.historical_win_rate} win rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLine data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} name="Revenue ($K)" />
                  <Line type="monotone" dataKey="margin" stroke="#10B981" strokeWidth={2} name="Margin ($K)" />
                </RechartsLine>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Recent Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leads.slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {leads.slice(0, 5).map(lead => (
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
                      {lead.lead_score || 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No leads yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" />
              Active Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status)).slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {sales.filter(s => ['prospect', 'proposal_sent', 'negotiation'].includes(s.status)).slice(0, 5).map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{sale.title}</p>
                      <p className="text-sm text-slate-500">
                        ${(sale.contract_value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'negotiation' ? 'bg-amber-100 text-amber-700' :
                      sale.status === 'proposal_sent' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {sale.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No active opportunities</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}