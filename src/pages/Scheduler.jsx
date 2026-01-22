import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, eachMonthOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SchedulerLayer1 from '@/components/scheduler/SchedulerLayer1';
import SchedulerLayer2 from '@/components/scheduler/SchedulerLayer2';
import AllocationEditor from '@/components/scheduler/AllocationEditor';

export default function Scheduler() {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [viewMode, setViewMode] = useState('layer1'); // 'layer1' or 'layer2'
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['employeeAssignments', selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return [];
      const allAssignments = await base44.entities.EmployeeAssignment.filter({});
      const monthStart = format(selectedMonth, 'yyyy-MM-01');
      const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      return allAssignments.filter(a => a.assignment_date >= monthStart && a.assignment_date <= monthEnd);
    },
    enabled: !!selectedMonth,
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(data.id, { monthly_work_allocations: data.allocations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProjectId(null);
    },
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));

  const handleDrillDown = (month) => {
    setSelectedMonth(month);
    setViewMode('layer2');
  };

  const handleBackToLayer1 = () => {
    setViewMode('layer1');
    setSelectedMonth(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Staff Scheduler</h1>
        <p className="text-lg text-slate-500">
          {viewMode === 'layer1' 
            ? 'Plan monthly work allocations, then drill down to assign staff' 
            : 'Assign staff to jobs for the selected month'}
        </p>
      </div>

      {viewMode === 'layer1' ? (
        <SchedulerLayer1 
          projects={projects}
          currentDate={currentDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onDrillDown={handleDrillDown}
          onEditAllocations={setEditingProjectId}
          updateAllocation={updateProjectMutation}
        />
      ) : (
        <SchedulerLayer2
          selectedMonth={selectedMonth}
          users={users}
          assignments={assignments}
          onBack={handleBackToLayer1}
          refetchAssignments={refetchAssignments}
        />
      )}

      {/* Allocation Editor Dialog */}
      <Dialog open={!!editingProjectId} onOpenChange={(open) => !open && setEditingProjectId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Monthly Work Allocations</DialogTitle>
          </DialogHeader>
          {editingProjectId && (
            <AllocationEditor
              project={projects.find(p => p.id === editingProjectId)}
              onSave={(allocations) => updateProjectMutation.mutate({ id: editingProjectId, allocations })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}