import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X } from 'lucide-react';

const SUGGESTED_DEPARTMENTS = [
  'Sales',
  'Marketing',
  'Operations',
  'Pre-Construction',
  'Administration',
  'Finance',
  'Design',
  'Human Resources',
  'IT',
  'Executive',
];

export default function WizardBasicsStep({ form, setForm }) {
  const [customDept, setCustomDept] = useState('');
  const departments = form.departments || [];

  const toggleDept = (dept) => {
    setForm(f => {
      const current = f.departments || [];
      return {
        ...f,
        departments: current.includes(dept) ? current.filter(d => d !== dept) : [...current, dept],
      };
    });
  };

  const addCustomDept = () => {
    const trimmed = customDept.trim();
    if (trimmed && !departments.includes(trimmed)) {
      setForm(f => ({ ...f, departments: [...(f.departments || []), trimmed] }));
    }
    setCustomDept('');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Budget Basics</h2>
        <p className="text-sm text-slate-500">Set the name, fiscal year, and revenue targets for this budget.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Budget Name *</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., 2027 Annual Budget"
          />
        </div>
        <div>
          <Label>Fiscal Year *</Label>
          <Input
            type="number"
            value={form.fiscal_year}
            onChange={e => setForm(f => ({ ...f, fiscal_year: parseInt(e.target.value) || '' }))}
          />
        </div>
      </div>

      <div>
        <Label>Description (optional)</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Notes about this budget..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Gross Revenue Projection ($)</Label>
          <Input
            type="number"
            value={form.gross_revenue_projection}
            onChange={e => setForm(f => ({ ...f, gross_revenue_projection: e.target.value }))}
            placeholder="e.g., 5000000"
          />
        </div>
        <div>
          <Label>Net Profit Target (%)</Label>
          <Input
            type="number"
            value={form.net_profit_target_percentage}
            onChange={e => setForm(f => ({ ...f, net_profit_target_percentage: e.target.value }))}
            placeholder="e.g., 15"
          />
        </div>
      </div>

      {/* Departments */}
      <div className="space-y-3">
        <div>
          <Label>Departments</Label>
          <p className="text-xs text-slate-500 mt-0.5">Select which departments to include in this budget.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_DEPARTMENTS.map(dept => {
            const selected = departments.includes(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => toggleDept(dept)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selected
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                  {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                {dept}
              </button>
            );
          })}
          {/* Custom departments that aren't in suggestions */}
          {departments.filter(d => !SUGGESTED_DEPARTMENTS.includes(d)).map(dept => (
            <span
              key={dept}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 border border-blue-300 text-blue-800"
            >
              {dept}
              <button type="button" onClick={() => toggleDept(dept)} className="hover:text-blue-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customDept}
            onChange={e => setCustomDept(e.target.value)}
            placeholder="Add custom department..."
            className="max-w-xs h-8 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomDept(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomDept} disabled={!customDept.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {form.gross_revenue_projection && form.net_profit_target_percentage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
          <span className="text-emerald-700">Target Net Profit: </span>
          <span className="font-bold text-emerald-800">
            ${Math.round((Number(form.gross_revenue_projection) || 0) * (Number(form.net_profit_target_percentage) || 0) / 100).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}