import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function Row({ label, value, bold, indent, variant }) {
  const fmt = (v) => {
    if (v == null) return '—';
    const neg = v < 0;
    return `${neg ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const colorClass = variant === 'positive' ? 'text-emerald-600' : variant === 'negative' ? 'text-red-600' : 'text-slate-900';

  return (
    <div className={`flex justify-between py-2 ${bold ? 'font-semibold border-t border-slate-300' : ''} ${indent ? 'pl-6' : ''}`}>
      <span className="text-slate-700">{label}</span>
      <span className={colorClass}>{fmt(value)}</span>
    </div>
  );
}

export default function BudgetPLProjection({ budget, totals }) {
  const {
    grossRevenue, totalCogs, grossProfit, 
    totalStaffCost, totalAssetCost, totalAssetDepreciation,
    totalLiabilityCost, totalVehicleCost, totalVehicleDepreciation,
    lineItemOverhead, totalOverhead, netProfit, netProfitPct
  } = totals;

  const targetMet = budget?.net_profit_target_amount != null && netProfit >= budget.net_profit_target_amount;
  const targetPctMet = budget?.net_profit_target_percentage != null && netProfitPct >= budget.net_profit_target_percentage;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Gross Revenue" value={grossRevenue} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <SummaryCard label="Gross Profit" value={grossProfit} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
        <SummaryCard label="Total Overhead" value={totalOverhead} icon={<TrendingDown className="w-5 h-5" />} color="amber" />
        <SummaryCard label="Net Profit" value={netProfit} icon={netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} color={netProfit >= 0 ? 'emerald' : 'red'} subtitle={`${netProfitPct.toFixed(1)}% margin`} />
      </div>

      {/* Target Status */}
      {(budget?.net_profit_target_amount != null || budget?.net_profit_target_percentage != null) && (
        <Card className={targetMet && targetPctMet ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${targetMet && targetPctMet ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <div>
              <p className="text-sm font-semibold">{targetMet && targetPctMet ? 'On track to meet targets' : 'Below target'}</p>
              <p className="text-xs text-slate-600">
                Target: ${(budget.net_profit_target_amount || 0).toLocaleString()} ({budget.net_profit_target_percentage || 0}%) | 
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
          <Row label="Cost of Goods Sold" value={-totalCogs} variant="negative" />
          <Row label="Gross Profit" value={grossProfit} bold variant={grossProfit >= 0 ? 'positive' : 'negative'} />

          <div className="py-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-2">Overhead Breakdown</p>
          </div>
          <Row label="Staff Costs (Salary + Benefits + Taxes)" value={totalStaffCost} indent />
          <Row label="Asset Maintenance" value={totalAssetCost} indent />
          <Row label="Asset Depreciation" value={totalAssetDepreciation} indent />
          <Row label="Liability Payments" value={totalLiabilityCost} indent />
          <Row label="Vehicle Operating Costs" value={totalVehicleCost} indent />
          <Row label="Vehicle Depreciation" value={totalVehicleDepreciation} indent />
          <Row label="Other Overhead (Line Items)" value={lineItemOverhead} indent />
          <Row label="Total Overhead" value={totalOverhead} bold />

          <Row label="Net Profit" value={netProfit} bold variant={netProfit >= 0 ? 'positive' : 'negative'} />
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