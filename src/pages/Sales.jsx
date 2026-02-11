import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Briefcase, Building2, ChevronRight, ChevronLeft, DollarSign, AlertCircle, FileText, Plus, Trash2, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import EmptyState from '../components/common/EmptyState';
import EditableTimeline from '../components/common/EditableTimeline';

export default function Sales() {
  const queryClient = useQueryClient();
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [constructionDialogOpen, setConstructionDialogOpen] = useState(false);
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [closePreconDialogOpen, setClosePreconDialogOpen] = useState(false);
  const [sendBackToLeadsDialogOpen, setSendBackToLeadsDialogOpen] = useState(false);
  const [sendBackLeadPhase, setSendBackLeadPhase] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [constructionBudget, setConstructionBudget] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  const [finalPreconValue, setFinalPreconValue] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [constructionForm, setConstructionForm] = useState({
    final_precon_value: '',
    construction_budget: ''
  });
  const [financeForm, setFinanceForm] = useState({
    minimum_draw_threshold: ''
  });
  const [depositForm, setDepositForm] = useState({
    deposit_number: '',
    amount: '',
    date_received: '',
    notes: ''
  });
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    amount: '',
    date_issued: '',
    status: 'pending',
    notes: ''
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date'),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const updateSaleStatusMutation = useMutation({
    mutationFn: ({ saleId, status, estimated_construction_budget, target_precon_completion_date }) => {
      const sale = sales.find(s => s.id === saleId);
      const phase_history = [...(sale.phase_history || []), {
        status,
        entered_date: new Date().toISOString()
      }];
      return base44.entities.Sale.update(saleId, { 
        status, 
        estimated_construction_budget, 
        target_precon_completion_date,
        phase_history 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setAdvanceDialogOpen(false);
      setConstructionBudget('');
      setTargetCompletionDate('');
      toast.success('Sale status updated');
    }
  });

  const updateFinanceMutation = useMutation({
    mutationFn: ({ saleId, minimum_draw_threshold }) => 
      base44.entities.Sale.update(saleId, { minimum_draw_threshold }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setFinanceDialogOpen(false);
      setFinanceForm({ minimum_draw_threshold: '' });
      toast.success('Financial settings updated');
    }
  });

  const addDepositMutation = useMutation({
    mutationFn: ({ saleId, deposit }) => {
      const sale = sales.find(s => s.id === saleId);
      const deposits = [...(sale.deposits || []), deposit];
      const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
      return base44.entities.Sale.update(saleId, { deposits, contract_value: totalDeposits });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setDepositForm({ deposit_number: '', amount: '', date_received: '', notes: '' });
      toast.success('Deposit added');
    }
  });

  const deleteDepositMutation = useMutation({
    mutationFn: ({ saleId, depositIndex }) => {
      const sale = sales.find(s => s.id === saleId);
      const deposits = sale.deposits.filter((_, idx) => idx !== depositIndex);
      const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
      return base44.entities.Sale.update(saleId, { deposits, contract_value: totalDeposits });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      toast.success('Deposit deleted');
    }
  });

  const addInvoiceMutation = useMutation({
    mutationFn: ({ saleId, invoice }) => {
      const sale = sales.find(s => s.id === saleId);
      const invoices = [...(sale.invoices || []), invoice];
      return base44.entities.Sale.update(saleId, { invoices });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setInvoiceForm({ invoice_number: '', amount: '', date_issued: '', status: 'pending', notes: '' });
      toast.success('Invoice added');
    }
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: ({ saleId, invoiceIndex }) => {
      const sale = sales.find(s => s.id === saleId);
      const invoices = sale.invoices.filter((_, idx) => idx !== invoiceIndex);
      return base44.entities.Sale.update(saleId, { invoices });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      toast.success('Invoice deleted');
    }
  });

  const closePreconMutation = useMutation({
    mutationFn: async ({ preconSale, finalValue }) => {
      // Update preconstruction sale as closed won with final value
      await base44.entities.Sale.update(preconSale.id, {
        status: 'closed_won',
        contract_value: parseFloat(finalValue)
      });

      // Update preconstruction commission with final value
      try {
        await base44.functions.invoke('processCommission', {
          sale_id: preconSale.id,
          sale_type: 'preconstruction',
          final_amount: parseFloat(finalValue),
          is_update: true
        });
      } catch (error) {
        console.error('Precon commission update failed:', error);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setClosePreconDialogOpen(false);
      setFinalPreconValue('');
      toast.success('Pre-construction finalized');
    }
  });

  const convertToConstructionMutation = useMutation({
    mutationFn: async ({ preconSale, final_precon_value, construction_budget }) => {
      // Update preconstruction sale with final value
      await base44.entities.Sale.update(preconSale.id, {
        contract_value: parseFloat(final_precon_value),
        status: 'closed_won'
      });

      // Update preconstruction commission with final value
      try {
        await base44.functions.invoke('processCommission', {
          sale_id: preconSale.id,
          sale_type: 'preconstruction',
          final_amount: parseFloat(final_precon_value),
          is_update: true
        });
      } catch (error) {
        console.error('Precon commission update failed:', error);
      }

      // Create construction sale
      const constructionSale = await base44.entities.Sale.create({
        title: `${preconSale.title} - Construction`,
        client_id: preconSale.client_id,
        lead_id: preconSale.lead_id,
        sale_type: 'construction',
        contract_value: parseFloat(construction_budget),
        linked_precon_sale_id: preconSale.id,
        assigned_to: preconSale.assigned_to,
        status: 'closed_won'
      });

      // Carry sale phase history (which includes lead history) into the project
      const saleHistory = (preconSale.phase_history?.length > 0
        ? preconSale.phase_history
        : [{ status: preconSale.status, entered_date: preconSale.created_date, source: 'sale' }]
      ).map(entry => ({ ...entry, source: entry.source || 'sale' }));

      const projectStatusHistory = [
        ...saleHistory,
        { status: 'awaiting_to_be_scheduled', entered_date: new Date().toISOString(), source: 'project' }
      ];

      // Create construction project
      const project = await base44.entities.Project.create({
        title: preconSale.title,
        client_id: preconSale.client_id,
        sale_id: constructionSale.id,
        project_type: 'construction',
        status: 'awaiting_to_be_scheduled',
        contract_value: parseFloat(construction_budget),
        status_history: projectStatusHistory
      });

      // Link construction sale to project
      await base44.entities.Sale.update(constructionSale.id, {
        converted_to_project_id: project.id
      });

      // Process commission for construction sale
      try {
        await base44.functions.invoke('processCommission', {
          sale_id: constructionSale.id,
          sale_type: 'construction'
        });
      } catch (error) {
        console.error('Commission processing failed:', error);
      }

      return { constructionSale, project };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      queryClient.invalidateQueries(['projects']);
      setConstructionDialogOpen(false);
      setConstructionForm({ final_precon_value: '', construction_budget: '' });
      toast.success('Converted to construction project');
    }
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Unknown Client';
  };

  const preconstructionSales = sales.filter(s => s.sale_type === 'preconstruction' && !['closed_won', 'closed_lost'].includes(s.status));
  const closedSales = sales.filter(s => ['closed_won', 'closed_lost'].includes(s.status));

  const statusColumns = [
    { status: 'feasibility', label: 'Feasibility', color: 'bg-blue-100 border-blue-200', description: 'Initial assessment' },
    { status: 'design_material_selections', label: 'Design & Materials', color: 'bg-purple-100 border-purple-200', description: 'Planning phase' },
    { status: 'engineering_permits', label: 'Engineering & Permits', color: 'bg-indigo-100 border-indigo-200', description: 'Technical phase' },
    { status: 'pending_construction_sale', label: 'Pending Construction', color: 'bg-emerald-100 border-emerald-200', description: 'Ready to build' },
  ];

  const getNextStatus = (currentStatus) => {
    const statuses = ['feasibility', 'design_material_selections', 'engineering_permits', 'pending_construction_sale'];
    const currentIndex = statuses.indexOf(currentStatus);
    return currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : null;
  };

  const openAdvanceDialog = (sale) => {
    setSelectedSale(sale);
    setConstructionBudget(sale.estimated_construction_budget || '');
    setTargetCompletionDate(sale.target_precon_completion_date || '');
    setAdvanceDialogOpen(true);
  };

  const openConstructionDialog = (sale) => {
    setSelectedSale(sale);
    setConstructionForm({
      final_precon_value: sale.contract_value || '',
      construction_budget: sale.estimated_construction_budget || ''
    });
    setConstructionDialogOpen(true);
  };

  const openFinanceDialog = (sale) => {
    setSelectedSale(sale);
    setFinanceForm({
      minimum_draw_threshold: sale.minimum_draw_threshold || ''
    });
    setFinanceDialogOpen(true);
  };

  const openInvoiceDialog = (sale) => {
    setSelectedSale(sale);
    setInvoiceDialogOpen(true);
  };

  const handleAdvancePhase = async (e) => {
    e.preventDefault();
    const nextStatus = getNextStatus(selectedSale.status);
    if (!nextStatus) return;

    // Update phase-based commission availability
    try {
      await base44.functions.invoke('updatePhaseCommission', {
        sale_id: selectedSale.id,
        phase: nextStatus,
        type: 'preconstruction'
      });
    } catch (error) {
      console.error('Phase commission update failed:', error);
    }

    // If moving from engineering_permits, update commission with actual precon cost
    if (selectedSale.status === 'engineering_permits') {
      try {
        await base44.functions.invoke('processCommission', {
          sale_id: selectedSale.id,
          sale_type: 'preconstruction',
          final_amount: selectedSale.contract_value,
          is_update: true
        });
      } catch (error) {
        console.error('Commission update failed:', error);
      }
    }

    updateSaleStatusMutation.mutate({
      saleId: selectedSale.id,
      status: nextStatus,
      estimated_construction_budget: parseFloat(constructionBudget) || null,
      target_precon_completion_date: targetCompletionDate || null
    });
  };

  const handleConvertToConstruction = (e) => {
    e.preventDefault();
    if (!constructionForm.final_precon_value || !constructionForm.construction_budget) {
      toast.error('Please fill in all fields');
      return;
    }

    convertToConstructionMutation.mutate({
      preconSale: selectedSale,
      final_precon_value: constructionForm.final_precon_value,
      construction_budget: constructionForm.construction_budget
    });
  };

  const handleUpdateFinance = (e) => {
    e.preventDefault();
    if (!financeForm.minimum_draw_threshold) {
      toast.error('Please enter minimum draw threshold');
      return;
    }

    updateFinanceMutation.mutate({
      saleId: selectedSale.id,
      minimum_draw_threshold: parseFloat(financeForm.minimum_draw_threshold)
    });
  };

  const handleAddDeposit = (e) => {
    e.preventDefault();
    if (!depositForm.deposit_number || !depositForm.amount || !depositForm.date_received) {
      toast.error('Please fill in required fields');
      return;
    }

    addDepositMutation.mutate({
      saleId: selectedSale.id,
      deposit: {
        deposit_number: depositForm.deposit_number,
        amount: parseFloat(depositForm.amount),
        date_received: depositForm.date_received,
        notes: depositForm.notes
      }
    });
  };

  const handleDeleteDeposit = (depositIndex) => {
    if (confirm('Are you sure you want to delete this deposit?')) {
      deleteDepositMutation.mutate({
        saleId: selectedSale.id,
        depositIndex
      });
    }
  };

  const getTotalDeposits = (sale) => {
    if (!sale) return 0;
    return (sale.deposits || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  };

  const calculateRemainingBalance = (sale) => {
    if (!sale) return null;
    const totalDeposits = getTotalDeposits(sale);
    if (totalDeposits === 0) return null;
    const totalInvoiced = (sale.invoices || []).reduce((sum, inv) => sum + (inv.amount || 0), 0);
    return totalDeposits - totalInvoiced;
  };

  const needsDrawAlert = (sale) => {
    if (!sale) return false;
    const balance = calculateRemainingBalance(sale);
    return balance !== null && sale.minimum_draw_threshold && balance < sale.minimum_draw_threshold;
  };

  const handleAddInvoice = (e) => {
    e.preventDefault();
    if (!invoiceForm.invoice_number || !invoiceForm.amount || !invoiceForm.date_issued) {
      toast.error('Please fill in required fields');
      return;
    }

    addInvoiceMutation.mutate({
      saleId: selectedSale.id,
      invoice: {
        invoice_number: invoiceForm.invoice_number,
        amount: parseFloat(invoiceForm.amount),
        date_issued: invoiceForm.date_issued,
        date_paid: invoiceForm.date_paid || null,
        status: invoiceForm.status,
        notes: invoiceForm.notes
      }
    });
  };

  const handleDeleteInvoice = (invoiceIndex) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoiceMutation.mutate({
        saleId: selectedSale.id,
        invoiceIndex
      });
    }
  };

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const leadPhases = [
    { value: 'new_project_lead', label: 'New Project Lead' },
    { value: 'initial_video_consult', label: 'Video Consult' },
    { value: 'initial_inperson_consultation', label: 'In-Person Consult' },
    { value: 'preconstruction_proposal', label: 'Proposal' },
    { value: 'followup', label: 'Follow-up' },
  ];

  const sendBackToLeadsMutation = useMutation({
    mutationFn: async ({ sale, targetPhase }) => {
      // Find the linked lead
      const lead = leads.find(l => l.id === sale.lead_id);
      if (!lead) throw new Error('No linked lead found');

      // Reopen the lead at the target phase
      const leadHistory = [...(lead.status_history || []), {
        status: targetPhase,
        entered_date: new Date().toISOString()
      }];
      await base44.entities.Lead.update(lead.id, {
        status: targetPhase,
        status_history: leadHistory,
        converted_to_sale_id: null
      });

      // Delete the sale
      await base44.entities.Sale.delete(sale.id);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      queryClient.invalidateQueries(['leads']);
      setSendBackToLeadsDialogOpen(false);
      setSendBackLeadPhase('');
      toast.success('Sent back to leads');
    }
  });

  const totalValue = preconstructionSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;
    
    const newStatus = destination.droppableId;
    const saleId = draggableId;
    const sale = sales.find(s => s.id === saleId);
    
    updateSaleStatusMutation.mutate({
      saleId,
      status: newStatus,
      estimated_construction_budget: sale?.estimated_construction_budget || null
    });
  };

  const openDetailDialog = (sale) => {
    setSelectedSale(sale);
    setEditTargetDate(sale.target_precon_completion_date || '');
    setDetailDialogOpen(true);
  };

  const updateSaleHistoryMutation = useMutation({
    mutationFn: ({ saleId, phase_history }) =>
      base44.entities.Sale.update(saleId, { phase_history }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      toast.success('Timeline dates updated');
    }
  });

  const updateTargetDateMutation = useMutation({
    mutationFn: ({ saleId, target_precon_completion_date }) => 
      base44.entities.Sale.update(saleId, { target_precon_completion_date }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      toast.success('Target completion date updated');
    }
  });

  const handleUpdateTargetDate = () => {
    if (!editTargetDate) {
      toast.error('Please select a date');
      return;
    }
    updateTargetDateMutation.mutate({
      saleId: selectedSale.id,
      target_precon_completion_date: editTargetDate
    });
  };

  const calculatePhaseDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    return `${Math.floor(diffDays / 30)} months`;
  };

  const getPhaseTimeline = (sale) => {
    if (!sale.phase_history || sale.phase_history.length === 0) {
      return [{
        status: sale.status,
        entered_date: sale.created_date,
        duration: calculatePhaseDuration(sale.created_date, null),
        isCurrent: true
      }];
    }

    const timeline = sale.phase_history.map((phase, index) => {
      const nextPhase = sale.phase_history[index + 1];
      return {
        status: phase.status,
        entered_date: phase.entered_date,
        duration: calculatePhaseDuration(phase.entered_date, nextPhase?.entered_date),
        isCurrent: index === sale.phase_history.length - 1
      };
    });

    return timeline;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Pre-Construction Sales</h1>
        <p className="text-lg text-slate-500">Track preconstruction sales through design, engineering, and permitting phases</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{preconstructionSales.length}</div>
            <div className="text-sm text-slate-500">Active Pre-Construction</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">${(totalValue / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-slate-500">Pipeline Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{closedSales.length}</div>
            <div className="text-sm text-slate-500">Converted to Construction</div>
          </CardContent>
        </Card>
      </div>

      {preconstructionSales.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statusColumns.map(column => {
              const columnSales = preconstructionSales.filter(s => s.status === column.status);
              const columnValue = columnSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);
              
              return (
                <div key={column.status}>
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900">{column.label}</h3>
                    <p className="text-xs text-slate-500">{column.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-slate-600">{columnSales.length} projects</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        ${(columnValue / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                  <Droppable droppableId={column.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? 'bg-slate-100' : ''
                        }`}
                      >
                        {columnSales.map((sale, index) => {
                          const nextStatus = getNextStatus(sale.status);
                          return (
                            <Draggable key={sale.id} draggableId={sale.id} index={index}>
                              {(provided, snapshot) => (
                                <Card 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border-2 ${column.color} transition-all cursor-pointer ${
                                    snapshot.isDragging ? 'shadow-2xl rotate-2' : 'hover:shadow-lg'
                                  }`}
                                  onClick={() => openDetailDialog(sale)}
                                >
                                  <CardContent className="p-4">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="flex items-center gap-2 mb-2 cursor-grab active:cursor-grabbing"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                      <h4 className="font-semibold text-slate-900 flex-1">{sale.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2 ml-6">{getClientName(sale.client_id)}</p>
                          
                          <div className="space-y-1 mb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Precon Value</span>
                              <span className="text-sm font-bold text-slate-700">
                                ${(sale.contract_value / 1000).toFixed(0)}k
                              </span>
                            </div>
                            {sale.estimated_construction_budget && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Est. Construction</span>
                                <span className="text-sm font-semibold text-amber-600">
                                  ${(sale.estimated_construction_budget / 1000).toFixed(0)}k
                                </span>
                              </div>
                            )}
                            {getTotalDeposits(sale) > 0 && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">Deposits</span>
                                  <span className="text-sm font-medium text-emerald-600">
                                    ${(getTotalDeposits(sale) / 1000).toFixed(1)}k
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">Balance</span>
                                  <span className={`text-sm font-medium ${needsDrawAlert(sale) ? 'text-red-600' : 'text-slate-700'}`}>
                                    ${((calculateRemainingBalance(sale) || 0) / 1000).toFixed(1)}k
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {needsDrawAlert(sale) && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                              <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                              <span className="text-xs text-red-700">Draw needed</span>
                            </div>
                          )}

                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            {!(sale.deposits || []).length && !sale.minimum_draw_threshold && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => openFinanceDialog(sale)}
                              >
                                <DollarSign className="w-3 h-3 mr-1" />
                                Setup Tracking
                              </Button>
                            )}

                            {((sale.deposits || []).length > 0 || sale.minimum_draw_threshold) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => openInvoiceDialog(sale)}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Manage Deposits & Invoices
                              </Button>
                            )}

                            {nextStatus && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => openAdvanceDialog(sale)}
                              >
                                <ChevronRight className="w-3 h-3 mr-1" />
                                Move to Next Phase
                              </Button>
                            )}

                            {sale.status === 'pending_construction_sale' && (
                              <>
                                <Button
                                  size="sm"
                                  className="w-full text-xs bg-amber-600 hover:bg-amber-700"
                                  onClick={() => openConstructionDialog(sale)}
                                >
                                  <Building2 className="w-3 h-3 mr-1" />
                                  Convert to Construction
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs"
                                  onClick={() => {
                                    setSelectedSale(sale);
                                    setFinalPreconValue(sale.contract_value || '');
                                    setClosePreconDialogOpen(true);
                                  }}
                                >
                                  Finalize Pre-Con Only
                                </Button>
                              </>
                            )}
                            {sale.lead_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={() => {
                                  setSelectedSale(sale);
                                  setSendBackLeadPhase('new_project_lead');
                                  setSendBackToLeadsDialogOpen(true);
                                }}
                              >
                                <ChevronLeft className="w-3 h-3 mr-1" />
                                Send Back to Leads
                              </Button>
                            )}
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
              icon={Briefcase}
              title="No active pre-construction sales"
              description="Convert qualified leads to preconstruction sales to start this pipeline"
            />
          </CardContent>
        </Card>
      )}

      {/* Advance Phase Dialog */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advance to Next Phase</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdvancePhase} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedSale?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedSale?.client_id)}</p>
            </div>

            <div>
              <Label>Estimated Construction Budget *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Update the projected construction costs as you refine the design
              </p>
              <Input
                type="number"
                value={constructionBudget}
                onChange={(e) => setConstructionBudget(e.target.value)}
                placeholder="750000"
                required
              />
            </div>

            <div>
              <Label>Target Pre-Construction Completion Date</Label>
              <p className="text-xs text-slate-500 mb-2">
                Expected date to complete pre-construction phase
              </p>
              <Input
                type="date"
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setAdvanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSaleStatusMutation.isPending}>
                <ChevronRight className="w-4 h-4 mr-2" />
                Advance to Next Phase
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert to Construction Dialog */}
      <Dialog open={constructionDialogOpen} onOpenChange={setConstructionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Construction Sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConvertToConstruction} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedSale?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedSale?.client_id)}</p>
            </div>

            <div>
              <Label>Final Pre-Construction Value *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Lock in the final preconstruction revenue
              </p>
              <Input
                type="number"
                value={constructionForm.final_precon_value}
                onChange={(e) => setConstructionForm({...constructionForm, final_precon_value: e.target.value})}
                placeholder="125000"
                required
              />
            </div>

            <div>
              <Label>Construction Budget *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Pre-filled with latest estimate. Override as needed.
              </p>
              <Input
                type="number"
                value={constructionForm.construction_budget}
                onChange={(e) => setConstructionForm({...constructionForm, construction_budget: e.target.value})}
                placeholder="750000"
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setConstructionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={convertToConstructionMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
                <Building2 className="w-4 h-4 mr-2" />
                Convert to Construction
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Finance Setup Dialog */}
      <Dialog open={financeDialogOpen} onOpenChange={setFinanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Draw Alert Threshold</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateFinance} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedSale?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedSale?.client_id)}</p>
            </div>

            <div>
              <Label>Minimum Draw Threshold *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Alert when balance falls below this amount
              </p>
              <Input
                type="number"
                value={financeForm.minimum_draw_threshold}
                onChange={(e) => setFinanceForm({...financeForm, minimum_draw_threshold: e.target.value})}
                placeholder="5000"
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setFinanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateFinanceMutation.isPending}>
                <DollarSign className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Management Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Deposits & Invoices</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-900">{selectedSale.title}</p>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-slate-500">Total Deposits</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      ${(getTotalDeposits(selectedSale) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Invoiced</p>
                    <p className="text-sm font-semibold text-amber-600">
                      ${(((selectedSale.invoices || []).reduce((sum, inv) => sum + (inv.amount || 0), 0)) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Balance</p>
                    <p className={`text-sm font-semibold ${needsDrawAlert(selectedSale) ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${((calculateRemainingBalance(selectedSale) || 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
              </div>

              {/* Deposits Section */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Deposits Received</h4>
                {(selectedSale.deposits || []).length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {selectedSale.deposits.map((deposit, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">#{deposit.deposit_number}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Received: {deposit.date_received}
                          </p>
                          {deposit.notes && (
                            <p className="text-xs text-slate-600 mt-1">{deposit.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-emerald-700">${(deposit.amount / 1000).toFixed(1)}k</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteDeposit(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4 mb-3">No deposits recorded yet</p>
                )}

                <form onSubmit={handleAddDeposit} className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-3 space-y-3">
                  <h5 className="text-sm font-semibold text-slate-900">Add New Deposit</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Deposit Number *</Label>
                      <Input
                        type="text"
                        value={depositForm.deposit_number}
                        onChange={(e) => setDepositForm({...depositForm, deposit_number: e.target.value})}
                        placeholder="DEP-001"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Amount *</Label>
                      <Input
                        type="number"
                        value={depositForm.amount}
                        onChange={(e) => setDepositForm({...depositForm, amount: e.target.value})}
                        placeholder="10000"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Date Received *</Label>
                      <Input
                        type="date"
                        value={depositForm.date_received}
                        onChange={(e) => setDepositForm({...depositForm, date_received: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Input
                        type="text"
                        value={depositForm.notes}
                        onChange={(e) => setDepositForm({...depositForm, notes: e.target.value})}
                        placeholder="Optional"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm" disabled={addDepositMutation.isPending} className="w-full">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Deposit
                  </Button>
                </form>
              </div>

              {/* Invoice List */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Existing Invoices</h4>
                {(selectedSale.invoices || []).length > 0 ? (
                  <div className="space-y-2">
                    {selectedSale.invoices.map((invoice, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">#{invoice.invoice_number}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Issued: {invoice.date_issued}
                          {invoice.date_paid && ` • Paid: ${invoice.date_paid}`}
                        </p>
                        {invoice.notes && (
                          <p className="text-xs text-slate-600 mt-1">{invoice.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-slate-900">${(invoice.amount / 1000).toFixed(1)}k</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteInvoice(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No invoices yet</p>
                )}
              </div>

              {/* Add Invoice Form */}
              <form onSubmit={handleAddInvoice} className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Add New Invoice</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Invoice Number *</Label>
                  <Input
                    type="text"
                    value={invoiceForm.invoice_number}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoice_number: e.target.value})}
                    placeholder="INV-001"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount *</Label>
                  <Input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})}
                    placeholder="5000"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Date Issued *</Label>
                  <Input
                    type="date"
                    value={invoiceForm.date_issued}
                    onChange={(e) => setInvoiceForm({...invoiceForm, date_issued: e.target.value})}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Date Paid</Label>
                  <Input
                    type="date"
                    value={invoiceForm.date_paid || ''}
                    onChange={(e) => setInvoiceForm({...invoiceForm, date_paid: e.target.value})}
                    className="h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  type="text"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                  placeholder="Optional notes"
                  className="h-9"
                />
              </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setInvoiceDialogOpen(false)}>
                    Close
                  </Button>
                  <Button type="submit" size="sm" disabled={addInvoiceMutation.isPending}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Invoice
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Close Pre-Con Only Dialog */}
      <Dialog open={closePreconDialogOpen} onOpenChange={setClosePreconDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Pre-Construction Only</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!finalPreconValue) {
              toast.error('Please enter final pre-construction value');
              return;
            }
            closePreconMutation.mutate({ preconSale: selectedSale, finalValue: finalPreconValue });
          }} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedSale?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedSale?.client_id)}</p>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-slate-700">
                This will mark the pre-construction work as complete and finalize the commission.
              </p>
              <p className="text-sm text-slate-700 mt-2">
                <strong>No construction project will be created.</strong>
              </p>
            </div>

            <div>
              <Label>Final Pre-Construction Value *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Confirm or adjust the final pre-construction revenue
              </p>
              <Input
                type="number"
                value={finalPreconValue}
                onChange={(e) => setFinalPreconValue(e.target.value)}
                placeholder="125000"
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setClosePreconDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={closePreconMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Finalize Pre-Construction
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Back to Leads Dialog */}
      <Dialog open={sendBackToLeadsDialogOpen} onOpenChange={setSendBackToLeadsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back to Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedSale?.title}</p>
              <p className="text-xs text-amber-700 mt-1">
                This will delete the pre-construction sale and reopen the lead at the selected stage.
              </p>
            </div>

            <div>
              <Label>Send back to which stage?</Label>
              <Select value={sendBackLeadPhase} onValueChange={setSendBackLeadPhase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {leadPhases.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setSendBackToLeadsDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!sendBackLeadPhase || sendBackToLeadsMutation.isPending}
                onClick={() => sendBackToLeadsMutation.mutate({ sale: selectedSale, targetPhase: sendBackLeadPhase })}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Send Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog - Phase Timeline */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Timeline</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-900">{selectedSale.title}</p>
                <p className="text-xs text-slate-500">{getClientName(selectedSale.client_id)}</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-slate-500">Precon Value</p>
                    <p className="text-sm font-semibold text-slate-900">
                      ${((selectedSale.contract_value || 0) / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Started</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(selectedSale.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-xs font-semibold text-slate-700">Target Pre-Construction Completion Date</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateTargetDate}
                    disabled={updateTargetDateMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Phase History</h4>
                <EditableTimeline
                  history={selectedSale.phase_history?.length > 0
                    ? selectedSale.phase_history
                    : [{ status: selectedSale.status, entered_date: selectedSale.created_date }]}
                  onSave={(updated) => updateSaleHistoryMutation.mutate({ saleId: selectedSale.id, phase_history: updated })}
                  isSaving={updateSaleHistoryMutation.isPending}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}