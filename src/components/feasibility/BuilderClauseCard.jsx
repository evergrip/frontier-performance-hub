import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Lock, Zap, Save, Loader2 } from 'lucide-react';

export default function BuilderClauseCard({
  clause, selection, isTriggered, onToggle, onSave
}) {
  const [expanded, setExpanded] = useState(false);
  const [userData, setUserData] = useState({});
  const [staffNotes, setStaffNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const included = selection?.included;
  const status = selection?.completion_status || 'not_started';
  const inputFields = clause?.input_fields || [];

  useEffect(() => {
    setUserData(selection?.user_data || {});
    setStaffNotes(selection?.staff_notes || '');
    setSaved(false);
  }, [clause?.id, selection]);

  const handleFieldChange = (key, value) => {
    setUserData(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(clause.id, userData, staffNotes);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const previewText = (clause?.template_body || '').replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return userData[key] || `[${key}]`;
  });

  const statusIcon = () => {
    if (isTriggered && included) return <Lock className="w-5 h-5 text-amber-500" />;
    if (included && status === 'complete') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (included && status === 'in_progress') return <CheckCircle2 className="w-5 h-5 text-amber-500" />;
    if (included) return <Circle className="w-5 h-5 text-slate-300 fill-blue-50 stroke-blue-400" />;
    return <Circle className="w-5 h-5 text-slate-300" />;
  };

  return (
    <div className={`rounded-xl border transition-all ${
      !included ? 'bg-slate-50/50 border-slate-200 opacity-70' :
      expanded ? 'bg-white border-slate-300 shadow-md' :
      'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => included && setExpanded(!expanded)}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(clause.id); }}
          disabled={isTriggered && included}
          className="shrink-0"
        >
          {statusIcon()}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${included ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
              {clause.title}
            </p>
            {clause.risk_level && (
              <Badge variant={clause.risk_level === 'High' ? 'destructive' : 'outline'} className="text-[10px] py-0">
                {clause.risk_level}
              </Badge>
            )}
            {isTriggered && included && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                <Zap className="w-3 h-3" /> Required
              </span>
            )}
            {status === 'complete' && included && (
              <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] py-0">Done</Badge>
            )}
          </div>
          {inputFields.length > 0 && included && (
            <p className="text-xs text-slate-400 mt-0.5">
              {inputFields.length} field{inputFields.length !== 1 ? 's' : ''} to fill in
            </p>
          )}
        </div>
        {included && (
          <div className="shrink-0 text-slate-400">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && included && (
        <div className="px-4 pb-5 pt-1 border-t border-slate-100">
          {inputFields.length > 0 ? (
            <div className="space-y-4 mt-4">
              {inputFields.map(field => (
                <div key={field.key}>
                  <Label className="flex items-center gap-1 text-sm">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="mt-1.5">
                    {field.type === 'textarea' && (
                      <Textarea
                        value={userData[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                        rows={3}
                      />
                    )}
                    {field.type === 'text' && (
                      <Input
                        value={userData[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                    {field.type === 'number' && (
                      <Input
                        type="number"
                        value={userData[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                    {field.type === 'select' && (
                      <Select value={userData[field.key] || ''} onValueChange={v => handleFieldChange(field.key, v)}>
                        <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === 'boolean' && (
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={!!userData[field.key]}
                          onCheckedChange={v => handleFieldChange(field.key, v)}
                        />
                        <span className="text-sm text-slate-600">{userData[field.key] ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-3 mt-3">
              <p className="text-sm text-slate-500">This clause uses standard template text — no additional input needed.</p>
            </div>
          )}

          {/* Staff Notes */}
          <div className="mt-4">
            <Label className="text-sm">Staff Notes (optional)</Label>
            <Textarea
              value={staffNotes}
              onChange={e => { setStaffNotes(e.target.value); setSaved(false); }}
              placeholder="Add any additional observations or notes..."
              rows={2}
              className="mt-1.5"
            />
          </div>

          {/* Preview */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Report Preview</p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200">
              {previewText}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}