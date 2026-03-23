import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export default function CEOGrossMarginDialog({ open, onOpenChange, projects, sales, gmReports }) {
  const projectData = useMemo(() => {
    const activeProjects = projects.filter(p => !['closed'].includes(p.status) && p.project_type === 'construction');

    return activeProjects.map(project => {
      const sale = sales.find(s => s.id === project.sale_id);
      const originalEstimate = sale?.estimated_margin ?? null;

      const projectReports = (gmReports || [])
        .filter(r => r.project_id === project.id)
        .sort((a, b) => b.reporting_date.localeCompare(a.reporting_date));

      const latestReport = projectReports[0] || null;
      const previousReport = projectReports[1] || null;

      const currentProjectedGM = latestReport?.projected_gross_margin_at_completion ?? null;
      const previousProjectedGM = previousReport?.projected_gross_margin_at_completion ?? null;

      const varianceToOriginal = (currentProjectedGM != null && originalEstimate != null)
        ? currentProjectedGM - originalEstimate
        : null;

      let trend = 'stable';
      if (currentProjectedGM != null && previousProjectedGM != null) {
        if (currentProjectedGM < previousProjectedGM - 0.5) trend = 'down';
        else if (currentProjectedGM > previousProjectedGM + 0.5) trend = 'up';
      }

      const actualGMToDate = latestReport?.gross_margin_percent ?? null;
      const percentComplete = latestReport?.percent_complete ?? null;

      return {
        id: project.id,
        title: project.title,
        status: project.status,
        originalEstimate,
        currentProjectedGM,
        previousProjectedGM,
        varianceToOriginal,
        trend,
        actualGMToDate,
        percentComplete,
        notes: latestReport?.notes,
        reportDate: latestReport?.reporting_date,
        hasReport: !!latestReport
      };
    }).sort((a, b) => {
      if (a.varianceToOriginal == null && b.varianceToOriginal == null) return 0;
      if (a.varianceToOriginal == null) return 1;
      if (b.varianceToOriginal == null) return -1;
      return a.varianceToOriginal - b.varianceToOriginal;
    });
  }, [projects, sales, gmReports]);

  const summary = useMemo(() => {
    const withProjections = projectData.filter(p => p.currentProjectedGM != null);
    const atRisk = projectData.filter(p => p.varianceToOriginal != null && p.varianceToOriginal < -3);
    const declining = projectData.filter(p => p.trend === 'down');
    const noReport = projectData.filter(p => !p.hasReport);

    let weightedGM = 0;
    let totalWeight = 0;
    withProjections.forEach(p => {
      weightedGM += p.currentProjectedGM;
      totalWeight += 1;
    });

    return {
      avgProjectedGM: totalWeight > 0 ? weightedGM / totalWeight : 0,
      totalProjects: projectData.length,
      atRiskCount: atRisk.length,
      decliningCount: declining.length,
      noReportCount: noReport.length
    };
  }, [projectData]);

  const statusLabels = {
    awaiting_to_be_scheduled: 'Awaiting Schedule',
    mobilization: 'Mobilization',
    active_construction: 'Active',
    substantial_completion_closeout: 'Closeout'
  };

  const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const VarianceBadge = ({ variance }) => {
    if (variance == null) return <span className="text-xs text-slate-400">—</span>;
    const color = variance >= 0 ? 'bg-green-100 text-green-700' : variance > -3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">CEO Gross Margin Overview</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Projected GM at completion vs. original sale estimates — based on PM reports
          </p>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <div className="p-3 rounded-lg bg-slate-50 border">
            <p className="text-xs text-slate-500">Avg Projected GM</p>
            <p className="text-xl font-bold text-slate-900">{summary.avgProjectedGM.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border">
            <p className="text-xs text-slate-500">Active Projects</p>
            <p className="text-xl font-bold text-slate-900">{summary.totalProjects}</p>
          </div>
          <div className={`p-3 rounded-lg border ${summary.atRiskCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-slate-500">At Risk (≥3% below est.)</p>
            <p className={`text-xl font-bold ${summary.atRiskCount > 0 ? 'text-red-700' : 'text-green-700'}`}>{summary.atRiskCount}</p>
          </div>
          <div className={`p-3 rounded-lg border ${summary.decliningCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-slate-500">Declining Trend</p>
            <p className={`text-xl font-bold ${summary.decliningCount > 0 ? 'text-amber-700' : 'text-green-700'}`}>{summary.decliningCount}</p>
          </div>
        </div>

        {summary.noReportCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {summary.noReportCount} project{summary.noReportCount > 1 ? 's have' : ' has'} no GM reports submitted yet.
          </div>
        )}

        {/* Projects Table */}
        <div className="border rounded-lg overflow-hidden mt-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs text-right">Original Est.</TableHead>
                <TableHead className="text-xs text-right">Projected GM</TableHead>
                <TableHead className="text-xs text-center">Variance</TableHead>
                <TableHead className="text-xs text-center">Trend</TableHead>
                <TableHead className="text-xs text-right">Actual GM</TableHead>
                <TableHead className="text-xs text-right">% Complete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-400 py-8">
                    No active construction projects
                  </TableCell>
                </TableRow>
              ) : (
                projectData.map(p => (
                  <TableRow key={p.id} className={p.varianceToOriginal != null && p.varianceToOriginal < -3 ? 'bg-red-50/50' : ''}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{p.title}</p>
                        {p.notes && <p className="text-xs text-slate-500 truncate max-w-[200px]">{p.notes}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{statusLabels[p.status] || p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.originalEstimate != null ? `${p.originalEstimate.toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {p.currentProjectedGM != null ? `${p.currentProjectedGM.toFixed(1)}%` : (
                        <span className="text-xs text-amber-500">No report</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <VarianceBadge variance={p.varianceToOriginal} />
                    </TableCell>
                    <TableCell className="text-center">
                      <TrendIcon trend={p.trend} />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.actualGMToDate != null ? `${p.actualGMToDate.toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.percentComplete != null ? `${p.percentComplete}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}