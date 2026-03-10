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
  'title', 'contract_value', 'estimated_construction_budget',
  'estimated_margin', 'target_precon_completion_date', 'assigned_to', 'notes'
];

export default function EditSaleDialog({ open, onOpenChange, sale, clients, users }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (sale) {
      setForm({
        title: sale.title || '',
        contract_value: sale.contract_value || '',
        estimated_construction_budget: sale.estimated_construction_budget || '',
        estimated_margin: sale.estimated_margin || '',
        target_precon_completion_date: sale.target_precon_completion_date || '',
        assigned_to: sale.assigned_to || '',
        notes: sale.notes || '',
      });
    }
  }, [sale]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const changes = computeChanges(sale, data, TRACKED_FIELDS);
      // Resolve user names for assigned_to changes
      changes.forEach(c => {
        if (c.field === 'assigned_to') {
          c.old_value = users?.find(u => u.id === c.old_value)?.full_name || c.old_value || '';
          c.new_value = users?.find(u => u.id === c.new_value)?.full_name || c.new_value || '';
        }
      });
      await base44.entities.Sale.update(sale.id, data);
      await logEdit({
        entityType: 'sale',
        entityId: sale.id,
        entityTitle: sale.title,
        changes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      queryClient.invalidateQueries(['edit-logs']);
      onOpenChange(false);
      toast.success('Sale updated');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
      estimated_construction_budget: form.estimated_construction_budget ? parseFloat(form.estimated_construction_budget) : null,
      estimated_margin: form.estimated_margin ? parseFloat(form.estimated_margin) : null,
    };
    updateMutation.mutate(data);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (!sale) return null;

  const getClientName = (clientId) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pre-Construction Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contract Value</Label>
              <Input type="number" value={form.contract_value || ''} onChange={(e) => set('contract_value', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Est. Construction Budget</Label>
              <Input type="number" value={form.estimated_construction_budget || ''} onChange={(e) => set('estimated_construction_budget', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimated Margin (%)</Label>
              <Input type="number" step="0.01" value={form.estimated_margin || ''} onChange={(e) => set('estimated_margin', e.target.value)} placeholder="25" />
            </div>
            <div>
              <Label>Target Completion</Label>
              <Input type="date" value={form.target_precon_completion_date || ''} onChange={(e) => set('target_precon_completion_date', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Assigned To</Label>
            <Select value={form.assigned_to || 'unassigned'} onValueChange={(v) => set('assigned_to', v === 'unassigned' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {(users || []).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Internal notes..." />
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
          <EditLogViewer entityType="sale" entityId={sale.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}