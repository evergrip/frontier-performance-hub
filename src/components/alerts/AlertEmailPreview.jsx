import React from 'react';
import { Mail } from 'lucide-react';

const ENTITY_LABELS = { Lead: 'Lead', Sale: 'Pre-Construction Sale', Project: 'Construction Project' };

const SAMPLE_EVENTS = {
  Lead: { any_status_change: 'Lead "Smith Residence" moved from New Project Lead → Preconstruction Proposal', status_change: 'Lead "Smith Residence" moved from Follow-Up → Converted', record_created: 'New Lead created: "Johnson Kitchen Reno"' },
  Sale: { any_status_change: 'Pre-Construction Sale "Smith Residence" moved from Feasibility → Design & Materials', status_change: 'Pre-Construction Sale "Smith Residence" moved from Engineering & Permits → Pending Construction Sale', record_created: 'New Pre-Construction Sale created: "Johnson Kitchen Reno"' },
  Project: { any_status_change: 'Construction Project "Smith Residence" moved from Mobilization → Active Construction', status_change: 'Construction Project "Smith Residence" moved from Active Construction → Closeout', record_created: 'New Construction Project created: "Johnson Kitchen Reno"' },
};

export default function AlertEmailPreview({ deliveryMethod, subjectTemplate, introText, triggers, alertName }) {
  const firstTrigger = triggers?.[0] || { entity_type: 'Lead', event_type: 'any_status_change' };
  const sampleEvent = SAMPLE_EVENTS[firstTrigger.entity_type]?.[firstTrigger.event_type] || 'Lead "Example" changed status';

  const isDigest = deliveryMethod === 'daily_digest';

  const subject = isDigest
    ? (subjectTemplate || 'Daily Alert Digest — {count} updates').replace('{count}', '3').replace('{event}', sampleEvent)
    : (subjectTemplate || 'Alert: {event}').replace('{event}', sampleEvent).replace('{count}', '1');

  const intro = introText || (isDigest
    ? 'You have 3 updates from your alert rules:'
    : sampleEvent);

  // Build sample digest rows from all triggers
  const digestRows = triggers?.map((t, i) => {
    const ev = SAMPLE_EVENTS[t.entity_type]?.[t.event_type] || `${ENTITY_LABELS[t.entity_type]} status changed`;
    return { type: ENTITY_LABELS[t.entity_type] || t.entity_type, event: ev };
  }) || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Mail className="w-4 h-4" />
        <span>Email Preview (sample data)</span>
      </div>

      {/* Subject line */}
      <div className="bg-slate-100 rounded-lg p-3">
        <p className="text-xs text-slate-400 mb-1">Subject:</p>
        <p className="font-medium text-slate-800 text-sm">{subject}</p>
      </div>

      {/* Email body preview */}
      <div className="border rounded-lg overflow-hidden">
        <div style={{ background: '#ea7924', color: 'white', padding: '12px 20px' }}>
          <h3 className="font-bold text-base m-0">{isDigest ? '📋 Daily Alert Digest' : '🔔 Alert Notification'}</h3>
        </div>
        <div className="p-5 bg-white">
          <p className="text-sm text-slate-700 mb-3">{intro}</p>

          {isDigest ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2 text-xs text-slate-500 border-b-2 border-slate-200">Type</th>
                  <th className="text-left p-2 text-xs text-slate-500 border-b-2 border-slate-200">Event</th>
                </tr>
              </thead>
              <tbody>
                {digestRows.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 text-slate-500 border-b border-slate-100 text-xs">{row.type}</td>
                    <td className="p-2 text-slate-800 border-b border-slate-100 text-xs">{row.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm font-medium text-slate-900">{sampleEvent}</p>
          )}

          <p className="text-xs text-slate-400 mt-3">Alert Rule: {alertName || 'Unnamed'}</p>
          <hr className="my-3 border-slate-200" />
          <p className="text-xs text-slate-400">You are receiving this because of an alert rule you set up. You can manage your alerts in the app.</p>
        </div>
      </div>
    </div>
  );
}