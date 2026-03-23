import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, CheckCircle2 } from 'lucide-react';

export default function ClauseInputForm({ clause, selection, onSave }) {
  const [userData, setUserData] = useState({});
  const [staffNotes, setStaffNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUserData(selection?.user_data || {});
    setStaffNotes(selection?.staff_notes || '');
    setSaved(false);
  }, [clause?.id, selection]);

  const inputFields = clause?.input_fields || [];

  const handleFieldChange = (key, value) => {
    setUserData(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    onSave(userData, staffNotes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Generate a preview of what the merged text will look like
  const previewText = (clause?.template_body || '').replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return userData[key] || `[${key}]`;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-semibold text-slate-900">{clause.title}</h3>
          {clause.risk_level && (
            <Badge variant={clause.risk_level === 'High' ? 'destructive' : 'outline'} className="text-xs">
              {clause.risk_level} Risk
            </Badge>
          )}
          {selection?.completion_status === 'complete' && (
            <Badge className="bg-green-100 text-green-700 text-xs">Complete</Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">{clause.section}</p>
      </div>

      {!selection?.included ? (
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <p className="text-slate-500">This clause is excluded from this study.</p>
          <p className="text-xs text-slate-400 mt-1">Click the circle icon to include it.</p>
        </div>
      ) : (
        <>
          {/* Dynamic Input Fields */}
          {inputFields.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700">Fill in the details below:</p>
              {inputFields.map(field => (
                <div key={field.key}>
                  <Label className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>

                  {field.type === 'textarea' && (
                    <Textarea
                      value={userData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ''}
                      rows={4}
                      className="mt-1"
                    />
                  )}

                  {field.type === 'text' && (
                    <Input
                      value={userData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className="mt-1"
                    />
                  )}

                  {field.type === 'number' && (
                    <Input
                      type="number"
                      value={userData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className="mt-1"
                    />
                  )}

                  {field.type === 'select' && (
                    <Select value={userData[field.key] || ''} onValueChange={v => handleFieldChange(field.key, v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
                      <SelectContent>
                        {(field.options || []).map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {field.type === 'boolean' && (
                    <div className="flex items-center gap-2 mt-1">
                      <Switch
                        checked={!!userData[field.key]}
                        onCheckedChange={v => handleFieldChange(field.key, v)}
                      />
                      <span className="text-sm text-slate-600">{userData[field.key] ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">This clause uses standard template text — no additional input needed.</p>
            </div>
          )}

          {/* Staff Notes */}
          <div>
            <Label>Staff Notes (optional)</Label>
            <Textarea
              value={staffNotes}
              onChange={e => { setStaffNotes(e.target.value); setSaved(false); }}
              placeholder="Add any additional observations or notes..."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Report Preview</p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border">
              {previewText}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2">
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}