import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportCSVButton from '@/components/commissions/ExportCSVButton';

const STAGES = [
  ['new_project_lead', 'New Lead'], ['initial_video_consult', 'Video Consult'],
  ['initial_inperson_consultation', 'In-Person Consult'], ['preconstruction_proposal', 'Proposal'],
  ['followup', 'Follow-up'], ['converted', 'Converted'], ['disqualified', 'Disqualified'],
];

const labelFor = (status) => STAGES.find(([key]) => key === status)?.[1] || 'Unknown';
const disqualificationDate = (lead) => [...(lead.status_history || [])].reverse().find((entry) => entry.status === 'disqualified')?.entered_date;

export default function LeadPipelineReport({ dateRange, staffId }) {
  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: () => base44.entities.Lead.list('-created_date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });

  const reportLeads = useMemo(() => leads.filter((lead) => {
    const created = new Date(lead.created_date);
    return (!staffId || staffId === 'all' || lead.assigned_to === staffId) &&
      (!dateRange.start || !dateRange.end || (created >= dateRange.start && created <= dateRange.end));
  }), [leads, dateRange, staffId]);

  const clientName = (id) => {
    const client = clients.find((item) => item.id === id);
    return client?.company_name || client?.contact_name || 'Unknown Client';
  };
  const ownerName = (id) => users.find((item) => item.id === id)?.full_name || 'Unassigned';
  const stageCounts = STAGES.map(([status, label]) => ({ status, label, count: reportLeads.filter((lead) => lead.status === status).length }));
  const disqualified = reportLeads.filter((lead) => lead.status === 'disqualified');
  const reasonCounts = Object.entries(disqualified.reduce((counts, lead) => {
    const reason = lead.disqualification_reason?.trim() || 'No reason recorded';
    counts[reason] = (counts[reason] || 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]);
  const csvRows = reportLeads.map((lead) => ({ ...lead, client: clientName(lead.client_id), owner: ownerName(lead.assigned_to), stage: labelFor(lead.status), disqualified_on: disqualificationDate(lead) }));

  if (!dateRange.start || !dateRange.end) return <Card><CardContent className="py-8 text-center text-sm text-slate-500">Select a date range to run the lead pipeline report.</CardContent></Card>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold text-slate-900">Lead Pipeline & Disqualification Report</h2><p className="text-sm text-slate-500">Leads created in the selected period, grouped by their current pipeline stage.</p></div>
      <ExportCSVButton data={csvRows} filename="lead_pipeline_report" label="Export CSV" columns={[
        { header: 'Lead', accessor: (row) => row.title }, { header: 'Client', accessor: (row) => row.client },
        { header: 'Owner', accessor: (row) => row.owner }, { header: 'Pipeline Stage', accessor: (row) => row.stage },
        { header: 'Created', accessor: (row) => row.created_date ? format(new Date(row.created_date), 'yyyy-MM-dd') : '' },
        { header: 'Disqualified On', accessor: (row) => row.disqualified_on ? format(new Date(row.disqualified_on), 'yyyy-MM-dd') : '' },
        { header: 'Disqualification Reason', accessor: (row) => row.disqualification_reason || '' },
      ]} />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {stageCounts.map((stage) => <Card key={stage.status}><CardContent className="p-4"><p className="text-2xl font-bold text-slate-900">{stage.count}</p><p className="text-xs text-slate-500 mt-1">{stage.label}</p></CardContent></Card>)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1"><CardHeader><CardTitle className="text-base">Disqualification Reasons</CardTitle></CardHeader><CardContent className="space-y-3">
        {reasonCounts.length ? reasonCounts.map(([reason, count]) => <div key={reason} className="flex justify-between gap-3 text-sm"><span className="text-slate-600 break-words">{reason}</span><Badge variant="destructive">{count}</Badge></div>) : <p className="text-sm text-slate-500">No disqualified leads in this period.</p>}
      </CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Lead Detail</CardTitle></CardHeader><CardContent className="overflow-x-auto">
        <Table><TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Owner</TableHead><TableHead>Stage</TableHead><TableHead>Disqualification Reason</TableHead></TableRow></TableHeader><TableBody>
          {csvRows.map((lead) => <TableRow key={lead.id}><TableCell><p className="font-medium">{lead.title}</p><p className="text-xs text-slate-500">{lead.client}</p></TableCell><TableCell>{lead.owner}</TableCell><TableCell><Badge variant={lead.status === 'disqualified' ? 'destructive' : 'secondary'}>{lead.stage}</Badge></TableCell><TableCell className="max-w-xs whitespace-normal text-sm text-slate-600">{lead.disqualification_reason || '—'}</TableCell></TableRow>)}
          {!csvRows.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-slate-500">No leads match the selected filters.</TableCell></TableRow>}
        </TableBody></Table>
      </CardContent></Card>
    </div>
  </div>;
}