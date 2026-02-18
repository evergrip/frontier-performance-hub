import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

/**
 * Runs audit checks on a file (lead → sale → project chain) before closing.
 * 
 * Props:
 *  - sale: the Sale record being closed/converted
 *  - project: (optional) the Project record, for construction closeout
 *  - lead: (optional) the linked Lead record
 *  - client: (optional) the linked Client record
 *  - users: array of User records (for contributor validation)
 *  - commissionTransactions: array of CommissionTransaction records for this sale
 *  - mode: 'construction_closeout' | 'convert_to_construction' | 'finalize_precon'
 */

const STATUS_LABELS = {
  new_project_lead: 'New Project Lead',
  initial_video_consult: 'Video Consult',
  initial_inperson_consultation: 'In-Person Consult',
  preconstruction_proposal: 'Proposal',
  followup: 'Follow-up',
  converted: 'Converted',
  feasibility: 'Feasibility',
  design_material_selections: 'Design & Materials',
  engineering_permits: 'Engineering & Permits',
  pending_construction_sale: 'Pending Construction',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  awaiting_to_be_scheduled: 'Awaiting to be Scheduled',
  mobilization: 'Mobilization',
  active_construction: 'Active Construction',
  substantial_completion_closeout: 'Substantial Completion & Closeout',
  closed: 'Closed',
};

function getChecks({ sale, project, lead, client, users, commissionTransactions, mode }) {
  const checks = [];

  // --- CLIENT checks ---
  checks.push({
    label: 'Client linked',
    pass: !!sale?.client_id,
    detail: client ? (client.company_name || client.contact_name) : 'No client linked',
  });

  if (client) {
    checks.push({
      label: 'Client contact name',
      pass: !!client.contact_name,
      detail: client.contact_name || 'Missing',
    });
    checks.push({
      label: 'Client email or phone',
      pass: !!(client.email || client.phone),
      detail: [client.email, client.phone].filter(Boolean).join(', ') || 'Missing',
    });
  }

  // --- LEAD checks ---
  if (lead) {
    checks.push({
      label: 'Lead source recorded',
      pass: !!lead.source,
      detail: lead.source || 'Missing',
    });
    const leadHistory = lead.status_history || [];
    checks.push({
      label: 'Lead has timeline entries',
      pass: leadHistory.length > 0,
      detail: leadHistory.length > 0 ? `${leadHistory.length} entries` : 'No lead history',
    });
    // Check each lead history entry has a valid date
    const leadDatesValid = leadHistory.every(h => h.entered_date && !isNaN(new Date(h.entered_date).getTime()));
    if (leadHistory.length > 0) {
      checks.push({
        label: 'Lead timeline dates valid',
        pass: leadDatesValid,
        detail: leadDatesValid ? 'All dates valid' : 'Some dates missing or invalid',
      });
    }
  }

  // --- SALE checks ---
  const saleHistory = sale?.phase_history || [];
  checks.push({
    label: 'Sale has timeline entries',
    pass: saleHistory.length > 0,
    detail: saleHistory.length > 0 ? `${saleHistory.length} entries` : 'No sale history',
  });
  const saleDatesValid = saleHistory.every(h => h.entered_date && !isNaN(new Date(h.entered_date).getTime()));
  if (saleHistory.length > 0) {
    checks.push({
      label: 'Sale timeline dates valid',
      pass: saleDatesValid,
      detail: saleDatesValid ? 'All dates valid' : 'Some dates missing or invalid',
    });
  }

  checks.push({
    label: 'Sale contract value set',
    pass: !!(sale?.contract_value && sale.contract_value > 0),
    detail: sale?.contract_value ? `$${sale.contract_value.toLocaleString()}` : 'Missing',
  });

  checks.push({
    label: 'Sale assigned to someone',
    pass: !!sale?.assigned_to,
    detail: (() => {
      if (!sale?.assigned_to) return 'Not assigned';
      const user = (users || []).find(u => u.id === sale.assigned_to);
      return user?.full_name || sale.assigned_to;
    })(),
  });

  // Sale contributors
  const contributors = sale?.sale_contributors || [];
  checks.push({
    label: 'Sale contributors defined',
    pass: contributors.length > 0,
    detail: contributors.length > 0 ? `${contributors.length} contributor(s)` : 'No contributors — commission splits may be missing',
  });

  if (contributors.length > 0) {
    const totalSplit = contributors.reduce((sum, c) => sum + (c.commission_split || 0), 0);
    checks.push({
      label: 'Commission splits total 100%',
      pass: totalSplit === 100,
      detail: `${totalSplit}%`,
    });
  }

  // --- COMMISSION checks ---
  const txns = commissionTransactions || [];
  checks.push({
    label: 'Commission transaction(s) exist',
    pass: txns.length > 0,
    detail: txns.length > 0 ? `${txns.length} transaction(s)` : 'No commission recorded',
  });

  // --- PROJECT checks (construction closeout only) ---
  if (mode === 'construction_closeout' && project) {
    const projectHistory = project.status_history || [];
    checks.push({
      label: 'Project has timeline entries',
      pass: projectHistory.length > 0,
      detail: projectHistory.length > 0 ? `${projectHistory.length} entries` : 'No project history',
    });
    const projDatesValid = projectHistory.every(h => h.entered_date && !isNaN(new Date(h.entered_date).getTime()));
    if (projectHistory.length > 0) {
      checks.push({
        label: 'Project timeline dates valid',
        pass: projDatesValid,
        detail: projDatesValid ? 'All dates valid' : 'Some dates missing or invalid',
      });
    }

    checks.push({
      label: 'Project start date set',
      pass: !!project.start_date,
      detail: project.start_date || 'Missing',
    });
  }

  return checks;
}

export default function FileAuditChecklist({ sale, project, lead, client, users, commissionTransactions, mode }) {
  const checks = getChecks({ sale, project, lead, client, users, commissionTransactions, mode });
  const failCount = checks.filter(c => !c.pass).length;
  const allPass = failCount === 0;

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${allPass ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        {allPass ? (
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        )}
        <div>
          <p className={`text-sm font-semibold ${allPass ? 'text-emerald-800' : 'text-amber-800'}`}>
            {allPass ? 'File Audit Passed' : `${failCount} item${failCount > 1 ? 's' : ''} need attention`}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {allPass ? 'All required data is complete.' : 'Resolve these before closing to ensure reporting accuracy.'}
          </p>
        </div>
      </div>

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 text-xs">
            {check.pass ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            <span className={`font-medium ${check.pass ? 'text-slate-700' : 'text-red-700'}`}>{check.label}</span>
            <span className="text-slate-400 ml-auto truncate max-w-[180px]">{check.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { getChecks };