import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AREA_OPTIONS = [
  'Dashboard', 'Leads', 'Clients', 'Sales', 'Projects', 'Surveys',
  'Budgets', 'Meetings', 'Commissions', 'Reports', 'Feasibility',
  'Process Maps', 'Scheduler', 'Company Resources', 'Var Comp', 'Other'
];

export default function DevLogFormDialog({ open, onOpenChange, editItem, users }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '', type: 'feature_added', description: '', status: 'resolved',
    priority: 'medium', assigned_to: '', related_area: '', due_date: '', resolution_date: '', notes: '',
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        title: editItem.title || '',
        type: editItem.type || 'feature_added',
        description: editItem.description || '',
        status: editItem.status || 'resolved',
        priority: editItem.priority || 'medium',
        assigned_to: editItem.assigned_to || '',
        related_area: editItem.related_area || '',
        due_date: editItem.due_date || '',
        resolution_date: editItem.resolution_date || '',
        notes: editItem.notes || '',
      });
    } else {
      setForm({ title: '', type: 'feature_added', description: '', status: 'resolved', priority: 'medium', assigned_to: '', related_area: '', due_date: '', resolution_date: '', notes: '' });
    }
  }, [editItem, open]);

  const mutation = useMutation({
    mutationFn: (data) => editItem
      ? base44.entities.DevelopmentLog.update(editItem.id, data)
      : base44.entities.DevelopmentLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devLogs'] });
      toast.success(editItem ? 'Entry updated' : 'Entry created');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Log Entry' : 'Add Log Entry'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature_added">Feature Added</SelectItem>
                  <SelectItem value="bug_repaired">Bug Repaired</SelectItem>
                  <SelectItem value="bug_feature_request">Bug/Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_request">New Request</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
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
              <Label>Related Area</Label>
              <Select value={form.related_area} onValueChange={v => setForm(f => ({ ...f, related_area: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assigned To</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {(users || []).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Resolution Date</Label>
            <Input type="date" value={form.resolution_date} onChange={e => setForm(f => ({ ...f, resolution_date: e.target.value }))} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !form.title}>
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}