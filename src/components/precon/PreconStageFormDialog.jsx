import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const EMPTY = {
  stage_order: 1, stage_name: '', purpose: '', main_deliverable: '',
  approval_gate: '', raci_responsible: '', raci_accountable: '', raci_consulted: '', raci_informed: '',
  required_tools_templates: '', ai_prompt_template: '', validation_rules: '', due_date_logic: '',
};

export default function PreconStageFormDialog({ open, onOpenChange, stage, nextOrder }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (stage) {
      setForm({
        stage_order: stage.stage_order || 1,
        stage_name: stage.stage_name || '',
        purpose: stage.purpose || '',
        main_deliverable: stage.main_deliverable || '',
        approval_gate: stage.approval_gate || '',
        raci_responsible: stage.raci_responsible || '',
        raci_accountable: stage.raci_accountable || '',
        raci_consulted: stage.raci_consulted || '',
        raci_informed: stage.raci_informed || '',
        required_tools_templates: stage.required_tools_templates || '',
        ai_prompt_template: stage.ai_prompt_template || '',
        validation_rules: stage.validation_rules || '',
        due_date_logic: stage.due_date_logic || '',
      });
    } else {
      setForm({ ...EMPTY, stage_order: nextOrder || 1 });
    }
  }, [stage, nextOrder, open]);

  const mutation = useMutation({
    mutationFn: (data) => stage
      ? base44.entities.PreconStage.update(stage.id, data)
      : base44.entities.PreconStage.create({ ...data, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['precon-stages']);
      onOpenChange(false);
      toast.success(stage ? 'Stage updated' : 'Stage created');
    },
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stage ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Order #</Label>
              <Input type="number" value={form.stage_order} onChange={e => set('stage_order', parseInt(e.target.value) || 1)} />
            </div>
            <div className="col-span-3">
              <Label>Stage Name *</Label>
              <Input value={form.stage_name} onChange={e => set('stage_name', e.target.value)} required />
            </div>
          </div>

          <div>
            <Label>Purpose</Label>
            <Textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Main Deliverable</Label>
            <Input value={form.main_deliverable} onChange={e => set('main_deliverable', e.target.value)} />
          </div>
          <div>
            <Label>Approval / Gate</Label>
            <Input value={form.approval_gate} onChange={e => set('approval_gate', e.target.value)} placeholder="DG, IA, CS, AR, etc." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Responsible</Label><Input value={form.raci_responsible} onChange={e => set('raci_responsible', e.target.value)} /></div>
            <div><Label>Accountable</Label><Input value={form.raci_accountable} onChange={e => set('raci_accountable', e.target.value)} /></div>
            <div><Label>Consulted</Label><Input value={form.raci_consulted} onChange={e => set('raci_consulted', e.target.value)} /></div>
            <div><Label>Informed</Label><Input value={form.raci_informed} onChange={e => set('raci_informed', e.target.value)} /></div>
          </div>

          <div>
            <Label>Required Tools / Templates</Label>
            <Textarea value={form.required_tools_templates} onChange={e => set('required_tools_templates', e.target.value)} rows={2} />
          </div>
          <div>
            <Label>AI Prompt Template</Label>
            <Textarea value={form.ai_prompt_template} onChange={e => set('ai_prompt_template', e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Validation Rules</Label>
            <Textarea value={form.validation_rules} onChange={e => set('validation_rules', e.target.value)} rows={2} placeholder="e.g. deliverable_notes required, approval_status must be approved" />
          </div>
          <div>
            <Label>Due-Date Logic</Label>
            <Input value={form.due_date_logic} onChange={e => set('due_date_logic', e.target.value)} placeholder="e.g. +3 business days from previous stage" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{stage ? 'Save Changes' : 'Create Stage'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}