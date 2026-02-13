import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle2, Clock, Flag, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DataInspector from '../components/common/DataInspector';

const priorityColors = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const statusColors = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-slate-100 text-slate-700',
};

export default function DataQuality() {
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterEntity, setFilterEntity] = useState('all');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorEntity, setInspectorEntity] = useState(null);
  const [resolveId, setResolveId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try { setUser(await base44.auth.me()); } catch {}
    };
    loadUser();
  }, []);

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['dataFlags'],
    queryFn: () => base44.entities.DataFlag.list('-created_date'),
  });

  // Fetch entity data for inspector
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list(), initialData: [] });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list(), initialData: [] });
  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: () => base44.entities.Lead.list(), initialData: [] });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list(), initialData: [] });
  const { data: commissions = [] } = useQuery({ queryKey: ['commissionTransactions'], queryFn: () => base44.entities.CommissionTransaction.list(), initialData: [] });

  const updateFlagMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DataFlag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dataFlags']);
      setResolveId(null);
      setResolutionNotes('');
      toast.success('Flag updated');
    }
  });

  const getEntityData = (entityType, entityId) => {
    const lookups = { Project: projects, Sale: sales, Lead: leads, Client: clients, CommissionTransaction: commissions };
    return (lookups[entityType] || []).find(e => e.id === entityId);
  };

  const getRelatedData = (entityType, entityData) => {
    if (!entityData) return [];
    const related = [];
    if (entityType === 'Project' && entityData.sale_id) {
      const sale = sales.find(s => s.id === entityData.sale_id);
      related.push({ label: 'Linked Sale', data: sale });
      if (sale?.client_id) related.push({ label: 'Client', data: clients.find(c => c.id === sale.client_id) });
    }
    if (entityType === 'Sale') {
      if (entityData.client_id) related.push({ label: 'Client', data: clients.find(c => c.id === entityData.client_id) });
      if (entityData.lead_id) related.push({ label: 'Originating Lead', data: leads.find(l => l.id === entityData.lead_id) });
    }
    if (entityType === 'Lead' && entityData.client_id) {
      related.push({ label: 'Client', data: clients.find(c => c.id === entityData.client_id) });
    }
    if (entityType === 'CommissionTransaction' && entityData.sale_id) {
      related.push({ label: 'Sale', data: sales.find(s => s.id === entityData.sale_id) });
    }
    return related;
  };

  const openInspector = (flag) => {
    const data = getEntityData(flag.entity_type, flag.entity_id);
    setInspectorEntity({ type: flag.entity_type, id: flag.entity_id, data, related: getRelatedData(flag.entity_type, data) });
    setInspectorOpen(true);
  };

  const filteredFlags = flags.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterEntity !== 'all' && f.entity_type !== filterEntity) return false;
    return true;
  });

  const openCount = flags.filter(f => f.status === 'open').length;
  const inProgressCount = flags.filter(f => f.status === 'in_progress').length;
  const resolvedCount = flags.filter(f => f.status === 'resolved').length;

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Admin Access Required</h1>
        <p className="text-slate-500 mt-2">Only administrators can access the data quality dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Data Quality</h1>
        <p className="text-lg text-slate-500">Review and resolve flagged data issues across the system</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Flag className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">{openCount}</p>
              <p className="text-sm text-red-600">Open Issues</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{inProgressCount}</p>
              <p className="text-sm text-amber-600">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold text-emerald-700">{resolvedCount}</p>
              <p className="text-sm text-emerald-600">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div>
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Entity Type</p>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Project">Project</SelectItem>
                <SelectItem value="Sale">Sale</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
                <SelectItem value="CommissionTransaction">Commission</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Flags Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-slate-400">Loading...</p>
          ) : filteredFlags.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-slate-600">No issues found</p>
              <p className="text-sm text-slate-400">All clear for the selected filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Flagged By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlags.map(flag => (
                  <React.Fragment key={flag.id}>
                    <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => openInspector(flag)}>
                      <TableCell><Badge className={priorityColors[flag.priority]}>{flag.priority}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[flag.status]}>{flag.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs">{flag.entity_type}</TableCell>
                      <TableCell className="font-medium text-sm">{flag.entity_title || '—'}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{flag.issue_description}</TableCell>
                      <TableCell className="text-xs text-slate-500">{flag.flagged_by_name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{flag.created_date ? format(new Date(flag.created_date), 'MMM d') : ''}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {flag.status === 'open' && (
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => updateFlagMutation.mutate({ id: flag.id, data: { status: 'in_progress' } })}>
                              Working
                            </Button>
                          )}
                          {(flag.status === 'open' || flag.status === 'in_progress') && (
                            <Button size="sm" variant="ghost" className="text-xs text-emerald-600" onClick={() => { setResolveId(resolveId === flag.id ? null : flag.id); setResolutionNotes(''); }}>
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {resolveId === flag.id && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <div className="p-3 bg-emerald-50 rounded-lg space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="How was this resolved?" rows={2} />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateFlagMutation.mutate({ id: flag.id, data: { status: 'resolved', resolution_notes: resolutionNotes, resolved_by_user_id: user?.id, resolved_by_name: user?.full_name, resolved_date: new Date().toISOString() } })}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setResolveId(null)}>Cancel</Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inspector Modal */}
      {inspectorEntity && (
        <DataInspector
          open={inspectorOpen}
          onOpenChange={setInspectorOpen}
          entityType={inspectorEntity.type}
          entityId={inspectorEntity.id}
          entityData={inspectorEntity.data}
          relatedData={inspectorEntity.related}
        />
      )}
    </div>
  );
}