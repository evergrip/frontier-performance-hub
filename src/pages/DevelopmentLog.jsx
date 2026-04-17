import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, Bug, Lightbulb, Download } from 'lucide-react';
import DevLogTable from '@/components/devlog/DevLogTable';
import DevLogFormDialog from '@/components/devlog/DevLogFormDialog';
import ReportBugFeatureDialog from '@/components/devlog/ReportBugFeatureDialog';

export default function DevelopmentLog() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['devLogs'],
    queryFn: () => base44.entities.DevelopmentLog.list('-created_date', 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DevelopmentLog.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devLogs'] }),
  });

  const filtered = logs.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase()) && !item.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const features = filtered.filter(i => i.type === 'feature_added');
  const bugs = filtered.filter(i => i.type === 'bug_repaired');
  const requests = filtered.filter(i => i.type === 'bug_feature_request');

  const exportCSV = () => {
    const headers = ['Title', 'Type', 'Status', 'Priority', 'Area', 'Reported By', 'Date', 'Description'];
    const rows = filtered.map(i => [
      i.title, i.type, i.status, i.priority, i.related_area || '',
      i.reported_by_name || '', i.resolution_date || i.created_date?.split('T')[0] || '', (i.description || '').replace(/"/g, '""')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `development-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Development Log</h1>
          <p className="text-sm text-slate-500">Track features, bug fixes, and requests</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowReport(true)}>
            <Bug className="w-4 h-4 mr-1" /> Report Bug / Request
          </Button>
          {isAdmin && (
            <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800">{logs.length}</div>
          <div className="text-xs text-slate-500">Total Entries</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-600">{logs.filter(i => i.type === 'feature_added').length}</div>
          <div className="text-xs text-slate-500">Features Added</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{logs.filter(i => i.type === 'bug_repaired').length}</div>
          <div className="text-xs text-slate-500">Bugs Repaired</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-600">{logs.filter(i => i.type === 'bug_feature_request' && !['resolved', 'verified', 'rejected'].includes(i.status)).length}</div>
          <div className="text-xs text-slate-500">Open Requests</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new_request">New Request</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all"><FileText className="w-4 h-4 mr-1" />All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="features"><Lightbulb className="w-4 h-4 mr-1" />Features ({features.length})</TabsTrigger>
          <TabsTrigger value="bugs"><Bug className="w-4 h-4 mr-1" />Bug Fixes ({bugs.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <DevLogTable items={filtered} users={users} isAdmin={isAdmin} onEdit={i => { setEditItem(i); setShowForm(true); }} onDelete={id => deleteMutation.mutate(id)} />
        </TabsContent>
        <TabsContent value="features" className="mt-4">
          <DevLogTable items={features} users={users} isAdmin={isAdmin} onEdit={i => { setEditItem(i); setShowForm(true); }} onDelete={id => deleteMutation.mutate(id)} />
        </TabsContent>
        <TabsContent value="bugs" className="mt-4">
          <DevLogTable items={bugs} users={users} isAdmin={isAdmin} onEdit={i => { setEditItem(i); setShowForm(true); }} onDelete={id => deleteMutation.mutate(id)} />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <DevLogTable items={requests} users={users} isAdmin={isAdmin} onEdit={i => { setEditItem(i); setShowForm(true); }} onDelete={id => deleteMutation.mutate(id)} />
        </TabsContent>
      </Tabs>

      <DevLogFormDialog open={showForm} onOpenChange={setShowForm} editItem={editItem} users={users} />
      <ReportBugFeatureDialog open={showReport} onOpenChange={setShowReport} user={user} />
    </div>
  );
}