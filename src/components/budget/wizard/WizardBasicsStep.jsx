import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function WizardBasicsStep({ form, setForm }) {
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