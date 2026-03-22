import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

export default function MyQuarterlyScorecard({ userId, filterYear }) {
  const { data: payouts = [] } = useQuery({
    queryKey: ['myProfitSharePayouts', userId],
    queryFn: () => base44.entities.VarCompPayout.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const { data: npEntries = [] } = useQuery({
    queryKey: ['publicNpEntries', filterYear],
    queryFn: () => base44.entities.NetProfitEntry.filter({ period_type: 'quarterly', fiscal_year: filterYear }),
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['varCompRules'],
    queryFn: () => base44.entities.VarCompRule.list('-created_date'),
  });

  const activeRule = rules.find(r => r.status === 'active' && r.effective_fiscal_year === filterYear);
  const isQuarterly = !activeRule || activeRule.payout_schedule !== 'annual';
  const activeQuarters = activeRule?.payout_quarters?.length > 0 ? activeRule.payout_quarters : [1, 2, 3, 4];

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  const getQuarterInfo = (q) => {
    const entry = npEntries.find(e => e.period_number === q && e.fiscal_year === filterYear);
    const qPayouts = payouts.filter(p => p.fiscal_year === filterYear && p.quarter === q);
    const totalPayout = qPayouts.reduce((s, p) => s + (p.final_payout_amount || 0), 0);

    if (!entry) return { status: 'pending', totalPayout: 0, payouts: [] };

    if (qPayouts.length > 0) {
      return { status: 'passed', totalPayout, payouts: qPayouts };
    }

    // Entry exists but no payouts — gate was not met
    return { status: 'failed', totalPayout: 0, payouts: [] };
  };

  const yearTotal = payouts
    .filter(p => p.fiscal_year === filterYear)
    .reduce((s, p) => s + (p.final_payout_amount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quarterly Profit Share Scorecard — FY {filterYear}</CardTitle>
      </CardHeader>
      <CardContent>
        {!isQuarterly && (
          <p className="text-sm text-slate-500">This year's profit sharing is evaluated annually. Quarterly breakdown is not available.</p>
        )}
        {isQuarterly && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {activeQuarters.map(q => {
            const info = getQuarterInfo(q);
            return (
              <div key={q} className={`rounded-xl border p-4 text-center space-y-2 ${
                info.status === 'passed' ? 'border-emerald-200 bg-emerald-50' :
                info.status === 'failed' ? 'border-red-200 bg-red-50' :
                'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  {info.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {info.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                  {info.status === 'pending' && <MinusCircle className="w-5 h-5 text-slate-400" />}
                  <span className="font-semibold">Q{q}</span>
                </div>
                <p className={`text-lg font-bold ${
                  info.status === 'passed' ? 'text-emerald-700' :
                  info.status === 'failed' ? 'text-red-600' :
                  'text-slate-400'
                }`}>
                  {info.status === 'passed' ? fmt(info.totalPayout) :
                   info.status === 'failed' ? 'Not Met' : '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {info.status === 'passed' ? 'Gate passed' :
                   info.status === 'failed' ? 'Gate not met' : 'Awaiting data'}
                </p>
              </div>
            );
          })}
        </div>
        )}
        <div className="mt-4 text-right">
          <span className="text-sm text-slate-500">YTD Total:</span>
          <span className="ml-2 text-lg font-bold text-slate-900">{fmt(yearTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}