import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Briefcase, Building2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '../components/common/EmptyState';

export default function Sales() {
  const queryClient = useQueryClient();
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [constructionDialogOpen, setConstructionDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [constructionBudget, setConstructionBudget] = useState('');
  const [constructionForm, setConstructionForm] = useState({
    final_precon_value: '',
    construction_budget: ''
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
    mutationFn: ({ saleId, status, estimated_construction_budget }) => 
      base44.entities.Sale.update(saleId, { status, estimated_construction_budget }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setAdvanceDialogOpen(false);
      setConstructionBudget('');
      toast.success('Sale status updated');
    }
  });

  const convertToConstructionMutation = useMutation({
    mutationFn: async ({ preconSale, final_precon_value, construction_budget }) => {
      // Update preconstruction sale with final value
      await base44.entities.Sale.update(preconSale.id, {
        contract_value: parseFloat(final_precon_value),
        status: 'closed_won'
      });

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

      // Create construction project
      const project = await base44.entities.Project.create({
        title: preconSale.title,
        client_id: preconSale.client_id,
        sale_id: constructionSale.id,
        project_type: 'construction',
        status: 'planning',
        contract_value: parseFloat(construction_budget)
      });

      // Link construction sale to project
      await base44.entities.Sale.update(constructionSale.id, {
        converted_to_project_id: project.id
      });

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

  const handleAdvancePhase = (e) => {
    e.preventDefault();
    const nextStatus = getNextStatus(selectedSale.status);
    if (!nextStatus) return;

    updateSaleStatusMutation.mutate({
      saleId: selectedSale.id,
      status: nextStatus,
      estimated_construction_budget: parseFloat(constructionBudget) || null
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

  const totalValue = preconstructionSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);

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
                <div className="space-y-3">
                  {columnSales.map(sale => {
                    const nextStatus = getNextStatus(sale.status);
                    return (
                      <Card key={sale.id} className={`border-2 ${column.color} hover:shadow-lg transition-shadow`}>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-slate-900 mb-1">{sale.title}</h4>
                          <p className="text-xs text-slate-500 mb-2">{getClientName(sale.client_id)}</p>
                          
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
                          </div>

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
                            <Button
                              size="sm"
                              className="w-full text-xs mt-2 bg-amber-600 hover:bg-amber-700"
                              onClick={() => openConstructionDialog(sale)}
                            >
                              <Building2 className="w-3 h-3 mr-1" />
                              Convert to Construction
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
            <DialogTitle>Update Construction Budget</DialogTitle>
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
                Final construction contract value
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
    </div>
  );
}