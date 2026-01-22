import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, startOfWeek, addWeeks, subWeeks, getMonth, getYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import MonthlyAllocationView from '@/components/scheduler/MonthlyAllocationView';
import StaffAssignmentView from '@/components/scheduler/StaffAssignmentView';

export default function Scheduler() {
  const [view, setView] = useState('allocations'); // 'allocations' or 'assignments'
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [draggedProject, setDraggedProject] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['employeeAssignments', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addWeeks(currentWeekStart, 1);
      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const allAssignments = await base44.entities.EmployeeAssignment.filter({});
      return allAssignments.filter(a => a.assignment_date >= startDate && a.assignment_date < endDate);
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeAssignment.create(data),
    onSuccess: () => refetchAssignments(),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeAssignment.delete(id),
    onSuccess: () => refetchAssignments(),
  });

  const handleSelectMonth = (projectId) => {
    setSelectedProject(projects.find(p => p.id === projectId));
    setSelectedMonth(new Date());
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setView('assignments');
  };

  const handleBackToAllocations = () => {
    setView('allocations');
    setSelectedProject(null);
  };

  const handleDrop = (employeeId, date, projectId) => {
    createAssignmentMutation.mutate({
      employee_id: employeeId,
      assignment_date: format(date, 'yyyy-MM-dd'),
      project_id: projectId,
      status: selectedProject?.title || 'Assigned',
      color: '#45B7D1',
    });
  };

  const handleClearAssignment = (assignmentId) => {
    deleteAssignmentMutation.mutate(assignmentId);
  };

  const handleWeekChange = (direction) => {
    setCurrentWeekStart(direction > 0 ? addWeeks(currentWeekStart, 1) : subWeeks(currentWeekStart, 1));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Staff Scheduler</h1>
        <p className="text-lg text-slate-500">
          {view === 'allocations'
            ? 'Allocate work to months, then assign to staff'
            : `Assigning staff to ${selectedProject?.title}`}
        </p>
      </div>

      {view === 'allocations' ? (
        <>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>Layer 1: Allocations</strong> - Set what % of each project should be worked on each month.
                  Click "View" on a project to assign that month's work to staff.
                </div>
              </div>
            </CardContent>
          </Card>
          <MonthlyAllocationView
            projects={projects}
            onSelectMonth={handleSelectMonth}
            selectedMonth={selectedMonth}
          />
        </>
      ) : (
        <>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <strong>Layer 2: Staff Assignment</strong> - Only employees assigned to this month's work can be scheduled.
                </div>
              </div>
            </CardContent>
          </Card>
          <StaffAssignmentView
            project={selectedProject}
            month={selectedMonth}
            users={users}
            assignments={assignments}
            onDragStart={setDraggedProject}
            onDrop={handleDrop}
            onClearAssignment={handleClearAssignment}
            onBack={handleBackToAllocations}
            currentWeekStart={currentWeekStart}
            onWeekChange={handleWeekChange}
          />
        </>
      )}
    </div>
  );
}