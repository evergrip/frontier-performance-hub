import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ChevronRight, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import LeadSourcePicker from '../common/LeadSourcePicker';
import EditLogViewer from '../common/EditLogViewer';
import { computeChanges, logEdit } from '../common/editLogUtils';

export default function EditLeadDialog({ open, onOpenChange, lead, clients, users, onAdvance, onConvert, onDisqualify, onViewTimeline }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (lead) {
      setForm({
        title: lead.title || '',
        client_id: lead.client_id || '',
        source: lead.source || '',
        lead_score: lead.lead_score ?? 50,
        estimated_precon_value: lead.estimated_precon_value || '',
        estimated_construction_value: lead.estimated_construction_value || '',
        assigned_to: lead.assigned_to || '',
        notes: lead.notes || '',
      });
    }
  }, [lead]);

  const TRACKED_FIELDS = ['title', 'client_id', 'source', 'lead_score', 'estimated_precon_value', 'estimated_construction_value', 'assigned_to', 'notes'];

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const changes = computeChanges(lead, data, TRACKED_FIELDS);

      // Resolve client and user names for audit readability
      changes.forEach(c => {
        if (c.field === 'client_id') {
          c.old_value = clients?.find(cl => cl.id === c.old_value)?.company_name || c.old_value || '';
          c.new_value = clients?.find(cl => cl.id === c.new_value)?.company_name || c.new_value || '';
        }
        if (c.field === 'assigned_to') {
          c.old_value = users?.find(u => u.id === c.old_value)?.full_name || c.old_value || '';
          c.new_value = users?.find(u => u.id === c.new_value)?.full_name || c.new_value || '';
        }
      });

      await base44.entities.Lead.update(lead.id, data);
      await logEdit({
        entityType: 'lead',
        entityId: lead.id,
        entityTitle: lead.title,
        changes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['edit-logs']);
      onOpenChange(false);
      toast.success('Lead updated');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      lead_score: Number(form.lead_score),
      estimated_precon_value: form.estimated_precon_value ? parseFloat(form.estimated_precon_value) : null,
      estimated_construction_value: form.estimated_construction_value ? parseFloat(form.estimated_construction_value) : null,
    };
    updateMutation.mutate(data);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div>
            <Label>Client</Label>
            <Select value={form.client_id || ''} onValueChange={(v) => set('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name || c.contact_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lead Source</Label>
            <LeadSourcePicker value={form.source || ''} onChange={(v) => set('source', v)} />
          </div>

          <div>
            <Label>Assigned To</Label>
            <Select value={form.assigned_to || 'unassigned'} onValueChange={(v) => set('assigned_to', v === 'unassigned' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lead Score: {form.lead_score ?? 50}</Label>
            <Slider
              value={[form.lead_score ?? 50]}
              onValueChange={([v]) => set('lead_score', v)}
              min={0} max={100} step={1}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Est. Precon Value</Label>
              <Input
                type="number"
                value={form.estimated_precon_value || ''}
                onChange={(e) => set('estimated_precon_value', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Est. Construction Value</Label>
              <Input
                type="number"
                value={form.estimated_construction_value || ''}
                onChange={(e) => set('estimated_construction_value', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Internal notes about this lead..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-[#ea7924] hover:bg-[#d66a1f]">
              Save Changes
            </Button>
          </div>
        </form>

        {/* Quick Actions */}
        <div className="border-t pt-4 mt-2 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {onViewTimeline && (
              <Button size="sm" variant="outline" className="text-xs" onClick={() => { onOpenChange(false); onViewTimeline(lead); }}>
                View Timeline
              </Button>
            )}
            {onAdvance && (
              <Button size="sm" variant="outline" className="text-xs" onClick={() => { onOpenChange(false); onAdvance(lead); }}>
                <ChevronRight className="w-3 h-3 mr-1" /> Advance
              </Button>
            )}
            {onConvert && (
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => { onOpenChange(false); onConvert(lead); }}>
                <Briefcase className="w-3 h-3 mr-1" /> Convert to Sale
              </Button>
            )}
            {onDisqualify && (
              <Button size="sm" variant="outline" className="text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => { onOpenChange(false); onDisqualify(lead); }}>
                Disqualify
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}