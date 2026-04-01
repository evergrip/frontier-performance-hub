import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const buildTypeConfig = {
  in_house: { label: 'In-House', color: 'text-blue-700 bg-blue-50' },
  subcontractor: { label: 'Sub', color: 'text-orange-700 bg-orange-50' },
  mixed: { label: 'Mixed', color: 'text-purple-700 bg-purple-50' },
};

export default function ForecastProjectListDialog({ open, onOpenChange, defaultTab, projects, preconSales, clients, sales, settings }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(defaultTab || 'projects');

  useEffect(() => {
    if (open && defaultTab) setTab(defaultTab);
  }, [open, defaultTab]);

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

  const activeProjects = (projects || []).filter(p => p.status !== 'closed');
  const activeSalesItems = preconSales || [];

  const rows = [
    ...activeProjects.map(p => ({
      id: p.id, isPrecon: false, name: p.title,
      client: getProjectClient(p), value: p.contract_value || 0,
      stage: stageLabels[p.status] || p.status,
      included: p.include_in_forecast !== false,
      buildType: p.forecast_build_type || 'in_house',
    })),
    ...activeSalesItems.map(s => ({
      id: s.id, isPrecon: true, name: s.title,
      client: getClientName(s.client_id), value: s.estimated_construction_budget || 0,
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
          <DialogTitle>Build Capacity Forecast</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="projects">Projects & Pipeline</TabsTrigger>
            <TabsTrigger value="capacity">Monthly Capacity</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="flex-1 overflow-auto mt-2">
            <p className="text-sm text-slate-500 mb-3">
              {includedCount} included · {excludedCount} excluded · Toggle the eye icon and set build type.
            </p>
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
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No active projects or precon sales.</TableCell></TableRow>
                ) : rows.map(row => (
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
                      <Select value={row.buildType} onValueChange={(val) => buildTypeMutation.mutate({ id: row.id, isPrecon: row.isPrecon, forecast_build_type: val })}>
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
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="capacity" className="flex-1 overflow-auto mt-2">
            <CapacityEditor settings={settings} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CapacityEditor({ settings }) {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState(() => {
    return [...(settings?.monthly_capacity_schedule || [])].sort((a, b) =>
      a.effective_year !== b.effective_year ? a.effective_year - b.effective_year : a.effective_month - b.effective_month
    );
  });
  const [saving, setSaving] = useState(false);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const defaultCapacity = settings?.fiscal_year_start_month
    ? null
    : null;

  const addEntry = () => {
    const lastEntry = schedule[schedule.length - 1];
    let nextYear = lastEntry?.effective_year || currentYear;
    let nextMonth = (lastEntry?.effective_month || 0) + 1;
    if (nextMonth > 12) { nextMonth = 1; nextYear++; }
    setSchedule([...schedule, { effective_year: nextYear, effective_month: nextMonth, monthly_capacity: lastEntry?.monthly_capacity || 0, notes: '' }]);
  };

  const updateEntry = (idx, field, value) => {
    const updated = [...schedule];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedule(updated);
  };

  const removeEntry = (idx) => {
    setSchedule(schedule.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    const settingsRecords = await base44.entities.CompanySettings.list();
    if (settingsRecords.length > 0) {
      await base44.entities.CompanySettings.update(settingsRecords[0].id, { monthly_capacity_schedule: schedule });
    }
    queryClient.invalidateQueries(['companySettings']);
    toast.success('Capacity schedule saved');
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-slate-700">Monthly Capacity Schedule</p>
          <p className="text-xs text-slate-500">
            Set how much revenue your crew can produce each month. If no entries, defaults to annual target ÷ 12.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addEntry}>
          <Plus className="w-3 h-3 mr-1" /> Add Entry
        </Button>
      </div>

      {schedule.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p>No manual capacity entries. Using annual target ÷ 12.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={addEntry}>Add your first entry</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Effective Date</TableHead>
              <TableHead>Monthly Capacity ($)</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((entry, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <div className="flex gap-2">
                    <Select value={String(entry.effective_month)} onValueChange={(v) => updateEntry(idx, 'effective_month', parseInt(v))}>
                      <SelectTrigger className="h-8 w-[90px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={entry.effective_year || ''}
                      onChange={(e) => updateEntry(idx, 'effective_year', parseInt(e.target.value) || currentYear)}
                      className="h-8 w-[80px] text-xs"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={entry.monthly_capacity || ''}
                    onChange={(e) => updateEntry(idx, 'monthly_capacity', parseFloat(e.target.value) || 0)}
                    className="h-8 w-[140px] text-xs"
                    placeholder="e.g. 250000"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={entry.notes || ''}
                    onChange={(e) => updateEntry(idx, 'notes', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Optional notes"
                  />
                </TableCell>
                <TableCell>
                  <button onClick={() => removeEntry(idx)} className="p-1 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save Capacity Schedule'}
        </Button>
      </div>
    </div>
  );
}