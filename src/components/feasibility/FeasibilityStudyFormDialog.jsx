import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FeasibilityStudyFormDialog({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    property_address: '',
    jurisdiction: '',
    scope_summary: '',
    notes: ''
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const handleSave = async () => {
    if (!form.client_id || !form.title) return;
    setSaving(true);

    const study = await base44.entities.FeasibilityStudy.create({
      ...form,
      status: 'draft',
      template_doc_id: '1jlDvPDPSO0VcMy3Hi2kNqqZmYjXWy8Iomgyw7WRzn_5oEYLaBaNsPGGS'
    });

    // Auto-create selections for all default-include clauses
    const clauses = await base44.entities.FeasibilityClause.filter({ is_active: true });
    if (clauses.length > 0) {
      const selections = clauses.map(clause => ({
        study_id: study.id,
        clause_id: clause.id,
        included: !!clause.default_include,
        user_data: {},
        completion_status: 'not_started'
      }));
      await base44.entities.FeasibilitySelection.bulkCreate(selections);
    }

    queryClient.invalidateQueries(['feasibility-studies']);
    setSaving(false);
    setForm({ client_id: '', title: '', property_address: '', jurisdiction: '', scope_summary: '', notes: '' });
    onOpenChange(false);
    if (onCreated) onCreated(study.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Feasibility Study</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Study Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Garden Suite Feasibility - 123 Main St" />
          </div>

          <div>
            <Label>Property Address</Label>
            <Input value={form.property_address} onChange={e => setForm({ ...form, property_address: e.target.value })} placeholder="Full property address" />
          </div>

          <div>
            <Label>Jurisdiction</Label>
            <Select value={form.jurisdiction} onValueChange={v => setForm({ ...form, jurisdiction: v })}>
              <SelectTrigger><SelectValue placeholder="Select jurisdiction" /></SelectTrigger>
              <SelectContent>
                {['City of Hamilton', 'County of Brant', 'City of Brantford', 'Haldimand County', 'Norfolk County'].map(j => (
                  <SelectItem key={j} value={j}>{j}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Scope Summary</Label>
            <Textarea value={form.scope_summary} onChange={e => setForm({ ...form, scope_summary: e.target.value })}
              placeholder="Brief description of the proposed project..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.client_id || !form.title}>
            {saving ? 'Creating...' : 'Create & Start Building'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}