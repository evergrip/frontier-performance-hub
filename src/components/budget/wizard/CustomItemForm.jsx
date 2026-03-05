import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

const FIELDS_BY_CATEGORY = {
  staff: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'role', label: 'Role', type: 'text' },
    { key: 'pay_type', label: 'Pay Type', type: 'select', options: [
      { value: 'salary', label: 'Annual Salary' },
      { value: 'hourly', label: 'Hourly Wage' },
    ], default: 'salary' },
    { key: 'salary', label: 'Annual Salary', type: 'number', required: true, showWhen: { key: 'pay_type', value: 'salary' } },
    { key: 'hourly_rate', label: 'Hourly Rate ($)', type: 'number', showWhen: { key: 'pay_type', value: 'hourly' } },
    { key: 'hours_per_week', label: 'Hours / Week', type: 'number', default: '40', showWhen: { key: 'pay_type', value: 'hourly' } },
    { key: 'commission_amount', label: 'Commission', type: 'number' },
    { key: 'benefits_cost', label: 'Benefits Cost', type: 'number' },
    { key: 'cost_category', label: 'Cost Category', type: 'select', options: [
      { value: 'overhead', label: 'Overhead' },
      { value: 'cogs', label: 'COGS' },
      { value: 'split', label: 'Split' },
    ], default: 'overhead' },
    { key: 'employment_type', label: 'Employment Type', type: 'select', options: [
      { value: 'full_time', label: 'Full Time' },
      { value: 'part_time', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
    ], default: 'full_time' },
  ],
  expenses: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'period', label: 'Period', type: 'select', options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annual', label: 'Annual' },
    ], default: 'monthly' },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'insurance', label: 'Insurance' },
      { value: 'utilities', label: 'Utilities' },
      { value: 'office', label: 'Office' },
      { value: 'subscriptions', label: 'Subscriptions' },
      { value: 'professional_services', label: 'Professional Services' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'travel', label: 'Travel' },
      { value: 'supplies', label: 'Supplies' },
      { value: 'other', label: 'Other' },
    ], default: 'other' },
    { key: 'cost_type', label: 'Cost Type', type: 'select', options: [
      { value: 'overhead', label: 'Overhead' },
      { value: 'cogs', label: 'COGS' },
    ], default: 'overhead' },
  ],
  assets: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'equipment', label: 'Equipment' },
      { value: 'property', label: 'Property' },
      { value: 'software_license', label: 'Software License' },
      { value: 'tools', label: 'Tools' },
      { value: 'other', label: 'Other' },
    ], default: 'equipment' },
    { key: 'purchase_cost', label: 'Purchase Cost', type: 'number', required: true },
    { key: 'useful_life_years', label: 'Useful Life (years)', type: 'number' },
    { key: 'salvage_value', label: 'Salvage Value', type: 'number' },
    { key: 'monthly_maintenance_cost', label: 'Monthly Maintenance', type: 'number' },
  ],
  liabilities: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'loan', label: 'Loan' },
      { value: 'line_of_credit', label: 'Line of Credit' },
      { value: 'accounts_payable', label: 'Accounts Payable' },
      { value: 'lease', label: 'Lease' },
      { value: 'other', label: 'Other' },
    ], default: 'loan' },
    { key: 'principal_amount', label: 'Principal Amount', type: 'number', required: true },
    { key: 'interest_rate', label: 'Interest Rate (%)', type: 'number' },
    { key: 'monthly_payment', label: 'Monthly Payment', type: 'number', required: true },
  ],
  vehicles: [
    { key: 'make', label: 'Make', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text', required: true },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'purchase_cost', label: 'Purchase Cost', type: 'number', required: true },
    { key: 'useful_life_years', label: 'Useful Life (years)', type: 'number' },
    { key: 'salvage_value', label: 'Salvage Value', type: 'number' },
    { key: 'monthly_insurance_cost', label: 'Monthly Insurance', type: 'number' },
    { key: 'monthly_fuel_cost', label: 'Monthly Fuel', type: 'number' },
    { key: 'monthly_maintenance_cost', label: 'Monthly Maintenance', type: 'number' },
  ],
};

function getDefaults(category) {
  const obj = {};
  (FIELDS_BY_CATEGORY[category] || []).forEach(f => {
    if (f.type === 'select') obj[f.key] = f.default || '';
    else if (f.type === 'number') obj[f.key] = '';
    else obj[f.key] = '';
  });
  return obj;
}

export { FIELDS_BY_CATEGORY };

export default function CustomItemForm({ category, onAdd, editingItem, onSaveEdit, onCancelEdit }) {
  const [open, setOpen] = useState(false);
  const isEditing = !!editingItem;
  const [form, setForm] = useState(() => isEditing ? (() => {
    const obj = {};
    (FIELDS_BY_CATEGORY[category] || []).forEach(f => {
      obj[f.key] = editingItem[f.key] !== undefined ? String(editingItem[f.key]) : (f.type === 'select' ? (f.default || '') : '');
    });
    return obj;
  })() : getDefaults(category));

  // Sync form when editingItem changes
  React.useEffect(() => {
    if (editingItem) {
      const obj = {};
      (FIELDS_BY_CATEGORY[category] || []).forEach(f => {
        obj[f.key] = editingItem[f.key] !== undefined && editingItem[f.key] !== null ? String(editingItem[f.key]) : (f.type === 'select' ? (f.default || '') : '');
      });
      setForm(obj);
      setOpen(true);
    }
  }, [editingItem]);

  const fields = FIELDS_BY_CATEGORY[category] || [];
  const visibleFields = fields.filter(f => !f.showWhen || form[f.showWhen.key] === f.showWhen.value);
  const requiredFields = visibleFields.filter(f => f.required);
  const canSubmit = requiredFields.every(f => form[f.key] !== '' && form[f.key] !== undefined) &&
    (category !== 'staff' || form.pay_type !== 'hourly' || (Number(form.hourly_rate) > 0));

  const handleSubmit = () => {
    const item = {};
    fields.forEach(f => {
      if (f.showWhen && form[f.showWhen.key] !== f.showWhen.value) return;
      if (f.type === 'number') item[f.key] = Number(form[f.key]) || 0;
      else item[f.key] = form[f.key] || (f.default || '');
    });
    // For hourly staff, compute annualized salary
    if (category === 'staff' && form.pay_type === 'hourly') {
      item.pay_type = 'hourly';
      item.salary = (Number(form.hourly_rate) || 0) * (Number(form.hours_per_week) || 0) * 52;
    }
    if (isEditing) {
      onSaveEdit(item);
    } else {
      onAdd(item);
    }
    setForm(getDefaults(category));
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
    setForm(getDefaults(category));
    if (isEditing && onCancelEdit) onCancelEdit();
  };

  if (!open && !isEditing) {
    return (
      <Button variant="outline" size="sm" className="w-full mt-2 border-dashed text-xs gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Add Custom Item
      </Button>
    );
  }

  if (!open) return null;

  return (
    <div className="mt-3 border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">{isEditing ? 'Edit Item' : 'New Custom Item'}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.filter(f => !f.showWhen || form[f.showWhen.key] === f.showWhen.value).map(f => (
          <div key={f.key} className={f.type === 'text' && f.required ? 'col-span-2 sm:col-span-1' : ''}>
            <Label className="text-[11px] text-slate-600">
              {f.label}{f.required && !f.showWhen && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            {f.type === 'select' ? (
              <Select value={form[f.key] || f.default} onValueChange={v => setForm(prev => ({ ...prev, [f.key]: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={f.type}
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="h-8 text-xs"
                placeholder={f.label}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleCancel}>
          Cancel
        </Button>
        <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700" disabled={!canSubmit} onClick={handleSubmit}>
          {isEditing ? 'Save Changes' : <><Plus className="w-3 h-3 mr-1" /> Add</>}
        </Button>
      </div>
    </div>
  );
}