import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FeasibilityStudyFormDialog({ open, onOpenChange, onCreated, study }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const isEdit = !!study;

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    property_address: '',
    jurisdiction: '',
    scope_summary: '',
    overall_feasibility_rating: '',
    notes: ''
  });

  useEffect(() => {
    if (study) {
      setForm({
        client_id: study.client_id || '',
        title: study.title || '',
        property_address: study.property_address || '',
        jurisdiction: study.jurisdiction || '',
        scope_summary: study.scope_summary || '',
        overall_feasibility_rating: study.overall_feasibility_rating || '',
        notes: study.notes || ''
      });
    } else {
      setForm({ client_id: '', title: '', property_address: '', jurisdiction: '', scope_summary: '', overall_feasibility_rating: '', notes: '' });
    }
  }, [study, open]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const handleSave = async () => {
    if (!form.client_id || !form.title) return;
    setSaving(true);

    if (isEdit) {
      await base44.entities.FeasibilityStudy.update(study.id, form);
      queryClient.invalidateQueries(['feasibility-studies']);
      queryClient.invalidateQueries(['feasibility-study', study.id]);
      setSaving(false);
      onOpenChange(false);
    } else {
      const newStudy = await base44.entities.FeasibilityStudy.create({
        ...form,
        status: 'draft'
      });

      const clauses = await base44.entities.FeasibilityClause.filter({ is_active: true });
      if (clauses.length > 0) {
        const selections = clauses.map(clause => ({
          study_id: newStudy.id,
          clause_id: clause.id,
          included: !!clause.default_include,
          user_data: {},
          completion_status: 'not_started'
        }));
        await base44.entities.FeasibilitySelection.bulkCreate(selections);
      }

      queryClient.invalidateQueries(['feasibility-studies']);
      setSaving(false);
      setForm({ client_id: '', title: '', property_address: '', jurisdiction: '', scope_summary: '', overall_feasibility_rating: '', notes: '' });
      onOpenChange(false);
      if (onCreated) onCreated(newStudy.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Study Info' : 'New Feasibility Study'}</DialogTitle>
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

          {isEdit && (
            <div>
              <Label>Overall Feasibility Rating</Label>
              <Select value={form.overall_feasibility_rating} onValueChange={v => setForm({ ...form, overall_feasibility_rating: v })}>
                <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="highly_feasible">Highly Feasible</SelectItem>
                  <SelectItem value="feasible_with_conditions">Feasible with Conditions</SelectItem>
                  <SelectItem value="marginally_feasible">Marginally Feasible</SelectItem>
                  <SelectItem value="not_feasible">Not Feasible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isEdit && (
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..." rows={2} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.client_id || !form.title}>
            {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create & Start Building')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}