import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building2, Target, CheckCircle2 } from 'lucide-react';

const SALE_STATUS_LABELS = {
  feasibility: 'Feasibility',
  design_material_selections: 'Design & Materials',
  engineering_permits: 'Engineering & Permits',
  pending_construction_sale: 'Pending Construction Sale',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const PROJECT_STATUS_LABELS = {
  awaiting_to_be_scheduled: 'Awaiting Scheduling',
  mobilization: 'Mobilization',
  active_construction: 'Active Construction',
  substantial_completion_closeout: 'Closeout',
  closed: 'Closed',
};

function getJobCategory(sale, project) {
  // Closed precon (closed_won) or closed construction project
  if (sale?.sale_type === 'preconstruction' && sale?.status === 'closed_won') {
    return 'closed';
  }
  if (project?.status === 'closed') {
    return 'closed';
  }
  // Construction project past awaiting scheduling
  if (project && project.status !== 'awaiting_to_be_scheduled' && project.status !== 'closed') {
    return 'active_construction';
  }
  // Construction project awaiting scheduling
  if (project && project.status === 'awaiting_to_be_scheduled') {
    return 'awaiting_scheduling';
  }
  // Active precon sale (not closed)
  if (sale?.sale_type === 'preconstruction' && sale?.status !== 'closed_won' && sale?.status !== 'closed_lost') {
    return 'active_precon';
  }
  return 'other';
}

const CATEGORY_CONFIG = {
  active_precon: {
    label: 'Active Pre-Construction',
    icon: Briefcase,
    borderColor: 'border-blue-300',
    bgColor: 'bg-blue-50',
    badgeClass: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-500',
  },
  awaiting_scheduling: {
    label: 'Awaiting Scheduling',
    icon: Target,
    borderColor: 'border-amber-300',
    bgColor: 'bg-amber-50',
    badgeClass: 'bg-amber-100 text-amber-800',
    dotColor: 'bg-amber-500',
  },
  active_construction: {
    label: 'Active Construction',
    icon: Building2,
    borderColor: 'border-orange-300',
    bgColor: 'bg-orange-50',
    badgeClass: 'bg-orange-100 text-orange-800',
    dotColor: 'bg-orange-500',
  },
  closed: {
    label: 'Closed / Complete',
    icon: CheckCircle2,
    borderColor: 'border-emerald-300',
    bgColor: 'bg-emerald-50',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    dotColor: 'bg-emerald-500',
  },
};

const CATEGORY_ORDER = ['active_precon', 'awaiting_scheduling', 'active_construction', 'closed'];

export default function MyJobsOverview({ sales, projects, clients, displayUserId }) {
  const isUserOnSale = (s) =>
    s.assigned_to === displayUserId ||
    (s.sale_contributors || []).some((c) => c.user_id === displayUserId);

  // Get user's sales
  const mySales = sales.filter((s) => isUserOnSale(s) && s.status !== 'closed_lost');

  // Build job list
  const jobs = [];

  mySales.forEach((sale) => {
    // Find linked project if exists
    const project = projects.find((p) => p.sale_id === sale.id);
    const client = clients.find((c) => c.id === sale.client_id);
    const category = getJobCategory(sale, project);

    if (category === 'other') return;

    const statusLabel = project
      ? PROJECT_STATUS_LABELS[project.status] || project.status
      : SALE_STATUS_LABELS[sale.status] || sale.status;

    const value = project ? project.contract_value : sale.contract_value;

    jobs.push({
      id: sale.id,
      title: sale.title,
      clientName: client?.company_name || client?.contact_name || '',
      category,
      statusLabel,
      value: value || 0,
      type: project ? 'construction' : 'preconstruction',
    });
  });

  // Also check projects the user is PM of but may not be on sale
  projects.forEach((p) => {
    if (p.project_manager_id !== displayUserId) return;
    if (jobs.find((j) => j.id === mySales.find((s) => s.id === p.sale_id)?.id)) return;
    const sale = sales.find((s) => s.id === p.sale_id);
    if (!sale || isUserOnSale(sale)) return; // already handled above

    const client = clients.find((c) => c.id === p.client_id);
    const category = getJobCategory(sale, p);
    if (category === 'other') return;

    jobs.push({
      id: p.id,
      title: p.title,
      clientName: client?.company_name || client?.contact_name || '',
      category,
      statusLabel: PROJECT_STATUS_LABELS[p.status] || p.status,
      value: p.contract_value || 0,
      type: 'construction',
    });
  });

  // Group by category
  const grouped = {};
  CATEGORY_ORDER.forEach((cat) => {
    const items = jobs.filter((j) => j.category === cat);
    if (items.length > 0) grouped[cat] = items;
  });

  if (jobs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-slate-600" />
          My Jobs Overview
        </CardTitle>
        <div className="flex flex-wrap gap-3 mt-2">
          {CATEGORY_ORDER.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const count = grouped[cat]?.length || 0;
            return (
              <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
                {cfg.label} ({count})
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat];
            if (!items) return null;
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">{cfg.label}</h4>
                  <Badge variant="secondary" className={cfg.badgeClass}>
                    {items.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg border-l-4 ${cfg.borderColor} ${cfg.bgColor}`}
                    >
                      <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                      {job.clientName && (
                        <p className="text-xs text-slate-500 truncate">{job.clientName}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-slate-500">{job.statusLabel}</span>
                        {job.value > 0 && (
                          <span className="text-xs font-semibold text-slate-700">
                            ${job.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}