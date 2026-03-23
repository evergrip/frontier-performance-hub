import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const SECTIONS = [
  'Site & Zoning Analysis',
  'Structural & Building Condition',
  'Utility & Service Assessment',
  'Budget Analysis',
  'Regulatory & Permit Pathway',
  'Risk Assessment',
  'Recommendations & Next Steps'
];

const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'boolean'];

const emptyField = () => ({ key: '', label: '', type: 'text', options: [], placeholder: '', required: false });
const emptyTrigger = () => ({ condition_type: 'clause_selected', field_key: '', field_value: '', target_clause_ids: [], description: '' });

export default function ClauseFormDialog({ open, onOpenChange, clause, allClauses, onSave, saving }) {
  const [form, setForm] = useState({
    clause_id: '', section: SECTIONS[0], title: '', template_body: '',
    input_fields: [], triggers: [], default_include: true, sort_order: 0,
    risk_level: '', is_active: true
  });

  useEffect(() => {
    if (clause) {
      setForm({
        clause_id: clause.clause_id || '',
        section: clause.section || SECTIONS[0],
        title: clause.title || '',
        template_body: clause.template_body || '',
        input_fields: clause.input_fields || [],
        triggers: clause.triggers || [],
        default_include: clause.default_include !== false,
        sort_order: clause.sort_order || 0,
        risk_level: clause.risk_level || '',
        is_active: clause.is_active !== false,
      });
    } else {
      setForm({
        clause_id: '', section: SECTIONS[0], title: '', template_body: '',
        input_fields: [], triggers: [], default_include: true, sort_order: 0,
        risk_level: '', is_active: true
      });
    }
  }, [clause, open]);

  const updateField = (idx, key, val) => {
    const fields = [...form.input_fields];
    fields[idx] = { ...fields[idx], [key]: val };
    setForm({ ...form, input_fields: fields });
  };

  const updateTrigger = (idx, key, val) => {
    const triggers = [...form.triggers];
    triggers[idx] = { ...triggers[idx], [key]: val };
    setForm({ ...form, triggers: triggers });
  };

  const otherClauses = (allClauses || []).filter(c => c.id !== clause?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clause ? 'Edit Clause' : 'New Clause'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Clause ID</Label>
              <Input value={form.clause_id} onChange={e => setForm({ ...form, clause_id: e.target.value })} placeholder="FS-SZ-001" />
            </div>
            <div>
              <Label>Section</Label>
              <Select value={form.section} onValueChange={v => setForm({ ...form, section: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Lot Dimensions & Setbacks" />
            </div>
          </div>

          <div>
            <Label>Template Body</Label>
            <p className="text-xs text-slate-500 mb-1">Use {'{{field_key}}'} for placeholders that get filled from input fields</p>
            <Textarea value={form.template_body} onChange={e => setForm({ ...form, template_body: e.target.value })} rows={4} placeholder="The subject lot measures {{lot_dimensions}} with setbacks of {{setback_details}}..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select value={form.risk_level || 'none'} onValueChange={v => setForm({ ...form, risk_level: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3 pt-5">
              <div className="flex items-center gap-2">
                <Switch checked={form.default_include} onCheckedChange={v => setForm({ ...form, default_include: v })} />
                <Label className="text-sm">Include by default</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
          </div>

          {/* Input Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Input Fields</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, input_fields: [...form.input_fields, emptyField()] })}>
                <Plus className="w-3 h-3 mr-1" /> Add Field
              </Button>
            </div>
            {form.input_fields.map((field, idx) => (
              <Card key={idx} className="mb-2">
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input value={field.key} onChange={e => updateField(idx, 'key', e.target.value)} placeholder="field_key" className="h-8 text-xs" />
                    </div>
                    <div className="flex-1">
                      <Input value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} placeholder="Field Label" className="h-8 text-xs" />
                    </div>
                    <Select value={field.type} onValueChange={v => updateField(idx, 'type', v)}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Switch checked={field.required || false} onCheckedChange={v => updateField(idx, 'required', v)} />
                      <span className="text-xs text-slate-500">Req</span>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setForm({ ...form, input_fields: form.input_fields.filter((_, i) => i !== idx) })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {field.type === 'select' && (
                    <div>
                      <Input value={(field.options || []).join(', ')} onChange={e => updateField(idx, 'options', e.target.value.split(',').map(o => o.trim()).filter(Boolean))} placeholder="Option 1, Option 2, Option 3" className="h-8 text-xs" />
                      <p className="text-xs text-slate-400 mt-0.5">Comma-separated options</p>
                    </div>
                  )}
                  <Input value={field.placeholder || ''} onChange={e => updateField(idx, 'placeholder', e.target.value)} placeholder="Placeholder text (optional)" className="h-8 text-xs" />
                </CardContent>
              </Card>
            ))}
            {form.input_fields.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No input fields defined</p>}
          </div>

          {/* Triggers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-base font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Triggers</Label>
                <p className="text-xs text-slate-500">When conditions are met, other clauses become required</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, triggers: [...form.triggers, emptyTrigger()] })}>
                <Plus className="w-3 h-3 mr-1" /> Add Trigger
              </Button>
            </div>
            {form.triggers.map((trigger, idx) => (
              <Card key={idx} className="mb-2 border-amber-200 bg-amber-50/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 shrink-0">When:</span>
                    <Select value={trigger.condition_type} onValueChange={v => updateTrigger(idx, 'condition_type', v)}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clause_selected">This clause is selected</SelectItem>
                        <SelectItem value="field_value">A field has a specific value</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-500 ml-auto" onClick={() => setForm({ ...form, triggers: form.triggers.filter((_, i) => i !== idx) })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {trigger.condition_type === 'field_value' && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select value={trigger.field_key || ''} onValueChange={v => updateTrigger(idx, 'field_key', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
                          <SelectContent>
                            {form.input_fields.map(f => <SelectItem key={f.key} value={f.key}>{f.label || f.key}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        {(() => {
                          const watchedField = form.input_fields.find(f => f.key === trigger.field_key);
                          if (watchedField?.type === 'boolean') {
                            return (
                              <Select value={trigger.field_value || 'true'} onValueChange={v => updateTrigger(idx, 'field_value', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Yes / True</SelectItem>
                                  <SelectItem value="false">No / False</SelectItem>
                                </SelectContent>
                              </Select>
                            );
                          }
                          if (watchedField?.type === 'select' && watchedField.options?.length) {
                            return (
                              <Select value={trigger.field_value || ''} onValueChange={v => updateTrigger(idx, 'field_value', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select value" /></SelectTrigger>
                                <SelectContent>
                                  {watchedField.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            );
                          }
                          return <Input value={trigger.field_value || ''} onChange={e => updateTrigger(idx, 'field_value', e.target.value)} placeholder="Equals value..." className="h-8 text-xs" />;
                        })()}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-medium text-slate-600">Then require these clauses:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {otherClauses.map(c => {
                        const isSelected = (trigger.target_clause_ids || []).includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const ids = isSelected
                                ? trigger.target_clause_ids.filter(id => id !== c.id)
                                : [...(trigger.target_clause_ids || []), c.id];
                              updateTrigger(idx, 'target_clause_ids', ids);
                            }}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${isSelected ? 'bg-amber-100 border-amber-400 text-amber-800 font-medium' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                          >
                            {c.title}
                          </button>
                        );
                      })}
                      {otherClauses.length === 0 && <p className="text-xs text-slate-400">No other clauses to target</p>}
                    </div>
                  </div>
                  <Input value={trigger.description || ''} onChange={e => updateTrigger(idx, 'description', e.target.value)} placeholder="Describe this trigger (optional)" className="h-8 text-xs" />
                </CardContent>
              </Card>
            ))}
            {form.triggers.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No triggers defined — clause has no dependencies</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.clause_id || !form.title || !form.section}>
            {saving ? 'Saving...' : clause ? 'Update Clause' : 'Create Clause'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}