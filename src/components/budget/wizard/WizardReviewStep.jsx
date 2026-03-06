import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Receipt, Wrench, CreditCard, Car, DollarSign, TrendingUp } from 'lucide-react';

const fmt = (v) => `$${Number(v || 0).toLocaleString()}`;

const annualize = (amount, period) => {
  const a = Number(amount) || 0;
  if (period === 'monthly') return a * 12;
  if (period === 'quarterly') return a * 4;
  return a;
};

export default function WizardReviewStep({ form, selections, profitSharingConfig }) {
  const revenue = Number(form.gross_revenue_projection) || 0;

  const staffBenTotal = (st) => { const b = st.benefits || []; return b.length > 0 ? b.reduce((s2, bn) => s2 + (Number(bn.amount) || 0), 0) : (st.benefits_cost || 0) + (st.hsa_cost || 0) + (st.rrsp_match_cost || 0); };
  const staffTotal = (selections.staff || []).reduce((s, i) => s + (i.salary || 0) + staffBenTotal(i) + (i.commission_amount || 0), 0);
  const getExpAnnual = (e) => e.amount_mode === 'percent_of_revenue' ? (Number(e.percent_of_revenue) || 0) / 100 * revenue : annualize(e.amount, e.period);
  const expenseTotal = (selections.expenses || []).reduce((s, i) => s + getExpAnnual(i), 0);
  const assetTotal = (selections.assets || []).reduce((s, i) => s + (i.purchase_cost || 0), 0);
  const liabilityTotal = (selections.liabilities || []).reduce((s, i) => s + (i.monthly_payment || 0) * 12, 0);
  const vehicleTotal = (selections.vehicles || []).reduce((s, i) => s + (i.purchase_cost || 0), 0);
  const totalAnnualCosts = staffTotal + expenseTotal + liabilityTotal;

  const sections = [
    { icon: Users, label: 'Staff', count: (selections.staff || []).length, total: staffTotal, color: 'text-blue-600 bg-blue-50' },
    { icon: Wrench, label: 'Assets', count: (selections.assets || []).length, total: assetTotal, color: 'text-purple-600 bg-purple-50', note: 'purchase cost' },
    { icon: CreditCard, label: 'Liabilities', count: (selections.liabilities || []).length, total: liabilityTotal, color: 'text-red-600 bg-red-50' },
    { icon: Car, label: 'Vehicles', count: (selections.vehicles || []).length, total: vehicleTotal, color: 'text-emerald-600 bg-emerald-50', note: 'purchase cost' },
    { icon: Receipt, label: 'Expenses', count: (selections.expenses || []).length, total: expenseTotal, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Review & Create</h2>
        <p className="text-sm text-slate-500">Review your budget setup before creating. You can always edit details after.</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{form.name || 'Untitled Budget'}</h3>
            <p className="text-sm text-slate-500">FY {form.fiscal_year}</p>
          </div>
          <Badge className="bg-slate-200 text-slate-700">Draft</Badge>
        </div>
        {form.description && <p className="text-sm text-slate-600">{form.description}</p>}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-xs text-slate-500">Gross Revenue</p>
            <p className="text-lg font-bold text-slate-900">{revenue ? fmt(revenue) : '—'}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-xs text-slate-500">Net Profit Target</p>
            <p className="text-lg font-bold text-emerald-600">
              {form.net_profit_target_percentage ? `${form.net_profit_target_percentage}%` : '—'}
              {revenue && form.net_profit_target_percentage && (
                <span className="text-sm font-normal text-slate-500 ml-1">
                  ({fmt(revenue * Number(form.net_profit_target_percentage) / 100)})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Items to Create</h3>
        {sections.map(({ icon: Icon, label, count, total, color, note }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-900">{label}</span>
              <span className="text-xs text-slate-400 ml-2">{count} item{count !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-sm font-medium text-slate-700">
              {fmt(total)}{note ? <span className="text-xs text-slate-400 ml-1">({note})</span> : '/yr'}
            </span>
          </div>
        ))}
      </div>

      {revenue > 0 && totalAnnualCosts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Quick Estimate</span>
          </div>
          <p className="text-sm text-amber-700">
            Estimated annual operating costs (staff + expenses + liabilities): <strong>{fmt(totalAnnualCosts)}</strong>
            <span className="ml-1">({(totalAnnualCosts / revenue * 100).toFixed(1)}% of projected revenue)</span>
          </p>
        </div>
      )}

      {/* Profit Sharing Summary */}
      {profitSharingConfig && (Number(profitSharingConfig.company_retention_amount) > 0 || (profitSharingConfig.distribution_tiers || []).length > 0) && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Profit Sharing Plan
          </h3>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">Company Retention</span>
              <span className="font-semibold text-emerald-800">{fmt(profitSharingConfig.company_retention_amount)}</span>
            </div>
            {(profitSharingConfig.distribution_tiers || []).map((tier, idx) => (
              <div key={tier.id || idx} className="flex justify-between text-sm">
                <span className="text-emerald-700">
                  {idx + 1}. {tier.name || 'Untitled'}
                  <span className="text-emerald-500 ml-1">
                    ({tier.type === 'fixed_amount' ? fmt(tier.value) : `${tier.value || 0}%`})
                  </span>
                </span>
                <span className="text-xs text-emerald-600">{(tier.recipients || []).length} recipient{(tier.recipients || []).length !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}