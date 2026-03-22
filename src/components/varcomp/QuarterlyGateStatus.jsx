import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, MinusCircle, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QuarterlyGateStatus({ filterYear }) {
  const [evaluating, setEvaluating] = useState(null);
  const queryClient = useQueryClient();

  const { data: npEntries = [] } = useQuery({
    queryKey: ['netProfitEntries'],
    queryFn: () => base44.entities.NetProfitEntry.list('-fiscal_year'),
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['varCompRules'],
    queryFn: () => base44.entities.VarCompRule.list('-created_date'),
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['varCompPayouts'],
    queryFn: () => base44.entities.VarCompPayout.list('-created_date'),
  });

  const activeRule = rules.find(r => r.status === 'active' && r.effective_fiscal_year === filterYear);
  const yearEntries = npEntries.filter(e => e.fiscal_year === filterYear && e.period_type === 'quarterly');
  const yearPayouts = payouts.filter(p => p.fiscal_year === filterYear);

  // Only show quarters defined in the rule's payout schedule
  const isQuarterly = !activeRule || activeRule.payout_schedule !== 'annual';
  const activeQuarters = activeRule?.payout_quarters?.length > 0 ? activeRule.payout_quarters : [1, 2, 3, 4];

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  const getQuarterStatus = (q) => {
    const entry = yearEntries.find(e => e.period_number === q);
    if (!entry) return { status: 'no_data', label: 'No Data', entry: null };
    if (!activeRule) return { status: 'no_rule', label: 'No Active Rule', entry };

    const npPercent = entry.net_profit_percent || 0;
    const netProfitDollars = entry.net_profit_dollars || 0;
    const gateValue = activeRule.payout_gate_value || 0;
    const quarterlyFloor = (activeRule.min_net_profit_dollars || 0) / 4;

    const percentMet = npPercent > gateValue;
    const floorMet = quarterlyFloor <= 0 || netProfitDollars >= quarterlyFloor;
    const gateMet = percentMet && floorMet;

    const qPayouts = yearPayouts.filter(p => p.quarter === q);

    return {
      status: gateMet ? 'passed' : 'failed',
      label: gateMet ? 'Gate Met' : 'Gate Not Met',
      entry,
      npPercent,
      netProfitDollars,
      gateValue,
      quarterlyFloor,
      percentMet,
      floorMet,
      payoutsCreated: qPayouts.length > 0,
      payoutCount: qPayouts.length,
    };
  };

  const handleEvaluate = async (q) => {
    setEvaluating(q);
    try {
      const response = await base44.functions.invoke('evaluateQuarterProfitShare', {
        fiscal_year: filterYear,
        quarter: q,
      });
      const result = response.data;
      if (result.gate_met) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ['varCompPayouts'] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Evaluation failed');
    } finally {
      setEvaluating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quarterly Profit Share Gate Status — FY {filterYear}</CardTitle>
      </CardHeader>
      <CardContent>
        {!activeRule && (
          <p className="text-sm text-slate-500 mb-4">No active rule for FY {filterYear}. Create and activate a rule first.</p>
        )}
        {activeRule && !isQuarterly && (
          <p className="text-sm text-slate-500 mb-4">This rule is set to annual-only payouts. Quarterly evaluation is disabled.</p>
        )}
        {isQuarterly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeQuarters.map(q => {
            const qs = getQuarterStatus(q);
            return (
              <div key={q} className={`rounded-xl border p-4 space-y-2 ${
                qs.status === 'passed' ? 'border-emerald-200 bg-emerald-50' :
                qs.status === 'failed' ? 'border-red-200 bg-red-50' :
                'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Q{q}</span>
                  {qs.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {qs.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                  {(qs.status === 'no_data' || qs.status === 'no_rule') && <MinusCircle className="w-5 h-5 text-slate-400" />}
                </div>

                {qs.entry ? (
                  <div className="text-xs space-y-1">
                    <p>NP%: <span className="font-semibold">{qs.npPercent?.toFixed(1)}%</span> {activeRule && <span className="text-slate-500">/ Gate: {qs.gateValue}%</span>}</p>
                    <p>Net Profit: <span className="font-semibold">{fmt(qs.netProfitDollars)}</span></p>
                    {qs.quarterlyFloor > 0 && (
                      <p>Floor: {fmt(qs.quarterlyFloor)} {qs.floorMet ? <span className="text-emerald-600">✓</span> : <span className="text-red-500">✗</span>}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No financial data entered</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <Badge className={`text-xs ${
                    qs.status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                    qs.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {qs.label}
                  </Badge>
                  {qs.payoutsCreated && <span className="text-xs text-emerald-600">{qs.payoutCount} payouts</span>}
                </div>

                {qs.status === 'passed' && activeRule && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    disabled={evaluating === q}
                    onClick={() => handleEvaluate(q)}
                  >
                    {evaluating === q ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                    {qs.payoutsCreated ? 'Re-evaluate' : 'Generate Payouts'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        )}
      </CardContent>
    </Card>
  );
}