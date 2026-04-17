import React, { useState } from 'react';
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

export default function ReportBugFeatureDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    type: 'bug_feature_request',
    description: '',
    priority: 'medium',
    related_area: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.DevelopmentLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devLogs'] });
      toast.success('Report submitted successfully!');
      onOpenChange(false);
      setForm({ title: '', type: 'bug_feature_request', description: '', priority: 'medium', related_area: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      status: 'new_request',
      reported_by: user?.id || '',
      reported_by_name: user?.full_name || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a Bug or Request a Feature</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bug_feature_request">Bug Report</SelectItem>
                <SelectItem value="feature_added">Feature Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary..." required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the bug or feature in detail..." rows={4} />
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
                <SelectTrigger><SelectValue placeholder="Select area..." /></SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !form.title}>
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Submit Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}