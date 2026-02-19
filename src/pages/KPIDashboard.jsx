import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Target, TrendingUp, AlertTriangle, Users, RefreshCw, Loader2, MessageSquare, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { toast } from 'sonner';

export default function KPIDashboard() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [user, setUser] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [reviewEntry, setReviewEntry] = useState(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Target className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Admin Access Required</h1>
      </div>
    );
  }

  const { data: kpis = [] } = useQuery({ queryKey: ['active-kpis'], queryFn: () => base44.entities.KPI.filter({ is_active: true }) });
  const { data: allEntries = [] } = useQuery({ queryKey: ['all-kpi-entries'], queryFn: () => base44.entities.KPIEntry.list('-reporting_period_start_date') });
  const { data: allUsers = [] } = useQuery({ queryKey: ['all-users'], queryFn: () => base44.entities.User.list() });
  const { data: relationships = [] } = useQuery({
    queryKey: ['reporting-relationships'],
    queryFn: () => base44.entities.ReportingRelationship.filter({ is_active: true })
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPIEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-kpi-entries']);
      setReviewEntry(null);
      setManagerNotes('');
      toast.success('Review saved');
    }
  });

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await base44.functions.invoke('calculateKPIAggregates', {});
      queryClient.invalidateQueries(['all-kpi-entries']);
      toast.success('KPIs recalculated');
    } catch (e) {
      toast.error('Failed to recalculate: ' + e.message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleReview = () => {
    if (!reviewEntry) return;
    reviewMutation.mutate({
      id: reviewEntry.id,
      data: { reviewed_by: user.id, reviewed_date: new Date().toISOString(), manager_notes: managerNotes }
    });
  };

  const getKPIById = (id) => kpis.find(k => k.id === id);
  const getUserName = (id) => allUsers.find(u => u.id === id)?.full_name || id;

  // Current period entries
  const currentPeriodEntries = allEntries.filter(entry => {
    const start = new Date(entry.reporting_period_start_date);
    const end = new Date(entry.reporting_period_end_date);
    const now = new Date();
    return now >= start && now <= end;
  });

  // Filter by category
  const filteredEntries = currentPeriodEntries.filter(entry => {
    if (selectedCategory === 'all') return true;
    return getKPIById(entry.kpi_id)?.category === selectedCategory;
  });

  // Flagged entries needing review
  const flaggedEntries = allEntries.filter(e => e.is_flagged && !e.reviewed_by);

  // Filter by selected user for review tab
  const userFlaggedEntries = selectedUserId
    ? flaggedEntries.filter(e => e.user_id === selectedUserId)
    : flaggedEntries;

  // Category metrics
  const categories = ['sales', 'operations', 'finance', 'precon', 'projects'];
  const categoryMetrics = categories.map(cat => {
    const catEntries = filteredEntries.filter(e => getKPIById(e.kpi_id)?.category === cat);
    const onTarget = catEntries.filter(e => e.actual_value >= (e.target_value_at_entry || 0)).length;
    const flagged = catEntries.filter(e => e.is_flagged).length;
    const avgAchievement = catEntries.length > 0
      ? catEntries.reduce((s, e) => s + (e.target_value_at_entry > 0 ? (e.actual_value / e.target_value_at_entry) * 100 : 0), 0) / catEntries.length
      : 0;
    return { category: cat, total: catEntries.length, onTarget, flagged, avgAchievement: Math.round(avgAchievement) };
  }).filter(m => m.total > 0);

  // 6-month trend
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const monthEntries = allEntries.filter(e => { const s = new Date(e.reporting_period_start_date); return s >= monthStart && s <= monthEnd; });
    const avg = monthEntries.length > 0 ? monthEntries.reduce((s, e) => s + (e.target_value_at_entry > 0 ? (e.actual_value / e.target_value_at_entry) * 100 : 0), 0) / monthEntries.length : 0;
    trendData.push({
      month: format(date, 'MMM'),
      achievement: Math.round(avg),
      onTarget: monthEntries.filter(e => e.actual_value >= (e.target_value_at_entry || 0)).length,
      flagged: monthEntries.filter(e => e.is_flagged).length
    });
  }

  // User performance ranking
  const userPerformance = allUsers.map(u => {
    const entries = currentPeriodEntries.filter(e => e.user_id === u.id);
    if (entries.length === 0) return null;
    const avg = entries.reduce((s, e) => s + (e.target_value_at_entry > 0 ? (e.actual_value / e.target_value_at_entry) * 100 : 0), 0) / entries.length;
    return { user: u, avgAchievement: Math.round(avg), totalKPIs: entries.length, onTarget: entries.filter(e => e.actual_value >= (e.target_value_at_entry || 0)).length, flagged: entries.filter(e => e.is_flagged).length };
  }).filter(Boolean).sort((a, b) => b.avgAchievement - a.avgAchievement);

  const totalAvg = currentPeriodEntries.length > 0
    ? Math.round(currentPeriodEntries.reduce((s, e) => s + (e.target_value_at_entry > 0 ? (e.actual_value / e.target_value_at_entry) * 100 : 0), 0) / currentPeriodEntries.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">KPI Dashboard</h1>
          <p className="text-slate-600 mt-1">Company performance overview and team review</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRecalculate} disabled={recalculating}>
            {recalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Recalculate
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">KPI Entries</p>
          <p className="text-2xl font-bold text-slate-900">{currentPeriodEntries.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">On Target</p>
          <p className="text-2xl font-bold text-green-600">{currentPeriodEntries.filter(e => e.actual_value >= (e.target_value_at_entry || 0)).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Flagged</p>
          <p className="text-2xl font-bold text-red-600">{currentPeriodEntries.filter(e => e.is_flagged).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Avg Achievement</p>
          <p className="text-2xl font-bold text-slate-900">{totalAvg}%</p>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="review" className="relative">
            Review
            {flaggedEntries.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{flaggedEntries.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">6-Month Achievement Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="achievement" stroke="#ea7924" strokeWidth={2} name="Avg %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">On Target vs Flagged</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
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
          </div>

          {/* Category breakdown */}
          {categoryMetrics.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categoryMetrics.map(m => (
                <Card key={m.category} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold capitalize text-slate-900">{m.category}</h3>
                    <Badge variant={m.avgAchievement >= 100 ? 'default' : m.avgAchievement >= 75 ? 'secondary' : 'destructive'}>
                      {m.avgAchievement}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div><p className="text-lg font-bold text-green-600">{m.onTarget}</p><p className="text-slate-500">On Target</p></div>
                    <div><p className="text-lg font-bold text-red-600">{m.flagged}</p><p className="text-slate-500">Flagged</p></div>
                    <div><p className="text-lg font-bold text-slate-900">{m.total}</p><p className="text-slate-500">Total</p></div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team Performance */}
        <TabsContent value="team" className="space-y-4">
          {userPerformance.length > 0 ? (
            <div className="grid gap-3">
              {userPerformance.map((perf, idx) => (
                <Card key={perf.user.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{perf.user.full_name}</p>
                      <p className="text-xs text-slate-500">{perf.totalKPIs} KPIs • {perf.onTarget} on target • {perf.flagged} flagged</p>
                    </div>
                    <Badge variant={perf.avgAchievement >= 100 ? 'default' : perf.avgAchievement >= 75 ? 'secondary' : 'destructive'} className="text-lg px-3">
                      {perf.avgAchievement}%
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No KPI data for this period yet. Click "Recalculate" to generate entries.</p>
            </Card>
          )}
        </TabsContent>

        {/* Review */}
        <TabsContent value="review" className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Select value={selectedUserId || 'all'} onValueChange={(v) => setSelectedUserId(v === 'all' ? null : v)}>
              <SelectTrigger className="w-60"><SelectValue placeholder="Filter by user" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-500">{userFlaggedEntries.length} flagged entries need review</p>
          </div>

          {userFlaggedEntries.length > 0 ? (
            <div className="grid gap-3">
              {userFlaggedEntries.map(entry => {
                const kpi = getKPIById(entry.kpi_id);
                if (!kpi) return null;
                const achievement = entry.target_value_at_entry > 0 ? Math.round((entry.actual_value / entry.target_value_at_entry) * 100) : 0;

                return (
                  <Card key={entry.id} className="border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <CardTitle className="text-base">{kpi.name}</CardTitle>
                            <Badge variant="outline" className="text-[10px]">{kpi.category}</Badge>
                            <Badge variant="destructive" className="text-[10px]">Flagged</Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {getUserName(entry.user_id)} • {format(new Date(entry.reporting_period_start_date), 'MMM d')} – {format(new Date(entry.reporting_period_end_date), 'MMM d, yyyy')}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span>Actual: <strong className="text-red-600">{entry.actual_value}</strong></span>
                            <span>Target: <strong>{entry.target_value_at_entry}</strong></span>
                            <span>Achievement: <strong className="text-red-600">{achievement}%</strong></span>
                          </div>
                          {entry.explanation_provided && (
                            <div className="mt-2 p-2 bg-white rounded border text-xs">
                              <span className="font-medium text-slate-700">Employee:</span> {entry.explanation_provided}
                            </div>
                          )}
                        </div>
                        <Button size="sm" onClick={() => { setReviewEntry(entry); setManagerNotes(''); }}>
                          <MessageSquare className="w-4 h-4 mr-1" /> Review
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-slate-500">No flagged entries need review</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewEntry} onOpenChange={() => setReviewEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review KPI Entry</DialogTitle>
            <DialogDescription>Provide feedback for {reviewEntry ? getUserName(reviewEntry.user_id) : ''}</DialogDescription>
          </DialogHeader>
          {reviewEntry && (
            <div className="space-y-4">
              {reviewEntry.explanation_provided && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900 mb-1">Employee's Explanation:</p>
                  <p className="text-sm text-slate-600">{reviewEntry.explanation_provided}</p>
                </div>
              )}
              <div>
                <Label>Your Feedback</Label>
                <Textarea value={managerNotes} onChange={(e) => setManagerNotes(e.target.value)} placeholder="Provide constructive feedback..." rows={4} className="mt-2" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReviewEntry(null)}>Cancel</Button>
                <Button onClick={handleReview} disabled={!managerNotes.trim()}>Submit Review</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}