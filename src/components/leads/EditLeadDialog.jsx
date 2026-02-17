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
import { toast } from 'sonner';
import LeadSourcePicker from '../common/LeadSourcePicker';

export default function EditLeadDialog({ open, onOpenChange, lead, clients, users }) {
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

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(lead.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
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
      </DialogContent>
    </Dialog>
  );
}