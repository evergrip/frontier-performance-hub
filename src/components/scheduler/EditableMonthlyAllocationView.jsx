import React, { useState, useMemo } from 'react';
import { format, startOfMonth, addMonths, getMonth, getYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import EditableAllocationDialog from './EditableAllocationDialog';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
const getProjectColor = (project, index) => project.color || COLORS[index % COLORS.length];

export default function EditableMonthlyAllocationView({ projects, onMonthClick }) {
  const schedulableProjects = projects.filter(p => p.status !== 'awaiting_to_be_scheduled');

  const [startMonth, setStartMonth] = useState(startOfMonth(new Date()));
  const [draggedProject, setDraggedProject] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState(null);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const queryClient = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const preconForecastByMonth = useMemo(() => {
    const activePipeline = sales.filter(sale =>
      sale.sale_type === 'preconstruction' &&
      sale.status !== 'closed_won' &&
      sale.status !== 'closed_lost'
    );
    const forecastByMonth = {};
    activePipeline.forEach(sale => {
      if (!sale.target_precon_completion_date || !sale.estimated_construction_budget) return;
      const monthKey = format(new Date(sale.target_precon_completion_date), 'yyyy-MM');
      forecastByMonth[monthKey] = (forecastByMonth[monthKey] || 0) + sale.estimated_construction_budget;
    });
    return forecastByMonth;
  }, [sales]);

  const months = Array.from({ length: 12 }, (_, i) => addMonths(startMonth, i));

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, allocations }) =>
      base44.entities.Project.update(projectId, { monthly_work_allocations: allocations }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const getProjectAllocation = (projectId, month) => {
    return projects
      .find(p => p.id === projectId)
      ?.monthly_work_allocations?.find(
        a => a.year === getYear(month) && a.month === getMonth(month) + 1
      )?.percentage || 0;
  };

  const getAllocationAmount = (projectId, month) => {
    const project = projects.find(p => p.id === projectId);
    return (project?.contract_value || 0) * (getProjectAllocation(projectId, month) / 100);
  };

  const getMonthlyTotal = (month) =>
    projects.reduce((sum, p) => sum + getAllocationAmount(p.id, month), 0);

  const getTotalAllocated = (projectId) =>
    projects.find(p => p.id === projectId)
      ?.monthly_work_allocations?.reduce((sum, a) => sum + (a.percentage || 0), 0) || 0;

  const handleDragStart = (project) => setDraggedProject(project);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (month) => {
    if (!draggedProject) return;
    const currentPct = getProjectAllocation(draggedProject.id, month);
    setPendingAllocation({ project: draggedProject, month });
    setEditingAllocation(currentPct);
    setDialogOpen(true);
  };

  const handleClickAllocation = (e, project, month) => {
    e.stopPropagation();
    const currentPct = getProjectAllocation(project.id, month);
    setPendingAllocation({ project, month });
    setEditingAllocation(currentPct);
    setDialogOpen(true);
  };

  const handleAllocationConfirm = (percentage) => {
    if (!pendingAllocation) return;
    const { project, month } = pendingAllocation;
    const allocations = [...(project.monthly_work_allocations || [])];
    const existingIndex = allocations.findIndex(
      a => a.year === getYear(month) && a.month === getMonth(month) + 1
    );
    if (existingIndex >= 0) {
      allocations[existingIndex] = { ...allocations[existingIndex], percentage };
    } else {
      allocations.push({ year: getYear(month), month: getMonth(month) + 1, period: format(month, 'yyyy-MM'), percentage });
    }
    updateProjectMutation.mutate({ projectId: project.id, allocations });
    closeDialog();
  };

  const handleAllocationRemove = () => {
    if (!pendingAllocation) return;
    const { project, month } = pendingAllocation;
    const allocations = (project.monthly_work_allocations || []).filter(
      a => !(a.year === getYear(month) && a.month === getMonth(month) + 1)
    );
    updateProjectMutation.mutate({ projectId: project.id, allocations });
    closeDialog();
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setPendingAllocation(null);
    setEditingAllocation(null);
    setDraggedProject(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Projects Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {schedulableProjects.map((project, index) => (
              <div
                key={project.id}
                draggable
                onDragStart={() => handleDragStart(project)}
                className="p-3 rounded-lg border-2 cursor-move hover:shadow-md transition-all text-white"
                style={{ backgroundColor: getProjectColor(project, index), borderColor: getProjectColor(project, index) }}
              >
                <div className="font-medium text-sm">{project.title}</div>
                <div className="text-xs opacity-90 mt-1">${project.contract_value?.toLocaleString() || '0'}</div>
                <Badge variant="outline" className="text-xs">
                  {getTotalAllocated(project.id)}% allocated
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Months Grid */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setStartMonth(addMonths(startMonth, -1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setStartMonth(addMonths(startMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <CardTitle>Drag projects to allocate work by month</CardTitle>
            <div className="w-20" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {months.map(month => (
                <div
                  key={format(month, 'yyyy-MM')}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(month)}
                  onClick={() => onMonthClick(month)}
                  className="p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all min-h-80 cursor-pointer"
                >
                  <div className="font-semibold text-slate-900 mb-2">{format(month, 'MMM yyyy')}</div>

                  <div className="space-y-2 mb-4">
                    {schedulableProjects
                      .filter(project => getProjectAllocation(project.id, month) > 0)
                      .map((project, idx) => (
                        <div
                          key={project.id}
                          className="p-2 rounded text-white text-xs cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: getProjectColor(project, idx) }}
                          onClick={(e) => handleClickAllocation(e, project, month)}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="font-medium">{project.title}</div>
                              <div className="opacity-80">
                                {getProjectAllocation(project.id, month)}% = ${getAllocationAmount(project.id, month).toLocaleString()}
                              </div>
                            </div>
                            <div className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0">
                              <Pencil className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <div className="text-sm font-semibold text-slate-700">
                      Total: ${getMonthlyTotal(month).toLocaleString()}
                    </div>
                    {preconForecastByMonth[format(month, 'yyyy-MM')] && (
                      <div className="text-xs text-emerald-600 font-medium">
                        Precon Pipeline: ${Math.round(preconForecastByMonth[format(month, 'yyyy-MM')]).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <EditableAllocationDialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        onConfirm={handleAllocationConfirm}
        onRemove={handleAllocationRemove}
        project={pendingAllocation?.project}
        month={pendingAllocation?.month ? format(pendingAllocation.month, 'MMM yyyy') : ''}
        currentPercentage={editingAllocation || 0}
      />
    </>
  );
}