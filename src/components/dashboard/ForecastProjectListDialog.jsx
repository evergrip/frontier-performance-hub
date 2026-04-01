import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, EyeOff, Building2, Wrench, Layers } from 'lucide-react';

const buildTypeConfig = {
  in_house: { label: 'In-House', icon: Building2, color: 'text-blue-700 bg-blue-50' },
  subcontractor: { label: 'Sub', icon: Wrench, color: 'text-orange-700 bg-orange-50' },
  mixed: { label: 'Mixed', icon: Layers, color: 'text-purple-700 bg-purple-50' },
};

export default function ForecastProjectListDialog({ open, onOpenChange, projects, preconSales, clients, sales }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ id, isPrecon, include_in_forecast }) => {
      if (isPrecon) return base44.entities.Sale.update(id, { include_in_forecast });
      return base44.entities.Project.update(id, { include_in_forecast });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['sales']);
    }
  });

  const buildTypeMutation = useMutation({
    mutationFn: ({ id, isPrecon, forecast_build_type }) => {
      if (isPrecon) return base44.entities.Sale.update(id, { forecast_build_type });
      return base44.entities.Project.update(id, { forecast_build_type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['sales']);
    }
  });

  const getClientName = (clientId) => {
    const client = (clients || []).find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || '';
  };

  const getProjectClient = (project) => {
    if (project.client_id) return getClientName(project.client_id);
    if (project.sale_id) {
      const sale = (sales || []).find(s => s.id === project.sale_id);
      if (sale?.client_id) return getClientName(sale.client_id);
    }
    return 'Unknown';
  };

  const activeProjects = (projects || []).filter(p => p.status !== 'closed');
  const activeSales = (preconSales || []);

  const stageLabels = {
    awaiting_to_be_scheduled: 'Awaiting Schedule',
    mobilization: 'Mobilization',
    active_construction: 'Active Construction',
    substantial_completion_closeout: 'Closeout',
    feasibility: 'Feasibility',
    design_material_selections: 'Design & Materials',
    engineering_permits: 'Engineering & Permits',
    pending_construction_sale: 'Pending Construction',
  };

  const rows = [
    ...activeProjects.map(p => ({
      id: p.id,
      isPrecon: false,
      name: p.title,
      client: getProjectClient(p),
      value: p.contract_value || 0,
      stage: stageLabels[p.status] || p.status,
      included: p.include_in_forecast !== false,
      buildType: p.forecast_build_type || 'in_house',
    })),
    ...activeSales.map(s => ({
      id: s.id,
      isPrecon: true,
      name: s.title,
      client: getClientName(s.client_id),
      value: s.estimated_construction_budget || 0,
      stage: stageLabels[s.status] || s.status,
      included: s.include_in_forecast !== false,
      buildType: s.forecast_build_type || 'in_house',
    })),
  ];

  const includedCount = rows.filter(r => r.included).length;
  const excludedCount = rows.filter(r => !r.included).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Build Capacity Forecast — Projects</DialogTitle>
          <p className="text-sm text-slate-500">
            {includedCount} included · {excludedCount} excluded · Click the eye icon to toggle, and set in-house vs sub build type.
          </p>
        </DialogHeader>
        <div className="overflow-auto flex-1 -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Incl.</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="w-[110px]">Build Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">No active projects or precon sales.</TableCell>
                </TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={`${row.isPrecon ? 's' : 'p'}-${row.id}`} className={!row.included ? 'opacity-50 bg-slate-50' : ''}>
                    <TableCell>
                      <button
                        className={`p-1 rounded transition-colors ${row.included ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
                        onClick={() => toggleMutation.mutate({ id: row.id, isPrecon: row.isPrecon, include_in_forecast: !row.included })}
                      >
                        {row.included ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">{row.client}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">{row.name}</span>
                        {row.isPrecon && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pre-Con</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{row.stage}</TableCell>
                    <TableCell className="text-right text-sm font-medium">${(row.value / 1000).toFixed(0)}K</TableCell>
                    <TableCell>
                      <Select
                        value={row.buildType}
                        onValueChange={(val) => buildTypeMutation.mutate({ id: row.id, isPrecon: row.isPrecon, forecast_build_type: val })}
                      >
                        <SelectTrigger className={`h-7 text-xs w-full ${buildTypeConfig[row.buildType]?.color || ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_house">In-House</SelectItem>
                          <SelectItem value="subcontractor">Subcontractor</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}