import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function GrossMarginHistory({ open, onOpenChange, project, reports }) {
  if (!project) return null;

  const projectReports = (reports || [])
    .filter(r => r.project_id === project.id)
    .sort((a, b) => a.reporting_date.localeCompare(b.reporting_date));

  const chartData = projectReports.map(r => ({
    date: format(new Date(r.reporting_date + 'T00:00:00'), 'MMM d'),
    margin: r.gross_margin_percent,
    costs: r.actual_costs,
    contractValue: r.contract_value,
  }));

  // Trend indicator
  const getTrend = () => {
    if (projectReports.length < 2) return null;
    const last = projectReports[projectReports.length - 1].gross_margin_percent;
    const prev = projectReports[projectReports.length - 2].gross_margin_percent;
    const diff = last - prev;
    if (Math.abs(diff) < 0.5) return { icon: Minus, color: 'text-slate-500', label: 'Stable' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-emerald-600', label: `+${diff.toFixed(1)}%` };
    return { icon: TrendingDown, color: 'text-red-600', label: `${diff.toFixed(1)}%` };
  };

  const trend = getTrend();
  const latestMargin = projectReports.length > 0
    ? projectReports[projectReports.length - 1].gross_margin_percent
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gross Margin Trend — {project.title}</DialogTitle>
        </DialogHeader>

        {projectReports.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No gross margin reports submitted yet for this project.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Latest Margin</p>
                <p className="text-xl font-bold text-slate-900">{latestMargin?.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Reports Filed</p>
                <p className="text-xl font-bold text-slate-900">{projectReports.length}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Trend</p>
                {trend ? (
                  <div className={`flex items-center justify-center gap-1 ${trend.color}`}>
                    <trend.icon className="w-5 h-5" />
                    <span className="text-lg font-bold">{trend.label}</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-slate-400">—</p>
                )}
              </div>
            </div>

            {/* Chart */}
            {chartData.length >= 2 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600 mb-3">Margin % Over Time</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'margin') return [`${value.toFixed(1)}%`, 'Gross Margin'];
                        return [value, name];
                      }}
                    />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Report History</p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Contract Value</TableHead>
                      <TableHead className="text-xs">Actual Costs</TableHead>
                      <TableHead className="text-xs">Margin %</TableHead>
                      <TableHead className="text-xs">Margin $</TableHead>
                      <TableHead className="text-xs">% Complete</TableHead>
                      <TableHead className="text-xs">Submitted By</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...projectReports].reverse().map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {format(new Date(r.reporting_date + 'T00:00:00'), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-xs">
                          ${(r.contract_value || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          ${(r.actual_costs || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          <span className={r.gross_margin_percent >= 15 ? 'text-emerald-600' : r.gross_margin_percent >= 0 ? 'text-amber-600' : 'text-red-600'}>
                            {r.gross_margin_percent?.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          ${(r.gross_margin_dollars || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {r.percent_complete != null ? `${r.percent_complete}%` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {r.submitted_by_name || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[120px] truncate">
                          {r.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}