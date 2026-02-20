import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Clock, Loader2 } from 'lucide-react';

export default function MeetingTypesTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: '', value: '', default_duration_minutes: 60, is_active: true, display_order: 0 });
  const queryClient = useQueryClient();

  const { data: meetingTypes = [], isLoading } = useQuery({
    queryKey: ['meetingTypes'],
    queryFn: () => base44.entities.MeetingType.list(),
    initialData: [],
  });

  const sorted = [...meetingTypes].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MeetingType.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meetingTypes'] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingType.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meetingTypes'] }); setFormOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingType.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetingTypes'] }),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ label: '', value: '', default_duration_minutes: 60, is_active: true, display_order: sorted.length + 1 });
    setFormOpen(true);
  };

  const openEdit = (mt) => {
    setEditing(mt);
    setForm({ label: mt.label, value: mt.value, default_duration_minutes: mt.default_duration_minutes || 60, is_active: mt.is_active !== false, display_order: mt.display_order || 0 });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const data = { ...form, value: form.value || form.label.toLowerCase().replace(/[^a-z0-9]+/g, '_') };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (mt) => {
    if (confirm(`Delete meeting type "${mt.label}"?`)) {
      deleteMutation.mutate(mt.id);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Define meeting types with standard durations. The end time auto-fills when scheduling.</p>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Type</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map(mt => (
            <Card key={mt.id} className={mt.is_active === false ? 'opacity-50' : ''}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-800">{mt.label}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{mt.default_duration_minutes || 60} min</span>
                    {mt.is_active === false && <span className="text-red-500 text-xs">(inactive)</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mt)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(mt)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Meeting Type' : 'New Meeting Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Client Check-in" />
            </div>
            <div>
              <Label>Internal Key</Label>
              <Input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="Auto-generated from name" className="text-xs" />
              <p className="text-xs text-slate-400 mt-1">Lowercase, underscored. Leave blank to auto-generate.</p>
            </div>
            <div>
              <Label>Standard Duration (minutes) *</Label>
              <Input type="number" value={form.default_duration_minutes} onChange={e => setForm(f => ({ ...f, default_duration_minutes: parseInt(e.target.value) || 60 }))} min={5} step={5} />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.label}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}