import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import ReactQuill from 'react-quill';

const CURRENCY_FMT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function DeliverableFieldRenderer({ field, value, calculatedValue, onChange, disabled }) {
  const { key, label, type, options, svic, required } = field;

  const labelEl = (
    <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
      {label}
      {required && <span className="text-red-500">*</span>}
      {svic && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">S.V.I.C.</span>}
    </Label>
  );

  if (type === 'calculated') {
    return (
      <div>
        {labelEl}
        <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-700">
          {typeof calculatedValue === 'number' && !isNaN(calculatedValue)
            ? (label.includes('$') ? CURRENCY_FMT.format(calculatedValue) : calculatedValue.toFixed(2))
            : '—'}
        </div>
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <div className="flex items-center gap-2 py-1">
        <Checkbox
          id={key}
          checked={!!value}
          onCheckedChange={(v) => onChange(key, v)}
          disabled={disabled}
        />
        <Label htmlFor={key} className="text-xs font-medium text-slate-600 cursor-pointer">
          {label}
          {svic && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">S.V.I.C.</span>}
        </Label>
      </div>
    );
  }

  if (type === 'richtext') {
    return (
      <div>
        {labelEl}
        <div className="mt-1">
          <ReactQuill
            value={value || ''}
            onChange={(v) => onChange(key, v)}
            theme="snow"
            readOnly={disabled}
            modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] }}
            style={{ minHeight: '80px' }}
          />
        </div>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div>
        {labelEl}
        <Select value={value || ''} onValueChange={(v) => onChange(key, v)} disabled={disabled}>
          <SelectTrigger className="mt-1 text-sm">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {(options || []).map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div>
        {labelEl}
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          rows={3}
          className="mt-1 text-sm"
          disabled={disabled}
        />
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div>
        {labelEl}
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          className="mt-1 text-sm"
          disabled={disabled}
        />
      </div>
    );
  }

  if (type === 'currency') {
    return (
      <div>
        {labelEl}
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value ? parseFloat(e.target.value) : '')}
          placeholder="0"
          className="mt-1 text-sm"
          disabled={disabled}
        />
      </div>
    );
  }

  if (type === 'number') {
    return (
      <div>
        {labelEl}
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value ? parseFloat(e.target.value) : '')}
          className="mt-1 text-sm"
          disabled={disabled}
        />
      </div>
    );
  }

  // Default: text
  return (
    <div>
      {labelEl}
      <Input
        value={value || ''}
        onChange={(e) => onChange(key, e.target.value)}
        className="mt-1 text-sm"
        disabled={disabled}
      />
    </div>
  );
}