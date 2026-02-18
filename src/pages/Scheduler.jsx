import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getMonth, getYear, startOfMonth } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CalendarOff, UserX, CalendarPlus, UserPlus } from 'lucide-react';
import { createPageUrl } from '../utils';
import MonthlyAllocationView from '@/components/scheduler/MonthlyAllocationView';
import DayJobAssignmentModal from '@/components/scheduler/DayJobAssignmentModal';
import BulkAssignDialog from '@/components/scheduler/BulkAssignDialog';
import EmployeeProjectAssignDialog from '@/components/scheduler/EmployeeProjectAssignDialog';
import HolidayManager from '@/components/scheduler/HolidayManager';
import StaffUnavailabilityManager from '@/components/scheduler/StaffUnavailabilityManager';

export default function Scheduler() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showUnavailability, setShowUnavailability] = useState(false);
  const [showEmployeeAssign, setShowEmployeeAssign] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const projects = allProjects.filter(p => p.status !== 'closed');

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['employeeAssignments'],
    queryFn: () => base44.entities.EmployeeAssignment.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: unavailabilities = [] } = useQuery({
    queryKey: ['unavailabilities'],
    queryFn: () => base44.entities.EmployeeUnavailability.list(),
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

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

  const handleAssignJobToDay = (data) => {
    const projectIndex = projects.findIndex(p => p.id === data.project_id);
    const color = COLORS[projectIndex % COLORS.length];

    const existingAssignment = assignments.find(
      a => a.assignment_date === data.date && a.project_id === data.project_id
    );

    if (existingAssignment) {
      base44.entities.EmployeeAssignment.update(existingAssignment.id, {
        employee_assignments: data.employee_assignments || existingAssignment.employee_assignments,
        notes: data.notes || existingAssignment.notes
      }).then(() => refetchAssignments());
    } else {
      createAssignmentMutation.mutate({
        assignment_date: data.date,
        project_id: data.project_id,
        status: 'Assigned',
        employee_assignments: data.employee_assignments || [],
        color: color,
        notes: data.notes || ''
      });
    }
  };

  const handleBulkAssign = useCallback(async ({ projectId, employees, days, hoursPerDay, holidayNotes, skipUnavailable }) => {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    const color = COLORS[projectIndex % COLORS.length];

    for (const dateStr of days) {
      const existingAssignment = assignments.find(
        a => a.assignment_date === dateStr && a.project_id === projectId
      );

      const employeeAssignments = employees.map(empId => ({
        employee_id: empId,
        hours: hoursPerDay
      }));

      const notes = holidayNotes?.[dateStr] ? `Holiday work: ${holidayNotes[dateStr]}` : '';

      if (existingAssignment) {
        const merged = [...(existingAssignment.employee_assignments || [])];
        for (const ea of employeeAssignments) {
          if (!merged.some(m => m.employee_id === ea.employee_id)) {
            merged.push(ea);
          }
        }
        await base44.entities.EmployeeAssignment.update(existingAssignment.id, {
          employee_assignments: merged,
          notes: notes || existingAssignment.notes
        });
      } else {
        await base44.entities.EmployeeAssignment.create({
          assignment_date: dateStr,
          project_id: projectId,
          status: 'Assigned',
          employee_assignments: employeeAssignments,
          color,
          notes
        });
      }
    }
    refetchAssignments();
  }, [projects, assignments, refetchAssignments]);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Staff Scheduler</h1>
          <p className="text-lg text-slate-500">Assign projects to months, then manage daily job & staff assignments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowBulkAssign(true)} className="bg-blue-600 hover:bg-blue-700">
            <CalendarPlus className="w-4 h-4 mr-2" /> Bulk Assign
          </Button>
          <Button onClick={() => setShowEmployeeAssign(true)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            <UserPlus className="w-4 h-4 mr-2" /> Assign Employee
          </Button>
          <Button variant="outline" onClick={() => setShowUnavailability(true)}>
            <UserX className="w-4 h-4 mr-2" /> Staff Availability
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowHolidays(true)}>
              <CalendarOff className="w-4 h-4 mr-2" /> Holidays
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>How it works:</strong> Drag projects to months to schedule them. Click a month to assign jobs to specific days.
              Use <strong>Bulk Assign</strong> to assign a project and employees across many days at once.
            </div>
          </div>
        </CardContent>
      </Card>

      <MonthlyAllocationView
        projects={projects}
        holidays={holidays}
        assignments={assignments}
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
        holidays={holidays}
        onAssign={handleAssignJobToDay}
        onRemove={(id) => deleteAssignmentMutation.mutate(id)}
        onCreateSchedule={(startDate, endDate) => {
          const start = startDate.toISOString();
          const end = endDate.toISOString();
          navigate(`${createPageUrl('ScheduleView')}?startDate=${start}&endDate=${end}`);
        }}
      />

      <BulkAssignDialog
        isOpen={showBulkAssign}
        onClose={() => setShowBulkAssign(false)}
        projects={projects}
        users={users}
        holidays={holidays}
        assignments={assignments}
        unavailabilities={unavailabilities}
        onBulkAssign={handleBulkAssign}
      />

      <HolidayManager isOpen={showHolidays} onClose={() => setShowHolidays(false)} />

      <StaffUnavailabilityManager
        isOpen={showUnavailability}
        onClose={() => setShowUnavailability(false)}
        users={users}
      />

      <EmployeeProjectAssignDialog
        isOpen={showEmployeeAssign}
        onClose={() => setShowEmployeeAssign(false)}
        projects={projects}
        users={users}
        holidays={holidays}
        assignments={assignments}
        unavailabilities={unavailabilities}
        onAssign={async ({ projectId, employeeId, days }) => {
          const projectIndex = projects.findIndex(p => p.id === projectId);
          const color = COLORS[projectIndex % COLORS.length];

          for (const { date, hours } of days) {
            const existing = assignments.find(a => a.assignment_date === date && a.project_id === projectId);
            if (existing) {
              const merged = [...(existing.employee_assignments || [])];
              const empIdx = merged.findIndex(m => m.employee_id === employeeId);
              if (empIdx >= 0) {
                merged[empIdx].hours = hours;
              } else {
                merged.push({ employee_id: employeeId, hours });
              }
              await base44.entities.EmployeeAssignment.update(existing.id, { employee_assignments: merged });
            } else {
              await base44.entities.EmployeeAssignment.create({
                assignment_date: date,
                project_id: projectId,
                status: 'Assigned',
                employee_assignments: [{ employee_id: employeeId, hours }],
                color
              });
            }
          }
          refetchAssignments();
        }}
      />
    </div>
  );
}