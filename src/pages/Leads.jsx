import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Briefcase, ArrowRight, ChevronRight, GripVertical, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '../components/common/EmptyState';
import EditableTimeline from '../components/common/EditableTimeline';
import EditLeadDialog from '../components/leads/EditLeadDialog';

export default function Leads() {
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [disqualifyDialogOpen, setDisqualifyDialogOpen] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const queryClient = useQueryClient();

  const [filterSalesperson, setFilterSalesperson] = useState('all');

  const [saleForm, setSaleForm] = useState({
    contract_value: '',
    estimated_construction_budget: '',
    estimated_margin: '',
    target_precon_completion_date: ''
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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const convertToSaleMutation = useMutation({
    mutationFn: async ({ leadId, saleData }) => {
      const sale = await base44.entities.Sale.create(saleData);
      await base44.entities.Lead.update(leadId, {
        status: 'converted',
        converted_to_sale_id: sale.id
      });
      
      // Process commission for preconstruction sale
      try {
        await base44.functions.invoke('processCommission', {
          sale_id: sale.id,
          sale_type: 'preconstruction'
        });
      } catch (error) {
        console.error('Commission processing failed:', error);
        toast.error('Commission processing failed: ' + error.message);
      }
      
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['sales']);
      setSaleDialogOpen(false);
      setSaleForm({ contract_value: '', estimated_construction_budget: '', estimated_margin: '', target_precon_completion_date: '' });
      toast.success('Lead converted to preconstruction sale');
    },
    onError: () => toast.error('Failed to convert lead')
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ leadId, status, currentLead }) => {
      const statusHistory = currentLead.status_history || [];
      const newHistory = [
        ...statusHistory,
        {
          status: status,
          entered_date: new Date().toISOString(),
          source: 'lead'
        }
      ];
      return base44.entities.Lead.update(leadId, { 
        status,
        status_history: newHistory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success('Lead status updated');
    }
  });

  const updateLeadHistoryMutation = useMutation({
    mutationFn: ({ leadId, status_history }) =>
      base44.entities.Lead.update(leadId, { status_history }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success('Timeline dates updated');
    }
  });

  const disqualifyLeadMutation = useMutation({
    mutationFn: ({ leadId, reason, currentLead }) => {
      const statusHistory = currentLead.status_history || [];
      const newHistory = [
        ...statusHistory,
        {
          status: 'disqualified',
          entered_date: new Date().toISOString(),
          source: 'lead'
        }
      ];
      return base44.entities.Lead.update(leadId, { 
        status: 'disqualified',
        disqualification_reason: reason,
        status_history: newHistory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setDisqualifyDialogOpen(false);
      setDisqualifyReason('');
      toast.success('Lead disqualified');
    }
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || 'Unknown Client';
  };

  const openSaleDialog = (lead) => {
    setSelectedLead(lead);
    setSaleForm({
      contract_value: lead.estimated_precon_value || '',
      estimated_construction_budget: lead.estimated_construction_value || '',
      estimated_margin: '25',
      target_precon_completion_date: ''
    });
    setSaleDialogOpen(true);
  };

  const openDisqualifyDialog = (lead) => {
    setSelectedLead(lead);
    setDisqualifyReason('');
    setDisqualifyDialogOpen(true);
  };

  const handleConvertToSale = (e) => {
    e.preventDefault();
    
    // Carry lead timeline into the sale's phase_history
    const leadHistory = (selectedLead.status_history?.length > 0
      ? selectedLead.status_history
      : [{ status: selectedLead.status, entered_date: selectedLead.created_date }]
    ).map(entry => ({ ...entry, source: 'lead' }));

    const salePhaseHistory = [
      ...leadHistory,
      { status: 'feasibility', entered_date: new Date().toISOString(), source: 'sale' }
    ];

    convertToSaleMutation.mutate({
      leadId: selectedLead.id,
      saleData: {
        title: selectedLead.title,
        client_id: selectedLead.client_id,
        lead_id: selectedLead.id,
        sale_type: 'preconstruction',
        contract_value: parseFloat(saleForm.contract_value) || 0,
        estimated_construction_budget: parseFloat(saleForm.estimated_construction_budget) || 0,
        estimated_margin: parseFloat(saleForm.estimated_margin) || 0,
        target_precon_completion_date: saleForm.target_precon_completion_date,
        status: 'feasibility',
        assigned_to: selectedLead.assigned_to,
        phase_history: salePhaseHistory
      }
    });
  };

  const handleDisqualify = (e) => {
    e.preventDefault();
    if (!disqualifyReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    disqualifyLeadMutation.mutate({
      leadId: selectedLead.id,
      reason: disqualifyReason,
      currentLead: selectedLead
    });
  };

  const statusColumns = [
    { status: 'new_project_lead', label: 'New Project Lead', color: 'bg-blue-100 border-blue-200' },
    { status: 'initial_video_consult', label: 'Video Consult', color: 'bg-purple-100 border-purple-200' },
    { status: 'initial_inperson_consultation', label: 'In-Person Consult', color: 'bg-indigo-100 border-indigo-200' },
    { status: 'preconstruction_proposal', label: 'Proposal', color: 'bg-violet-100 border-violet-200' },
    { status: 'followup', label: 'Follow-up', color: 'bg-emerald-100 border-emerald-200' },
  ];

  const filteredLeads = filterSalesperson === 'all'
    ? leads
    : leads.filter(l => l.assigned_to === filterSalesperson);

  const activeLeads = filteredLeads.filter(l => !['converted', 'disqualified'].includes(l.status));
  const convertedLeads = filteredLeads.filter(l => l.status === 'converted');
  const disqualifiedLeads = filteredLeads.filter(l => l.status === 'disqualified');

  const salespeopleWithLeads = [...new Set(leads.map(l => l.assigned_to).filter(Boolean))];

  const getNextStatus = (currentStatus) => {
    const statuses = ['new_project_lead', 'initial_video_consult', 'initial_inperson_consultation', 'preconstruction_proposal', 'followup'];
    const currentIndex = statuses.indexOf(currentStatus);
    return currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : null;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId;
    const lead = leads.find(l => l.id === draggableId);
    if (!lead) return;

    updateLeadStatusMutation.mutate({ leadId: lead.id, status: newStatus, currentLead: lead });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Lead Pipeline</h1>
        <p className="text-lg text-slate-500">Track leads through consultation and proposal stages</p>
      </div>

      {/* Salesperson Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Filter by Salesperson:</span>
        <Select value={filterSalesperson} onValueChange={setFilterSalesperson}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Salespeople" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Salespeople</SelectItem>
            {salespeopleWithLeads.map(userId => {
              const user = users.find(u => u.id === userId);
              return (
                <SelectItem key={userId} value={userId}>
                  {user?.full_name || 'Unknown'}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{activeLeads.length}</div>
            <div className="text-sm text-slate-500">Active Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              ${activeLeads.reduce((sum, l) => sum + (l.estimated_construction_value || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-slate-500">Pipeline Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{convertedLeads.length}</div>
            <div className="text-sm text-slate-500">Converted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{disqualifiedLeads.length}</div>
            <div className="text-sm text-slate-500">Disqualified</div>
          </CardContent>
        </Card>
      </div>

      {activeLeads.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusColumns.map(column => {
              const columnLeads = activeLeads.filter(l => l.status === column.status);
              return (
                <div key={column.status}>
                  <div className="mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">{column.label}</h3>
                    <p className="text-xs text-slate-500">{columnLeads.length} leads</p>
                  </div>
                  <Droppable droppableId={column.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[100px] p-1 rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? 'bg-slate-100' : ''
                        }`}
                      >
                        {columnLeads.map((lead, index) => {
                          const nextStatus = getNextStatus(lead.status);
                          return (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border-2 ${column.color} transition-all ${
                                    snapshot.isDragging ? 'shadow-2xl rotate-1' : 'hover:shadow-lg'
                                  }`}
                                >
                                  <CardContent className="p-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex items-center gap-1.5 mb-1 cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      <h4 className="font-semibold text-slate-900 text-sm">{lead.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2 ml-5">{getClientName(lead.client_id)}</p>
                                    {(lead.estimated_precon_value || lead.estimated_construction_value) && (
                                      <div className="text-xs text-slate-600 mb-2 space-y-0.5">
                                        {lead.estimated_precon_value > 0 && (
                                          <div className="flex justify-between">
                                            <span>Precon:</span>
                                            <span className="font-semibold">${lead.estimated_precon_value.toLocaleString()}</span>
                                          </div>
                                        )}
                                        {lead.estimated_construction_value > 0 && (
                                          <div className="flex justify-between">
                                            <span>Construction:</span>
                                            <span className="font-semibold">${lead.estimated_construction_value.toLocaleString()}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    <div className="space-y-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full text-xs text-slate-500"
                                        onClick={() => { setSelectedLead(lead); setTimelineDialogOpen(true); }}
                                      >
                                        View/Edit Timeline
                                      </Button>
                                      {nextStatus && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-xs"
                                          onClick={() => updateLeadStatusMutation.mutate({ leadId: lead.id, status: nextStatus, currentLead: lead })}
                                        >
                                          <ChevronRight className="w-3 h-3 mr-1" />
                                          Advance
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        className="w-full text-xs bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => openSaleDialog(lead)}
                                      >
                                        <Briefcase className="w-3 h-3 mr-1" />
                                        Convert to Sale
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => openDisqualifyDialog(lead)}
                                      >
                                        Disqualify
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Target}
              title="No leads yet"
              description="Create leads from clients to start your pipeline"
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
              <p className="text-xs text-slate-400 mt-1">Converting to Preconstruction Sale</p>
            </div>

            <div>
              <Label>Pre-Construction Contract Value *</Label>
              <p className="text-xs text-slate-500 mb-2">Revenue for preconstruction work</p>
              <Input
                type="number"
                value={saleForm.contract_value}
                onChange={(e) => setSaleForm({...saleForm, contract_value: e.target.value})}
                placeholder="125000"
                required
              />
            </div>

            <div>
              <Label>Estimated Construction Budget *</Label>
              <p className="text-xs text-slate-500 mb-2">Projected construction costs (will be refined through precon phases)</p>
              <Input
                type="number"
                value={saleForm.estimated_construction_budget}
                onChange={(e) => setSaleForm({...saleForm, estimated_construction_budget: e.target.value})}
                placeholder="750000"
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
              <Label>Target Pre-Construction Completion Date</Label>
              <p className="text-xs text-slate-500 mb-2">When you expect pre-construction work to be completed</p>
              <Input
                type="date"
                value={saleForm.target_precon_completion_date}
                onChange={(e) => setSaleForm({...saleForm, target_precon_completion_date: e.target.value})}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setSaleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={convertToSaleMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Briefcase className="w-4 h-4 mr-2" />
                Convert to Preconstruction Sale
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Timeline Edit Dialog */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead Timeline</DialogTitle>
          </DialogHeader>
          {selectedLead && (() => {
            const history = selectedLead.status_history?.length > 0
              ? selectedLead.status_history
              : [{ status: selectedLead.status, entered_date: selectedLead.created_date }];
            return (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900">{selectedLead.title}</p>
                  <p className="text-xs text-slate-500">{getClientName(selectedLead.client_id)}</p>
                </div>
                <EditableTimeline
                  history={history}
                  onSave={(updated) => updateLeadHistoryMutation.mutate({ leadId: selectedLead.id, status_history: updated })}
                  isSaving={updateLeadHistoryMutation.isPending}
                />
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setTimelineDialogOpen(false)}>Close</Button>
                </div>
              </div>
            );
          })()}
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