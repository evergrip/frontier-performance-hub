import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Flag, Plus, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Field labels for human-readable display
const FIELD_LABELS = {
  contract_value: 'Contract Value',
  actual_costs: 'Actual Costs',
  actual_margin: 'Actual Margin (%)',
  estimated_margin: 'Estimated Margin (%)',
  estimated_construction_budget: 'Estimated Construction Budget',
  close_date: 'Close Date',
  start_date: 'Start Date',
  actual_completion_date: 'Completion Date',
  target_completion_date: 'Target Completion',
  status: 'Status',
  sale_type: 'Sale Type',
  project_type: 'Project Type',
  crew_assignment: 'Crew Assignment',
  title: 'Title',
  company_name: 'Company Name',
  contact_name: 'Contact Name',
  email: 'Email',
  phone: 'Phone',
  source: 'Lead Source',
  lead_score: 'Lead Score',
  assigned_to: 'Assigned To',
  project_manager_id: 'Project Manager',
  commission_rate: 'Commission Rate',
  amount: 'Amount',
  sale_amount: 'Sale Amount',
  notes: 'Notes',
};

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return JSON.stringify(value);
  if (key.includes('value') || key.includes('cost') || key.includes('budget') || key.includes('amount') || key === 'contract_value' || key === 'actual_costs') {
    const num = parseFloat(value);
    if (!isNaN(num)) return `$${num.toLocaleString()}`;
  }
  if (key.includes('margin') || key.includes('rate') || key.includes('percentage')) {
    const num = parseFloat(value);
    if (!isNaN(num)) return `${num.toFixed(2)}%`;
  }
  if (key.includes('date') && typeof value === 'string' && value.match(/^\d{4}-\d{2}/)) {
    try { return format(new Date(value), 'MMM d, yyyy'); } catch { return value; }
  }
  return String(value);
}

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

export default function DataInspector({ open, onOpenChange, entityType, entityId, entityData, relatedData }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagForm, setFlagForm] = useState({ field_name: '', priority: 'medium', issue_description: '' });
  const [resolveId, setResolveId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        setIsAdmin(u?.role === 'admin');
      } catch {}
    };
    loadUser();
  }, []);

  // Fetch flags for this entity
  const { data: flags = [] } = useQuery({
    queryKey: ['dataFlags', entityType, entityId],
    queryFn: () => base44.entities.DataFlag.filter({ entity_type: entityType, entity_id: entityId }),
    enabled: !!entityId && !!entityType && open,
  });

  const createFlagMutation = useMutation({
    mutationFn: (data) => base44.entities.DataFlag.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dataFlags', entityType, entityId]);
      queryClient.invalidateQueries(['dataFlags']);
      setShowFlagForm(false);
      setFlagForm({ field_name: '', priority: 'medium', issue_description: '' });
      toast.success('Issue flagged');
    }
  });

  const updateFlagMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DataFlag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dataFlags', entityType, entityId]);
      queryClient.invalidateQueries(['dataFlags']);
      setResolveId(null);
      setResolutionNotes('');
      toast.success('Flag updated');
    }
  });

  const handleCreateFlag = () => {
    if (!flagForm.issue_description.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    createFlagMutation.mutate({
      entity_type: entityType,
      entity_id: entityId,
      entity_title: entityData?.title || entityData?.company_name || entityData?.contact_name || 'Unknown',
      field_name: flagForm.field_name,
      priority: flagForm.priority,
      issue_description: flagForm.issue_description,
      status: 'open',
      flagged_by_user_id: user?.id,
      flagged_by_name: user?.full_name || user?.email,
    });
  };

  const handleResolve = (flagId) => {
    updateFlagMutation.mutate({
      id: flagId,
      data: {
        status: 'resolved',
        resolution_notes: resolutionNotes,
        resolved_by_user_id: user?.id,
        resolved_by_name: user?.full_name || user?.email,
        resolved_date: new Date().toISOString(),
      }
    });
  };

  if (!isAdmin) return null;

  // Build displayable fields from entityData
  const displayFields = entityData ? Object.entries(entityData).filter(([key]) => 
    !['id', 'created_by', 'updated_date', 'created_date'].includes(key) &&
    !key.startsWith('_') &&
    typeof entityData[key] !== 'object'
  ) : [];

  const openFlags = flags.filter(f => f.status === 'open' || f.status === 'in_progress');
  const resolvedFlags = flags.filter(f => f.status === 'resolved' || f.status === 'dismissed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Data Inspector — {entityType}
            {openFlags.length > 0 && (
              <Badge className="bg-red-100 text-red-700 ml-2">{openFlags.length} open issue{openFlags.length !== 1 ? 's' : ''}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data">Raw Data</TabsTrigger>
            <TabsTrigger value="flags" className="relative">
              Issues
              {openFlags.length > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{openFlags.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          {/* Raw Data Tab */}
          <TabsContent value="data" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {entityData ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <div className="font-medium text-slate-500 py-1.5 px-2 bg-slate-50 rounded">ID</div>
                      <div className="py-1.5 px-2 bg-slate-50 rounded font-mono text-xs">{entityData.id}</div>
                      <div className="font-medium text-slate-500 py-1.5 px-2">Created</div>
                      <div className="py-1.5 px-2 text-xs">{entityData.created_date ? format(new Date(entityData.created_date), 'MMM d, yyyy h:mm a') : '—'}</div>
                      <div className="font-medium text-slate-500 py-1.5 px-2 bg-slate-50 rounded">Last Updated</div>
                      <div className="py-1.5 px-2 bg-slate-50 rounded text-xs">{entityData.updated_date ? format(new Date(entityData.updated_date), 'MMM d, yyyy h:mm a') : '—'}</div>
                    </div>
                    <div className="border-t my-3" />
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      {displayFields.map(([key, value]) => {
                        const flaggedField = openFlags.find(f => f.field_name === key);
                        return (
                          <React.Fragment key={key}>
                            <div className={`font-medium py-1.5 px-2 rounded flex items-center gap-1 ${flaggedField ? 'text-red-700 bg-red-50' : 'text-slate-500'}`}>
                              {FIELD_LABELS[key] || key.replace(/_/g, ' ')}
                              {flaggedField && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            </div>
                            <div className={`py-1.5 px-2 rounded ${flaggedField ? 'bg-red-50 text-red-900' : ''}`}>
                              {formatValue(key, value)}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {/* Show array/object fields separately */}
                    {entityData && Object.entries(entityData).filter(([key, val]) => 
                      typeof val === 'object' && val !== null && !['id'].includes(key) && !key.startsWith('_')
                    ).map(([key, val]) => (
                      <div key={key} className="mt-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1">{FIELD_LABELS[key] || key.replace(/_/g, ' ')}</p>
                        <pre className="text-xs bg-slate-50 rounded p-2 overflow-x-auto max-h-32">{JSON.stringify(val, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="flags" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600">{openFlags.length} open, {resolvedFlags.length} resolved</p>
              <Button size="sm" onClick={() => setShowFlagForm(!showFlagForm)}>
                {showFlagForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                {showFlagForm ? 'Cancel' : 'Flag Issue'}
              </Button>
            </div>

            {showFlagForm && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs">Field with Issue (optional)</Label>
                    <Select value={flagForm.field_name} onValueChange={(v) => setFlagForm({ ...flagForm, field_name: v })}>
                      <SelectTrigger><SelectValue placeholder="General / select field" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">General Issue</SelectItem>
                        {displayFields.map(([key]) => (
                          <SelectItem key={key} value={key}>{FIELD_LABELS[key] || key.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select value={flagForm.priority} onValueChange={(v) => setFlagForm({ ...flagForm, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Describe the issue *</Label>
                    <Textarea
                      value={flagForm.issue_description}
                      onChange={(e) => setFlagForm({ ...flagForm, issue_description: e.target.value })}
                      placeholder="What's wrong with this data?"
                      rows={3}
                    />
                  </div>
                  <Button size="sm" onClick={handleCreateFlag} disabled={createFlagMutation.isPending}>
                    <Flag className="w-4 h-4 mr-1" /> Submit Flag
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Open Issues */}
            {openFlags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Open Issues</p>
                {openFlags.map(flag => (
                  <Card key={flag.id} className="border-red-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={priorityColors[flag.priority]}>{flag.priority}</Badge>
                            <Badge className={statusColors[flag.status]}>{flag.status.replace('_', ' ')}</Badge>
                            {flag.field_name && flag.field_name.trim() && (
                              <span className="text-xs text-slate-500">Field: {FIELD_LABELS[flag.field_name] || flag.field_name}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800">{flag.issue_description}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Flagged by {flag.flagged_by_name || 'Unknown'} on {flag.created_date ? format(new Date(flag.created_date), 'MMM d, yyyy') : ''}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {flag.status === 'open' && (
                            <Button size="sm" variant="outline" onClick={() => updateFlagMutation.mutate({ id: flag.id, data: { status: 'in_progress' } })}>
                              Working
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => { setResolveId(flag.id); setResolutionNotes(''); }}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                          </Button>
                        </div>
                      </div>
                      {resolveId === flag.id && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded space-y-2">
                          <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="How was this resolved?"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleResolve(flag.id)}>Confirm Resolution</Button>
                            <Button size="sm" variant="ghost" onClick={() => setResolveId(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Resolved Issues */}
            {resolvedFlags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Resolved</p>
                {resolvedFlags.map(flag => (
                  <Card key={flag.id} className="border-slate-200 opacity-70">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={statusColors[flag.status]}>{flag.status}</Badge>
                        {flag.field_name && flag.field_name.trim() && (
                          <span className="text-xs text-slate-500">Field: {FIELD_LABELS[flag.field_name] || flag.field_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-through">{flag.issue_description}</p>
                      {flag.resolution_notes && <p className="text-xs text-emerald-700 mt-1">Resolution: {flag.resolution_notes}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        Resolved by {flag.resolved_by_name || 'Unknown'} on {flag.resolved_date ? format(new Date(flag.resolved_date), 'MMM d, yyyy') : ''}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {flags.length === 0 && !showFlagForm && (
              <p className="text-slate-400 text-center py-8">No issues flagged for this record</p>
            )}
          </TabsContent>

          {/* Related Data Tab */}
          <TabsContent value="related" className="mt-4">
            {relatedData && relatedData.length > 0 ? (
              <div className="space-y-3">
                {relatedData.map((item, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{item.label}</p>
                      {item.data ? (
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          {Object.entries(item.data).filter(([k]) => !k.startsWith('_') && !['id', 'created_by', 'updated_date', 'created_date'].includes(k) && typeof item.data[k] !== 'object').map(([k, v]) => (
                            <React.Fragment key={k}>
                              <div className="text-slate-500 py-1 px-2 text-xs">{FIELD_LABELS[k] || k.replace(/_/g, ' ')}</div>
                              <div className="py-1 px-2 text-xs">{formatValue(k, v)}</div>
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Not found</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No related data available</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}