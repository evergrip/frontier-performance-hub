import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Building2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '../components/common/EmptyState';

export default function Sales() {
  const queryClient = useQueryClient();

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
    mutationFn: ({ saleId, status }) => base44.entities.Sale.update(saleId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      toast.success('Sale status updated');
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

  const totalValue = preconstructionSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Preconstruction Pipeline</h1>
        <p className="text-lg text-slate-500">Track preconstruction projects through all phases</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{preconstructionSales.length}</div>
            <div className="text-sm text-slate-500">Active Preconstruction</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">${(totalValue / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-slate-500">Total Pipeline Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{closedSales.length}</div>
            <div className="text-sm text-slate-500">Closed Projects</div>
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
                          
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-slate-700">
                              ${(sale.contract_value / 1000).toFixed(0)}k
                            </span>
                            {sale.estimated_margin && (
                              <span className="text-xs text-slate-500">
                                {sale.estimated_margin}% margin
                              </span>
                            )}
                          </div>

                          {nextStatus && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => updateSaleStatusMutation.mutate({ 
                                saleId: sale.id, 
                                status: nextStatus 
                              })}
                            >
                              <ChevronRight className="w-3 h-3 mr-1" />
                              Move to Next Phase
                            </Button>
                          )}

                          {sale.status === 'pending_construction_sale' && (
                            <Button
                              size="sm"
                              className="w-full text-xs mt-2 bg-amber-600 hover:bg-amber-700"
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
              title="No active preconstruction projects"
              description="Convert leads to sales to populate the preconstruction pipeline"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}