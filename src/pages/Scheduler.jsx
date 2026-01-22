import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getMonth, getYear, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import MonthlyAllocationView from '@/components/scheduler/MonthlyAllocationView';
import DayJobAssignmentModal from '@/components/scheduler/DayJobAssignmentModal';
import DailyStaffScheduleView from '@/components/scheduler/DailyStaffScheduleView';

export default function Scheduler() {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showScheduleView, setShowScheduleView] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState(null);
  const [scheduleEndDate, setScheduleEndDate] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const queryClient = useQueryClient();

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['employeeAssignments'],
    queryFn: async () => {
      return await base44.entities.EmployeeAssignment.list();
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

  const handleMonthClick = (month) => {
    setSelectedMonth(month);
    setShowDayModal(true);
  };

  const getAllocatedProjectsForMonth = (month) => {
    const year = getYear(month);
    const monthNum = getMonth(month) + 1;
    return projects.filter(p =>
      p.monthly_work_allocations?.some(a => a.year === year && a.month === monthNum)
    );
  };

  const handleAssignJobToDay = (data) => {
    const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const projectIndex = projects.findIndex(p => p.id === data.project_id);
    const color = COLORS[projectIndex % COLORS.length];

    // Check if job already exists for this day/project
    const existingAssignment = assignments.find(
      a => a.assignment_date === data.date && a.project_id === data.project_id
    );

    if (existingAssignment) {
      // Update existing job with new employee assignments
      base44.entities.EmployeeAssignment.update(existingAssignment.id, {
        employee_assignments: data.employee_assignments || existingAssignment.employee_assignments
      }).then(() => refetchAssignments());
    } else {
      // Create new job assignment
      createAssignmentMutation.mutate({
        assignment_date: data.date,
        project_id: data.project_id,
        status: 'Assigned',
        employee_assignments: data.employee_assignments || [],
        color: color,
      });
    }
  };

  const updateRefetch = async () => {
    await refetchAssignments();
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Staff Scheduler</h1>
          <p className="text-lg text-slate-500">Allocate work to months, then assign jobs to specific days</p>
        </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Layer 1: Allocations</strong> - Drag projects to months to allocate work. Click a month to assign jobs to specific days.
            </div>
          </div>
        </CardContent>
      </Card>
      <MonthlyAllocationView
        projects={projects}
        onMonthClick={handleMonthClick}
      />

      <DayJobAssignmentModal
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        month={selectedMonth}
        projects={projects}
        allocatedProjects={selectedMonth ? getAllocatedProjectsForMonth(selectedMonth) : []}
        assignments={assignments}
        users={users}
        onAssign={handleAssignJobToDay}
        onRemove={(id) => deleteAssignmentMutation.mutate(id)}
        onCreateSchedule={(startDate, endDate) => {
          setScheduleStartDate(startDate);
          setScheduleEndDate(endDate);
          setShowScheduleView(true);
        }}
      />

      {showScheduleView && (
        <div className="mt-8">
          <DailyStaffScheduleView
            assignments={assignments}
            users={users}
            projects={projects}
            startDate={scheduleStartDate}
            endDate={scheduleEndDate}
            onClose={() => setShowScheduleView(false)}
          />
        </div>
      )}
      </div>
      );
      }