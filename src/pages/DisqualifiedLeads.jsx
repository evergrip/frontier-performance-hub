import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import EditLeadDialog from '../components/leads/EditLeadDialog';

export default function DisqualifiedLeads() {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const disqualifiedLeads = leads.filter(l => {
    if (l.status !== 'disqualified') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const clientName = getClientName(l.client_id).toLowerCase();
    return (l.title || '').toLowerCase().includes(q) ||
           clientName.includes(q) ||
           (l.disqualification_reason || '').toLowerCase().includes(q);
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || 'Unknown Client';
  };

  const allDisqualifiedCount = leads.filter(l => l.status === 'disqualified').length;

  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ leadId, status, currentLead }) => {
      const statusHistory = currentLead.status_history || [];
      const newHistory = [
        ...statusHistory,
        { status, entered_date: new Date().toISOString(), source: 'lead' }
      ];
      return base44.entities.Lead.update(leadId, { status, status_history: newHistory });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success('Lead reactivated');
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('Leads')}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Disqualified Leads</h1>
          <p className="text-sm text-slate-500">{allDisqualifiedCount} disqualified leads</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by lead name, client, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {disqualifiedLeads.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Lead</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Client</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Disqualified</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Reason</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {disqualifiedLeads.map(lead => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{lead.title}</td>
                    <td className="px-4 py-2.5 text-slate-500">{getClientName(lead.client_id)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                      {(() => {
                        const dqEntry = [...(lead.status_history || [])].reverse().find(h => h.status === 'disqualified');
                        return dqEntry?.entered_date ? moment(dqEntry.entered_date).format('MMM D, YYYY') : '—';
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-red-600 text-xs max-w-xs truncate">{lead.disqualification_reason || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost" className="text-xs h-7"
                          onClick={() => { setSelectedLead(lead); setEditDialogOpen(true); }}
                        >
                          View
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-xs h-7 text-emerald-600 hover:text-emerald-700"
                          onClick={() => updateLeadStatusMutation.mutate({ leadId: lead.id, status: 'new_project_lead', currentLead: lead })}
                        >
                          Reactivate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No disqualified leads
          </CardContent>
        </Card>
      )}

      <EditLeadDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lead={selectedLead}
        clients={clients}
        users={users}
        onAdvance={() => {}}
        onConvert={() => {}}
        onDisqualify={() => {}}
        onViewTimeline={() => {}}
      />
    </div>
  );
}