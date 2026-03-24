import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Check, X } from 'lucide-react';

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

export default function BulkClauseEditForm({ clause, onChange, onSave, onCancel }) {
  const update = (key, val) => onChange({ ...clause, [key]: val });

  const updateField = (idx, key, val) => {
    const fields = [...(clause.input_fields || [])];
    fields[idx] = { ...fields[idx], [key]: val };
    update('input_fields', fields);
  };

  const addField = () => {
    update('input_fields', [...(clause.input_fields || []), { key: '', label: '', type: 'text', required: false, placeholder: '' }]);
  };

  const removeField = (idx) => {
    update('input_fields', (clause.input_fields || []).filter((_, i) => i !== idx));
  };

  return (
    <Card className="border-blue-300 bg-blue-50/30">
      <CardContent className="p-4 space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Clause ID</Label>
            <Input value={clause.clause_id || ''} onChange={e => update('clause_id', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Section</Label>
            <Select value={clause.section || SECTIONS[0]} onValueChange={v => update('section', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Title</Label>
          <Input value={clause.title || ''} onChange={e => update('title', e.target.value)} className="h-8 text-sm" />
        </div>

        <div>
          <Label className="text-xs">Template Body</Label>
          <Textarea value={clause.template_body || ''} onChange={e => update('template_body', e.target.value)} rows={3} className="text-sm" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Risk Level</Label>
            <Select value={clause.risk_level || 'none'} onValueChange={v => update('risk_level', v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Sort Order</Label>
            <Input type="number" value={clause.sort_order || 0} onChange={e => update('sort_order', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <div className="flex items-center gap-2">
              <Switch checked={clause.default_include !== false} onCheckedChange={v => update('default_include', v)} />
              <span className="text-xs">Default include</span>
            </div>
          </div>
        </div>

        {/* Input Fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold">Input Fields ({(clause.input_fields || []).length})</Label>
            <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={addField}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
          {(clause.input_fields || []).map((field, idx) => (
            <div key={idx} className="flex gap-2 mb-1.5 items-center">
              <Input value={field.key} onChange={e => updateField(idx, 'key', e.target.value)} placeholder="key" className="h-7 text-xs flex-1" />
              <Input value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} placeholder="Label" className="h-7 text-xs flex-1" />
              <Select value={field.type || 'text'} onValueChange={v => updateField(idx, 'type', v)}>
                <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Switch checked={field.required || false} onCheckedChange={v => updateField(idx, 'required', v)} />
                <span className="text-xs text-slate-500">Req</span>
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeField(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onCancel} className="gap-1">
            <X className="w-3 h-3" /> Cancel
          </Button>
          <Button size="sm" onClick={onSave} className="gap-1">
            <Check className="w-3 h-3" /> Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}