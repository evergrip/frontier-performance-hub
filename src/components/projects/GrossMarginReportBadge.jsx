import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function GrossMarginReportBadge({ project, reports, companySettings }) {
  if (!project || !reports) return null;

  // Only show for Active Construction and Substantial Completion & Closeout
  const gmStatuses = ['active_construction', 'substantial_completion_closeout'];
  if (!gmStatuses.includes(project.status)) return null;

  const projectReports = reports
    .filter(r => r.project_id === project.id)
    .sort((a, b) => b.reporting_date.localeCompare(a.reporting_date));

  const latestReport = projectReports[0];
  const latestGM = latestReport?.gross_margin_percent;

  // Weekly due date based on configurable day (default Friday = 5)
  const dueDay = companySettings?.gm_report_due_day ?? 5;
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let lastDueDate = new Date(todayDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    if (d.getDay() === dueDay) {
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