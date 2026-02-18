import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';

export default function KPIDashboard() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Target className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Admin Access Required</h1>
        <p className="text-slate-500 mt-2">Only administrators can access the KPI Dashboard.</p>
      </div>
    );
  }

  const { data: kpis = [] } = useQuery({
    queryKey: ['active-kpis'],
    queryFn: () => base44.entities.KPI.filter({ is_active: true })
  });

  const { data: allEntries = [] } = useQuery({
    queryKey: ['all-kpi-entries'],
    queryFn: () => base44.entities.KPIEntry.list('-reporting_period_start_date')
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list()
  });

  const getKPIById = (id) => kpis.find(k => k.id === id);

  // Filter entries based on selected period
  const currentPeriodEntries = allEntries.filter(entry => {
    const start = new Date(entry.reporting_period_start_date);
    const end = new Date(entry.reporting_period_end_date);
    const now = new Date();
    return now >= start && now <= end;
  });

  const displayEntries = selectedPeriod === 'current' ? currentPeriodEntries : allEntries;

  // Filter by category
  const filteredEntries = displayEntries.filter(entry => {
    if (selectedCategory === 'all') return true;
    const kpi = getKPIById(entry.kpi_id);
    return kpi?.category === selectedCategory;
  });

  // Calculate metrics by category
  const categories = ['sales', 'operations', 'finance', 'precon', 'projects'];
  const categoryMetrics = categories.map(cat => {
    const catEntries = currentPeriodEntries.filter(entry => {
      const kpi = getKPIById(entry.kpi_id);
      return kpi?.category === cat;
    });

    const onTarget = catEntries.filter(e => e.actual_value >= e.target_value_at_entry).length;
    const flagged = catEntries.filter(e => e.is_flagged).length;
    const avgAchievement = catEntries.length > 0
      ? catEntries.reduce((sum, e) => {
          const achievement = e.target_value_at_entry > 0 
            ? (e.actual_value / e.target_value_at_entry) * 100 
            : 0;
          return sum + achievement;
        }, 0) / catEntries.length
      : 0;

    return {
      category: cat,
      total: catEntries.length,
      onTarget,
      flagged,
      avgAchievement: Math.round(avgAchievement)
    };
  });

  // Calculate trend data (last 6 months)
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthEntries = allEntries.filter(entry => {
      const start = new Date(entry.reporting_period_start_date);
      return start >= monthStart && start <= monthEnd;
    });

    const avgAchievement = monthEntries.length > 0
      ? monthEntries.reduce((sum, e) => {
          const achievement = e.target_value_at_entry > 0 
            ? (e.actual_value / e.target_value_at_entry) * 100 
            : 0;
          return sum + achievement;
        }, 0) / monthEntries.length
      : 0;

    trendData.push({
      month: format(date, 'MMM'),
      achievement: Math.round(avgAchievement),
      onTarget: monthEntries.filter(e => e.actual_value >= e.target_value_at_entry).length,
      flagged: monthEntries.filter(e => e.is_flagged).length
    });
  }

  // Top performers
  const userPerformance = allUsers.map(user => {
    const userEntries = currentPeriodEntries.filter(e => e.user_id === user.id);
    if (userEntries.length === 0) return null;

    const avgAchievement = userEntries.reduce((sum, e) => {
      const achievement = e.target_value_at_entry > 0 
        ? (e.actual_value / e.target_value_at_entry) * 100 
        : 0;
      return sum + achievement;
    }, 0) / userEntries.length;

    return {
      user,
      avgAchievement: Math.round(avgAchievement),
      totalKPIs: userEntries.length,
      onTarget: userEntries.filter(e => e.actual_value >= e.target_value_at_entry).length
    };
  }).filter(Boolean).sort((a, b) => b.avgAchievement - a.avgAchievement);

  const topPerformers = userPerformance.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">KPI Dashboard</h1>
          <p className="text-slate-600 mt-1">Company-wide performance overview</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="precon">Precon</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total KPIs</p>
                <p className="text-2xl font-bold text-slate-900">{currentPeriodEntries.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">On Target</p>
                <p className="text-2xl font-bold text-green-600">
                  {currentPeriodEntries.filter(e => e.actual_value >= e.target_value_at_entry).length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Flagged</p>
                <p className="text-2xl font-bold text-red-600">
                  {currentPeriodEntries.filter(e => e.is_flagged).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg Achievement</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round(
                    currentPeriodEntries.reduce((sum, e) => {
                      const achievement = e.target_value_at_entry > 0 
                        ? (e.actual_value / e.target_value_at_entry) * 100 
                        : 0;
                      return sum + achievement;
                    }, 0) / currentPeriodEntries.length || 0
                  )}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="performers">Top Performers</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>6-Month Performance Trend</CardTitle>
              <CardDescription>Average achievement percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="achievement" stroke="#f59e0b" name="Avg Achievement %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KPI Status Trend</CardTitle>
              <CardDescription>On target vs flagged over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTarget" fill="#22c55e" name="On Target" />
                  <Bar dataKey="flagged" fill="#ef4444" name="Flagged" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4">
            {categoryMetrics.map((metric) => (
              <Card key={metric.category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">{metric.category}</CardTitle>
                      <CardDescription>{metric.total} KPIs tracked</CardDescription>
                    </div>
                    <Badge 
                      variant={metric.avgAchievement >= 100 ? 'default' : metric.avgAchievement >= 75 ? 'secondary' : 'destructive'}
                      className="text-lg px-3 py-1"
                    >
                      {metric.avgAchievement}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{metric.onTarget}</p>
                      <p className="text-sm text-slate-500">On Target</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{metric.flagged}</p>
                      <p className="text-sm text-slate-500">Flagged</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{metric.total - metric.onTarget - metric.flagged}</p>
                      <p className="text-sm text-slate-500">In Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Top Performers Tab */}
        <TabsContent value="performers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Performers</CardTitle>
              <CardDescription>Based on current period average achievement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((perf, index) => (
                  <div key={perf.user.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{perf.user.full_name}</p>
                      <p className="text-sm text-slate-500">{perf.totalKPIs} KPIs • {perf.onTarget} on target</p>
                    </div>
                    <Badge 
                      variant={perf.avgAchievement >= 100 ? 'default' : 'secondary'}
                      className="text-lg px-3 py-1"
                    >
                      {perf.avgAchievement}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}