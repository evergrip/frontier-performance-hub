import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

function Row({ label, value, bold, indent, variant, pctOfRevenue }) {
  const fmt = (v) => {
    if (v == null) return '—';
    const neg = v < 0;
    return `${neg ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const colorClass = variant === 'positive' ? 'text-emerald-600' : variant === 'negative' ? 'text-red-600' : 'text-slate-900';

  return (
    <div className={`flex justify-between py-2 ${bold ? 'font-semibold border-t border-slate-300' : ''} ${indent ? 'pl-6' : ''}`}>
      <span className="text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        {pctOfRevenue != null && <span className="text-xs text-slate-400">{pctOfRevenue.toFixed(1)}%</span>}
        <span className={`${colorClass} min-w-[100px] text-right`}>{fmt(value)}</span>
      </div>
    </div>
  );
}

export default function BudgetPLProjection({ budget, totals, onSetRevenue }) {
  const {
    grossRevenue, totalCogs, grossProfit, 
    staffOverheadCost, staffCogsCost,
    totalAssetCost, totalAssetDepreciation,
    totalLiabilityCost, totalVehicleCost, totalVehicleDepreciation,
    lineItemOverhead, lineItemCogs, expenseOverhead, expenseCogs,
    totalOverhead, netProfit, netProfitPct
  } = totals;

  const targetAmt = budget?.net_profit_target_amount;
  const targetPct = budget?.net_profit_target_percentage;
  const hasTarget = targetAmt != null || targetPct != null;
  const targetMet = targetAmt != null && netProfit >= targetAmt;
  const targetPctMet = targetPct != null && netProfitPct >= targetPct;

  // Reverse-calculate required gross revenue to meet targets
  // Net Profit = Gross Revenue - Total COGS - Total Overhead
  // Since COGS are entered as fixed amounts: Required Revenue = Target + Overhead + COGS
  // For % target: Net Profit = Revenue * (targetPct/100), so Revenue = (Overhead + COGS) / (1 - targetPct/100)
  const fixedCosts = totalOverhead + totalCogs;
  let requiredRevenueByAmt = null;
  let requiredRevenueByPct = null;
  let requiredRevenue = null;

  if (targetAmt != null && targetAmt > 0) {
    requiredRevenueByAmt = targetAmt + fixedCosts;
  }
  if (targetPct != null && targetPct > 0 && targetPct < 100) {
    requiredRevenueByPct = fixedCosts / (1 - targetPct / 100);
  }

  // Use whichever requires more revenue (the stricter target)
  if (requiredRevenueByAmt != null && requiredRevenueByPct != null) {
    requiredRevenue = Math.max(requiredRevenueByAmt, requiredRevenueByPct);
  } else {
    requiredRevenue = requiredRevenueByAmt || requiredRevenueByPct;
  }

  const revenueGap = requiredRevenue != null ? requiredRevenue - grossRevenue : null;

  const fmt$ = (v) => `$${Math.abs(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Gross Revenue" value={grossRevenue} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <SummaryCard label="Gross Profit" value={grossProfit} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
        <SummaryCard label="Total Overhead" value={totalOverhead} icon={<TrendingDown className="w-5 h-5" />} color="amber" />
        <SummaryCard label="Net Profit" value={netProfit} icon={netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} color={netProfit >= 0 ? 'emerald' : 'red'} subtitle={`${netProfitPct.toFixed(1)}% margin`} />
      </div>

      {/* Required Revenue to Meet Goal */}
      {hasTarget && requiredRevenue != null && (
        <Card className={revenueGap <= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-blue-300 bg-blue-50'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${revenueGap <= 0 ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                <Target className={`w-5 h-5 ${revenueGap <= 0 ? 'text-emerald-600' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {revenueGap <= 0 ? 'Revenue target met!' : 'Revenue Required to Hit Net Profit Goal'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-slate-500">Required Revenue</p>
                    <p className="text-sm font-bold text-slate-900">{fmt$(requiredRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Current Projection</p>
                    <p className="text-sm font-bold text-slate-900">{fmt$(grossRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{revenueGap > 0 ? 'Gap' : 'Surplus'}</p>
                    <p className={`text-sm font-bold ${revenueGap > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {revenueGap > 0 ? '+' : '-'}{fmt$(Math.abs(revenueGap))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Net Profit Target</p>
                    <p className="text-sm font-bold text-slate-900">
                      {targetAmt != null ? fmt$(targetAmt) : ''}{targetAmt != null && targetPct != null ? ' / ' : ''}{targetPct != null ? `${targetPct}%` : ''}
                    </p>
                  </div>
                </div>
                {revenueGap > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-xs text-slate-500 flex-1">
                      Based on your current fixed costs ({fmt$(fixedCosts)}), you need {fmt$(requiredRevenue)} in gross revenue to achieve your net profit goal.
                    </p>
                    {onSetRevenue && (
                      <Button
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => onSetRevenue(Math.ceil(requiredRevenue))}
                      >
                        Set as Gross Revenue
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Target Status */}
      {hasTarget && (
        <Card className={targetMet && targetPctMet ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${targetMet && targetPctMet ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <div>
              <p className="text-sm font-semibold">{targetMet && targetPctMet ? 'On track to meet targets' : 'Below target'}</p>
              <p className="text-xs text-slate-600">
                Target: ${(targetAmt || 0).toLocaleString()} ({targetPct || 0}%) | 
                Projected: ${netProfit.toLocaleString()} ({netProfitPct.toFixed(1)}%)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* P/L Statement */}
      <Card>
        <CardHeader><CardTitle>Profit & Loss Projection</CardTitle></CardHeader>
        <CardContent className="divide-y divide-slate-100">
          <Row label="Gross Revenue" value={grossRevenue} bold />
          
          <div className="py-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-2">Cost of Goods Sold Breakdown</p>
          </div>
          <Row label="Base COGS Projection" value={budget?.cost_of_goods_sold_projection || 0} indent pctOfRevenue={grossRevenue > 0 ? (budget?.cost_of_goods_sold_projection || 0) / grossRevenue * 100 : null} />
          {staffCogsCost > 0 && <Row label="Staff — COGS" value={staffCogsCost} indent pctOfRevenue={grossRevenue > 0 ? staffCogsCost / grossRevenue * 100 : null} />}
          {(expenseCogs || 0) > 0 && <Row label="Expenses — COGS" value={expenseCogs} indent pctOfRevenue={grossRevenue > 0 ? expenseCogs / grossRevenue * 100 : null} />}
          {lineItemCogs > 0 && <Row label="Line Item COGS" value={lineItemCogs} indent pctOfRevenue={grossRevenue > 0 ? lineItemCogs / grossRevenue * 100 : null} />}
          <Row label="Total Cost of Goods Sold" value={totalCogs} bold pctOfRevenue={grossRevenue > 0 ? totalCogs / grossRevenue * 100 : null} />
          <Row label="Gross Profit" value={grossProfit} bold variant={grossProfit >= 0 ? 'positive' : 'negative'} pctOfRevenue={grossRevenue > 0 ? grossProfit / grossRevenue * 100 : null} />

          <div className="py-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-2">Overhead Breakdown</p>
          </div>
          <Row label="Staff — Overhead" value={staffOverheadCost} indent pctOfRevenue={grossRevenue > 0 ? staffOverheadCost / grossRevenue * 100 : null} />
          <Row label="Asset Maintenance" value={totalAssetCost} indent pctOfRevenue={grossRevenue > 0 ? totalAssetCost / grossRevenue * 100 : null} />
          <Row label="Asset Depreciation" value={totalAssetDepreciation} indent pctOfRevenue={grossRevenue > 0 ? totalAssetDepreciation / grossRevenue * 100 : null} />
          <Row label="Liability Payments" value={totalLiabilityCost} indent pctOfRevenue={grossRevenue > 0 ? totalLiabilityCost / grossRevenue * 100 : null} />
          <Row label="Vehicle Operating Costs" value={totalVehicleCost} indent pctOfRevenue={grossRevenue > 0 ? totalVehicleCost / grossRevenue * 100 : null} />
          <Row label="Vehicle Depreciation" value={totalVehicleDepreciation} indent pctOfRevenue={grossRevenue > 0 ? totalVehicleDepreciation / grossRevenue * 100 : null} />
          {(expenseOverhead || 0) > 0 && <Row label="Expenses — Overhead" value={expenseOverhead} indent pctOfRevenue={grossRevenue > 0 ? expenseOverhead / grossRevenue * 100 : null} />}
          <Row label="Other Overhead (Line Items)" value={lineItemOverhead} indent pctOfRevenue={grossRevenue > 0 ? lineItemOverhead / grossRevenue * 100 : null} />
          <Row label="Total Overhead" value={totalOverhead} bold pctOfRevenue={grossRevenue > 0 ? totalOverhead / grossRevenue * 100 : null} />

          <Row label="Net Profit" value={netProfit} bold variant={netProfit >= 0 ? 'positive' : 'negative'} pctOfRevenue={grossRevenue > 0 ? netProfit / grossRevenue * 100 : null} />
          <Row label="Net Profit Margin" value={null} />
          <div className="flex justify-between py-2 font-semibold">
            <span className="text-slate-700">Net Profit Margin</span>
            <span className={netProfitPct >= 0 ? 'text-emerald-600' : 'text-red-600'}>{netProfitPct.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon, color, subtitle }) {
  const fmt = (v) => `$${Math.abs(v || 0).toLocaleString()}`;
  const bgMap = { blue: 'bg-blue-50', emerald: 'bg-emerald-50', amber: 'bg-amber-50', red: 'bg-red-50' };
  const textMap = { blue: 'text-blue-600', emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' };
  const iconBg = { blue: 'bg-blue-100', emerald: 'bg-emerald-100', amber: 'bg-amber-100', red: 'bg-red-100' };

  return (
    <Card className={bgMap[color]}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg[color]} flex items-center justify-center ${textMap[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-lg font-bold ${textMap[color]}`}>{value < 0 ? '-' : ''}{fmt(value)}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}