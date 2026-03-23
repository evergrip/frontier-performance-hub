import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function GrossMarginReportBadge({ project, reports }) {
  if (!project || !reports) return null;

  // Only show for active projects (not awaiting or closed)
  const activeStatuses = ['mobilization', 'active_construction', 'substantial_completion_closeout'];
  if (!activeStatuses.includes(project.status)) return null;

  const projectReports = reports
    .filter(r => r.project_id === project.id)
    .sort((a, b) => b.reporting_date.localeCompare(a.reporting_date));

  const latestReport = projectReports[0];
  const latestGM = latestReport?.gross_margin_percent;

  // Find last due date (Tuesday or Friday)
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let lastDueDate = new Date(todayDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 2 || dow === 5) {
      lastDueDate = d;
      break;
    }
  }
  const lastDueDateStr = lastDueDate.toISOString().split('T')[0];

  const hasRecentReport = projectReports.some(r => r.reporting_date >= lastDueDateStr);

  if (hasRecentReport) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
        <CheckCircle2 className="w-3 h-3" /> GM {latestGM != null ? `${latestGM.toFixed(1)}%` : 'Reported'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium animate-pulse">
      <AlertTriangle className="w-3 h-3" /> GM {latestGM != null ? `${latestGM.toFixed(1)}% (Overdue)` : 'Overdue'}
    </span>
  );
}