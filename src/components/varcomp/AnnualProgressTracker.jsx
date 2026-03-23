import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, Minus } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function AnnualProgressTracker({ filterYear, showPayoutInfo, userId }) {
  const { data: npEntries = [] } = useQuery({
    queryKey: ['npEntriesForTracker', filterYear],
    queryFn: () => base44.entities.NetProfitEntry.filter({ fiscal_year: filterYear }),
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['varCompRules'],
    queryFn: () => base44.entities.VarCompRule.list('-created_date'),
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['varCompPayoutsTracker', userId],
    queryFn: () => userId
      ? base44.entities.VarCompPayout.filter({ user_id: userId, fiscal_year: filterYear })
      : base44.entities.VarCompPayout.filter({ fiscal_year: filterYear }),
    enabled: !!showPayoutInfo,
  });

  const activeRule = rules.find(r => r.status === 'active' && r.effective_fiscal_year === filterYear);
  const annualFloor = activeRule?.min_net_profit_dollars || 0;
  const gatePercent = activeRule?.payout_gate_value || 0;

  // Build quarterly cumulative data from monthly entries
  const monthlyEntries = npEntries.filter(e => e.period_type === 'monthly').sort((a, b) => a.period_number - b.period_number);
  const quarterlyEntries = npEntries.filter(e => e.period_type === 'quarterly').sort((a, b) => a.period_number - b.period_number);

  // Build cumulative actuals by quarter
  const quarterActuals = [0, 0, 0, 0];
  const quarterRevenue = [0, 0, 0, 0];

  // Prefer monthly data rolled up, fall back to quarterly entries
  if (monthlyEntries.length > 0) {
    monthlyEntries.forEach(e => {
      const qi = Math.ceil(e.period_number / 3) - 1;
      if (qi >= 0 && qi < 4) {
        quarterActuals[qi] += (e.net_profit_dollars || 0);
        quarterRevenue[qi] += (e.total_revenue || 0);
      }
    });
  } else {
    quarterlyEntries.forEach(e => {
      const qi = e.period_number - 1;
      if (qi >= 0 && qi < 4) {
        quarterActuals[qi] = e.net_profit_dollars || 0;
        quarterRevenue[qi] = e.total_revenue || 0;
      }
    });
  }

  // Cumulative actuals
  const cumulativeActual = [0, 0, 0, 0];
  const cumulativeRevenue = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    cumulativeActual[i] = (i > 0 ? cumulativeActual[i - 1] : 0) + quarterActuals[i];
    cumulativeRevenue[i] = (i > 0 ? cumulativeRevenue[i - 1] : 0) + quarterRevenue[i];
  }

  // Quarterly benchmarks — evenly distributed annual floor
  const benchmarks = [0.25, 0.50, 0.75, 1.0].map(pct => annualFloor * pct);

  // Find the latest quarter with data
  const now = new Date();
  const currentMonth = now.getFullYear() === filterYear ? now.getMonth() + 1 : 12;
  const currentQuarter = Math.min(Math.ceil(currentMonth / 3), 4);

  // Determine which quarters have data
  const latestDataQuarter = (() => {
    for (let i = 3; i >= 0; i--) {
      if (quarterActuals[i] !== 0 || quarterRevenue[i] !== 0) return i + 1;
    }
    return 0;
  })();

  const displayQuarter = Math.max(latestDataQuarter, 1);

  // Overall progress
  const currentCumulative = cumulativeActual[displayQuarter - 1] || 0;
  const currentBenchmark = benchmarks[displayQuarter - 1] || 0;
  const variance = currentCumulative - currentBenchmark;
  const variancePercent = currentBenchmark > 0 ? (variance / currentBenchmark) * 100 : 0;
  const isAhead = variance >= 0;
  const onTrack = currentCumulative >= currentBenchmark;

  // Calculate actual NP% cumulative
  const totalCumRev = cumulativeRevenue[displayQuarter - 1] || 0;
  const actualNpPercent = totalCumRev > 0 ? (currentCumulative / totalCumRev) * 100 : 0;

  // Total payout earned this year
  const yearPayoutTotal = showPayoutInfo
    ? payouts.reduce((s, p) => s + (p.final_payout_amount || 0), 0)
    : 0;

  // Bar chart max value
  const maxVal = Math.max(annualFloor, cumulativeActual[3] || cumulativeActual[displayQuarter - 1], 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          Profit Share Progress — FY {filterYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!activeRule ? (
          <p className="text-sm text-slate-500">No active profit share rule for FY {filterYear}.</p>
        ) : (
          <>
            {/* Summary banner */}
            <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              onTrack ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                {onTrack ? (
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                ) : variance === 0 && currentCumulative === 0 ? (
                  <Minus className="w-6 h-6 text-slate-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${onTrack ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {latestDataQuarter === 0
                      ? 'No data entered yet'
                      : onTrack
                        ? `On track — ${fmt(Math.abs(variance))} ahead of Q${displayQuarter} benchmark`
                        : `${fmt(Math.abs(variance))} behind Q${displayQuarter} benchmark`
                    }
                  </p>
                  <p className="text-xs text-slate-500">
                    Annual target: {fmt(annualFloor)} net profit at {gatePercent}%+ NP%
                    {totalCumRev > 0 && ` · YTD NP%: ${actualNpPercent.toFixed(1)}%`}
                  </p>
                </div>
              </div>
              {showPayoutInfo && yearPayoutTotal > 0 && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">YTD Profit Share Earned</p>
                  <p className="text-lg font-bold text-emerald-700">{fmt(yearPayoutTotal)}</p>
                </div>
              )}
            </div>

            {/* Quarterly progress bars */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map(q => {
                const qi = q - 1;
                const actual = cumulativeActual[qi];
                const benchmark = benchmarks[qi];
                const hasData = q <= latestDataQuarter;
                const isFuture = q > displayQuarter && !hasData;
                const barActual = maxVal > 0 ? Math.min((actual / maxVal) * 100, 100) : 0;
                const barBenchmark = maxVal > 0 ? Math.min((benchmark / maxVal) * 100, 100) : 0;
                const qAhead = actual >= benchmark;

                return (
                  <div key={q} className={`${isFuture ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${q === displayQuarter ? 'text-amber-600' : 'text-slate-700'}`}>
                          Q{q} {q === displayQuarter && latestDataQuarter > 0 && '←'}
                        </span>
                        {hasData && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            qAhead ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {qAhead ? '+' : ''}{fmt(actual - benchmark)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-medium">{hasData ? fmt(actual) : '—'}</span>
                        <span className="mx-1">/</span>
                        <span>{fmt(benchmark)}</span>
                      </div>
                    </div>
                    <div className="relative h-7 bg-slate-100 rounded-full overflow-hidden">
                      {/* Actual bar */}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                          hasData
                            ? qAhead ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : 'bg-slate-200'
                        }`}
                        style={{ width: `${hasData ? barActual : 0}%` }}
                      />
                      {/* Benchmark marker */}
                      <div
                        className="absolute inset-y-0 w-0.5 bg-slate-900/40"
                        style={{ left: `${barBenchmark}%` }}
                      >
                        <div className="absolute -top-0.5 -left-1 w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                <span>Cumulative Net Profit (actual)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-slate-900/40 relative">
                  <div className="absolute -top-1 -left-0.5 w-2 h-2 rounded-full bg-slate-600" />
                </div>
                <span>Quarterly benchmark</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}