import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import EditLogViewer from '../common/EditLogViewer';
import { computeChanges, logEdit } from '../common/editLogUtils';

const TRACKED_FIELDS = [
  'title', 'contract_value', 'actual_costs', 'actual_margin',
  'start_date', 'target_completion_date', 'project_manager_id',
  'crew_assignment', 'notes'
];

export default function EditProjectDetailDialog({ open, onOpenChange, project, clients, users }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title || '',
        contract_value: project.contract_value || '',
        actual_costs: project.actual_costs || '',
        actual_margin: project.actual_margin || '',
        start_date: project.start_date || '',
        target_completion_date: project.target_completion_date || '',
        project_manager_id: project.project_manager_id || '',
        crew_assignment: project.crew_assignment || 'unassigned',
        notes: project.notes || '',
        client_id: project.client_id || '',
      });
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const changes = computeChanges(project, data, TRACKED_FIELDS);

      // Resolve user names for project_manager_id changes
      changes.forEach(c => {
        if (c.field === 'project_manager_id') {
          c.old_value = users?.find(u => u.id === c.old_value)?.full_name || c.old_value || '';
          c.new_value = users?.find(u => u.id === c.new_value)?.full_name || c.new_value || '';
        }
      });

      await base44.entities.Project.update(project.id, data);
      await logEdit({
        entityType: 'project',
        entityId: project.id,
        entityTitle: project.title,
        changes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['edit-logs']);
      onOpenChange(false);
      toast.success('Project updated');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
      actual_costs: form.actual_costs ? parseFloat(form.actual_costs) : null,
      actual_margin: form.actual_margin ? parseFloat(form.actual_margin) : null,
    };
    updateMutation.mutate(data);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contract Value</Label>
              <Input type="number" value={form.contract_value || ''} onChange={(e) => set('contract_value', e.target.value)} />
            </div>
            <div>
              <Label>Actual Costs</Label>
              <Input type="number" value={form.actual_costs || ''} onChange={(e) => set('actual_costs', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Actual Margin (%)</Label>
              <Input type="number" step="0.01" value={form.actual_margin || ''} onChange={(e) => set('actual_margin', e.target.value)} />
            </div>
            <div>
              <Label>Crew Assignment</Label>
              <Select value={form.crew_assignment || 'unassigned'} onValueChange={(v) => set('crew_assignment', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="crew_a">Crew A</SelectItem>
                  <SelectItem value="crew_b">Crew B</SelectItem>
                  <SelectItem value="crew_c">Crew C</SelectItem>
                  <SelectItem value="crew_d">Crew D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Project Manager</Label>
            <Select value={form.project_manager_id || 'none'} onValueChange={(v) => set('project_manager_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select PM" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(users || []).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Client</Label>
            <Select value={form.client_id || 'none'} onValueChange={(v) => set('client_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(clients || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <Label>Target Completion</Label>
              <Input type="date" value={form.target_completion_date || ''} onChange={(e) => set('target_completion_date', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-[#ea7924] hover:bg-[#d66a1f]">
              Save Changes
            </Button>
          </div>
        </form>

        {/* Edit History */}
        <div className="border-t pt-4 mt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Edit History</p>
          <EditLogViewer entityType="project" entityId={project.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}