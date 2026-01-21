import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Target, Briefcase, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '../components/common/EmptyState';

export default function Leads() {
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [disqualifyDialogOpen, setDisqualifyDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const queryClient = useQueryClient();

  const [saleForm, setSaleForm] = useState({
    sale_type: 'construction',
    contract_value: '',
    estimated_margin: '',
    close_date: ''
  });

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

  const convertToSaleMutation = useMutation({
    mutationFn: async ({ leadId, saleData }) => {
      const sale = await base44.entities.Sale.create(saleData);
      await base44.entities.Lead.update(leadId, {
        status: 'converted',
        converted_to_sale_id: sale.id
      });
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['sales']);
      setSaleDialogOpen(false);
      setSaleForm({ sale_type: 'construction', contract_value: '', estimated_margin: '', close_date: '' });
      toast.success('Lead converted to sale successfully');
    },
    onError: () => toast.error('Failed to convert lead')
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ leadId, status }) => base44.entities.Lead.update(leadId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success('Lead status updated');
    }
  });

  const disqualifyLeadMutation = useMutation({
    mutationFn: ({ leadId, reason }) => 
      base44.entities.Lead.update(leadId, { 
        status: 'unqualified',
        disqualification_reason: reason 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setDisqualifyDialogOpen(false);
      setDisqualifyReason('');
      toast.success('Lead disqualified');
    }
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Unknown Client';
  };

  const openSaleDialog = (lead) => {
    setSelectedLead(lead);
    setSaleForm({
      sale_type: lead.project_type === 'both' ? 'construction' : lead.project_type,
      contract_value: lead.estimated_value || '',
      estimated_margin: '25',
      close_date: ''
    });
    setSaleDialogOpen(true);
  };

  const handleConvertToSale = (e) => {
    e.preventDefault();
    
    convertToSaleMutation.mutate({
      leadId: selectedLead.id,
      saleData: {
        title: selectedLead.title,
        client_id: selectedLead.client_id,
        lead_id: selectedLead.id,
        sale_type: saleForm.sale_type,
        contract_value: parseFloat(saleForm.contract_value) || 0,
        estimated_margin: parseFloat(saleForm.estimated_margin) || 0,
        close_date: saleForm.close_date,
        status: 'prospect',
        assigned_to: selectedLead.assigned_to
      }
    });
  };

  const openDisqualifyDialog = (lead) => {
    setSelectedLead(lead);
    setDisqualifyReason('');
    setDisqualifyDialogOpen(true);
  };

  const handleDisqualify = (e) => {
    e.preventDefault();
    if (!disqualifyReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    disqualifyLeadMutation.mutate({
      leadId: selectedLead.id,
      reason: disqualifyReason
    });
  };

  const statusColumns = [
    { status: 'new', label: 'New', color: 'bg-blue-100 border-blue-200' },
    { status: 'contacted', label: 'Contacted', color: 'bg-purple-100 border-purple-200' },
    { status: 'qualified', label: 'Qualified', color: 'bg-emerald-100 border-emerald-200' },
    { status: 'unqualified', label: 'Disqualified', color: 'bg-red-100 border-red-200' },
    { status: 'converted', label: 'Converted', color: 'bg-amber-100 border-amber-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Leads Pipeline</h1>
        <p className="text-lg text-slate-500">Track lead progression and convert to sales</p>
      </div>

      {leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusColumns.map(column => {
            const columnLeads = leads.filter(l => l.status === column.status);
            return (
              <div key={column.status}>
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">{column.label}</h3>
                  <p className="text-sm text-slate-500">{columnLeads.length} leads</p>
                </div>
                <div className="space-y-3">
                  {columnLeads.map(lead => (
                    <Card key={lead.id} className={`border-2 ${column.color} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-slate-900 mb-1">{lead.title}</h4>
                        <p className="text-xs text-slate-500 mb-2">{getClientName(lead.client_id)}</p>
                        {lead.estimated_value && (
                          <p className="text-sm font-bold text-slate-700 mb-2">
                            ${lead.estimated_value.toLocaleString()}
                          </p>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-slate-500 capitalize">
                            {lead.project_type?.replace('_', ' ') || 'Unknown'}
                          </span>
                          <span className="text-xs font-medium text-slate-600">
                            Score: {lead.lead_score || 50}
                          </span>
                        </div>
                        
                        {lead.status === 'unqualified' ? (
                          <div className="text-xs text-red-600 italic">
                            {lead.disqualification_reason}
                          </div>
                        ) : lead.status !== 'converted' ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              {lead.status === 'new' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs"
                                  onClick={() => updateLeadStatusMutation.mutate({ leadId: lead.id, status: 'contacted' })}
                                >
                                  Mark Contacted
                                </Button>
                              )}
                              {lead.status === 'contacted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs"
                                  onClick={() => updateLeadStatusMutation.mutate({ leadId: lead.id, status: 'qualified' })}
                                >
                                  Qualify
                                </Button>
                              )}
                              {lead.status === 'qualified' && (
                                <Button
                                  size="sm"
                                  className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => openSaleDialog(lead)}
                                >
                                  <Briefcase className="w-3 h-3 mr-1" />
                                  Convert
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                            </div>
                            {['new', 'contacted', 'qualified'].includes(lead.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => openDisqualifyDialog(lead)}
                              >
                                Disqualify
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Target}
              title="No leads yet"
              description="Create leads from clients to start your sales pipeline"
            />
          </CardContent>
        </Card>
      )}

      {/* Convert to Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConvertToSale} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedLead?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedLead?.client_id)}</p>
            </div>

            <div>
              <Label>Sale Type *</Label>
              <select
                value={saleForm.sale_type}
                onChange={(e) => setSaleForm({...saleForm, sale_type: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="preconstruction">Preconstruction</option>
                <option value="construction">Construction</option>
              </select>
            </div>

            <div>
              <Label>Contract Value *</Label>
              <Input
                type="number"
                value={saleForm.contract_value}
                onChange={(e) => setSaleForm({...saleForm, contract_value: e.target.value})}
                placeholder="500000"
                required
              />
            </div>

            <div>
              <Label>Estimated Margin (%)</Label>
              <Input
                type="number"
                value={saleForm.estimated_margin}
                onChange={(e) => setSaleForm({...saleForm, estimated_margin: e.target.value})}
                placeholder="25"
              />
            </div>

            <div>
              <Label>Expected Close Date</Label>
              <Input
                type="date"
                value={saleForm.close_date}
                onChange={(e) => setSaleForm({...saleForm, close_date: e.target.value})}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setSaleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={convertToSaleMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Briefcase className="w-4 h-4 mr-2" />
                Convert to Sale
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disqualify Lead Dialog */}
      <Dialog open={disqualifyDialogOpen} onOpenChange={setDisqualifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disqualify Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDisqualify} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedLead?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedLead?.client_id)}</p>
            </div>

            <div>
              <Label>Reason for Disqualification *</Label>
              <Textarea
                value={disqualifyReason}
                onChange={(e) => setDisqualifyReason(e.target.value)}
                placeholder="e.g., Budget too low, Not ready to move forward, Out of scope..."
                rows={4}
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDisqualifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={disqualifyLeadMutation.isPending} className="bg-red-600 hover:bg-red-700">
                Disqualify Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}