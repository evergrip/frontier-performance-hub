import React, { useState, useMemo } from 'react';
import { format, startOfMonth, addMonths, getMonth, getYear, endOfMonth, isBefore, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, CalendarOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const getProjectColor = (project, index) => project.color || COLORS[index % COLORS.length];

export default function MonthlyAllocationView({ projects, holidays = [], assignments = [], onMonthClick, onRemoveAllocation }) {
  const schedulableProjects = projects.filter(p => p.status !== 'awaiting_to_be_scheduled');
  
  const [startMonth, setStartMonth] = useState(startOfMonth(new Date()));
  const [draggedProject, setDraggedProject] = useState(null);
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
      const completionDate = new Date(sale.target_precon_completion_date);
      const monthKey = format(completionDate, 'yyyy-MM');
      if (!forecastByMonth[monthKey]) forecastByMonth[monthKey] = 0;
      forecastByMonth[monthKey] += sale.estimated_construction_budget;
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
    return projects.find(p => p.id === projectId)
      ?.monthly_work_allocations?.find(a => a.year === getYear(month) && a.month === getMonth(month) + 1)
      ?.percentage || 0;
  };

  const isProjectInMonth = (projectId, month) => getProjectAllocation(projectId, month) > 0;

  const handleDragStart = (project) => setDraggedProject(project);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (month) => {
    if (!draggedProject) return;
    
    const project = projects.find(p => p.id === draggedProject.id) || draggedProject;
    const allocations = [...(project.monthly_work_allocations || [])];
    
    const existingIndex = allocations.findIndex(
      a => a.year === getYear(month) && a.month === getMonth(month) + 1
    );

    if (existingIndex < 0) {
      allocations.push({
        year: getYear(month),
        month: getMonth(month) + 1,
        percentage: 0,
      });
    }

    updateProjectMutation.mutate({ projectId: project.id, allocations });
    setDraggedProject(null);
  };

  const handleRemoveAllocation = async (projectId, month) => {
    const project = projects.find(p => p.id === projectId);
    const allocations = (project?.monthly_work_allocations || []).filter(
      a => !(a.year === getYear(month) && a.month === getMonth(month) + 1)
    );
    updateProjectMutation.mutate({ projectId, allocations });

    // Delete future assignments for this project in this month, keep past ones
    const today = startOfDay(new Date());
    const monthEnd = endOfMonth(month);
    const monthKey = format(month, 'yyyy-MM');

    const futureAssignments = assignments.filter(a => {
      if (a.project_id !== projectId) return false;
      if (!a.assignment_date?.startsWith(monthKey)) return false;
      const assignDate = new Date(a.assignment_date + 'T00:00:00');
      return !isBefore(assignDate, today); // today or future
    });

    for (const a of futureAssignments) {
      await base44.entities.EmployeeAssignment.delete(a.id);
    }

    if (futureAssignments.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['employeeAssignments'] });
    }

    if (onRemoveAllocation) {
      onRemoveAllocation(projectId, month, futureAssignments.length);
    }
  };

  const getHolidayCountForMonth = (month) => {
    const monthStr = format(month, 'yyyy-MM');
    return holidays.filter(h => h.date?.startsWith(monthStr)).length;
  };

  // Build a map of projectId -> Set of month keys that have scheduled assignments
  const assignmentsByMonth = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      if (!a.assignment_date || !a.project_id) return;
      const monthKey = a.assignment_date.substring(0, 7); // "yyyy-MM"
      if (!map[monthKey]) map[monthKey] = new Set();
      map[monthKey].add(a.project_id);
    });
    return map;
  }, [assignments]);

  const getProjectsForMonth = (month) => {
    const monthKey = format(month, 'yyyy-MM');
    const allocatedIds = new Set(
      schedulableProjects.filter(p => isProjectInMonth(p.id, month)).map(p => p.id)
    );
    const scheduledIds = assignmentsByMonth[monthKey] || new Set();
    // Merge: allocated projects + any scheduled-only projects
    const allIds = new Set([...allocatedIds, ...scheduledIds]);
    return projects.filter(p => allIds.has(p.id));
  };

  return (
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
              style={{
                backgroundColor: getProjectColor(project, index),
                borderColor: getProjectColor(project, index),
              }}
            >
              <div className="font-medium text-sm">{project.title}</div>
              <div className="text-xs opacity-90 mt-1">${project.contract_value?.toLocaleString() || '0'}</div>
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
          <CardTitle>Drag projects to schedule by month</CardTitle>
          <div className="w-20" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {months.map(month => {
              const holidayCount = getHolidayCountForMonth(month);
              return (
                <div
                  key={format(month, 'yyyy-MM')}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(month)}
                  onClick={() => onMonthClick(month)}
                  className="p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all min-h-80 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-slate-900">{format(month, 'MMM yyyy')}</div>
                    {holidayCount > 0 && (
                      <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                        <CalendarOff className="w-3 h-3 mr-1" /> {holidayCount}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    {schedulableProjects
                      .filter(project => isProjectInMonth(project.id, month))
                      .map((project, idx) => (
                        <div
                          key={project.id}
                          className="p-2 rounded text-white text-xs"
                          style={{ backgroundColor: getProjectColor(project, idx) }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1">
                              <div className="font-medium">{project.title}</div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveAllocation(project.id, month); }}
                              className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    {preconForecastByMonth[format(month, 'yyyy-MM')] && (
                      <div className="text-xs text-emerald-600 font-medium">
                        Precon Pipeline: ${Math.round(preconForecastByMonth[format(month, 'yyyy-MM')]).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}