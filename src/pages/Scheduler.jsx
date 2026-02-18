import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getMonth, getYear, startOfMonth } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarOff, UserX, CalendarPlus, UserPlus, Wrench, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '../utils';
import MonthlyAllocationView from '@/components/scheduler/MonthlyAllocationView';
import DayJobAssignmentModal from '@/components/scheduler/DayJobAssignmentModal';
import BulkAssignDialog from '@/components/scheduler/BulkAssignDialog';
import EmployeeProjectAssignDialog from '@/components/scheduler/EmployeeProjectAssignDialog';
import HolidayManager from '@/components/scheduler/HolidayManager';
import StaffUnavailabilityManager from '@/components/scheduler/StaffUnavailabilityManager';
import SubtradeManager from '@/components/scheduler/SubtradeManager';
import SubtradeAssignDialog from '@/components/scheduler/SubtradeAssignDialog';

export default function Scheduler() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showUnavailability, setShowUnavailability] = useState(false);
  const [showEmployeeAssign, setShowEmployeeAssign] = useState(false);
  const [showSubtradeManager, setShowSubtradeManager] = useState(false);
  const [showSubtradeAssign, setShowSubtradeAssign] = useState(false);
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

  const { data: subtrades = [] } = useQuery({
    queryKey: ['subtrades'],
    queryFn: () => base44.entities.Subtrade.list(),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeAssignment.create(data),
    onSuccess: () => refetchAssignments(),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeAssignment.delete(id),
    onSuccess: () => refetchAssignments(),
  });

  // Compute unassigned warnings: assignments with no staff (subtrades don't count)
  const unassignedWarnings = React.useMemo(() => {
    return assignments.filter(a => {
      const staffCount = a.employee_assignments?.length || 0;
      return staffCount === 0;
    });
  }, [assignments]);

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
        subtrade_assignments: [],
        color: color,
        notes: data.notes || ''
      });
    }
  };

  const handleBulkAssign = useCallback(async ({ projectId, days, holidayNotes }) => {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    const color = COLORS[projectIndex % COLORS.length];

    for (const dateStr of days) {
      const existingAssignment = assignments.find(
        a => a.assignment_date === dateStr && a.project_id === projectId
      );
      const notes = holidayNotes?.[dateStr] ? `Holiday work: ${holidayNotes[dateStr]}` : '';

      if (!existingAssignment) {
        await base44.entities.EmployeeAssignment.create({
          assignment_date: dateStr,
          project_id: projectId,
          status: 'Assigned',
          employee_assignments: [],
          subtrade_assignments: [],
          color,
          notes
        });
      }
    }
    refetchAssignments();
  }, [projects, assignments, refetchAssignments]);

  const handleOverrunExtend = useCallback(async ({ projectId, employeeId, originalDate, newDate, explanation }) => {
    // Update project target_completion_date
    await base44.entities.Project.update(projectId, { target_completion_date: newDate });
    // Create overrun record
    await base44.entities.ProjectOverrun.create({
      project_id: projectId,
      employee_id: employeeId,
      original_target_completion_date: originalDate,
      new_target_completion_date: newDate,
      explanation,
      explained_by_user_id: user?.id
    });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }, [user, queryClient]);

  const handleSubtradeAssign = useCallback(async ({ projectId, subtradeId, days, notes }) => {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    const color = COLORS[projectIndex % COLORS.length];

    for (const dateStr of days) {
      const existing = assignments.find(a => a.assignment_date === dateStr && a.project_id === projectId);
      if (existing) {
        const merged = [...(existing.subtrade_assignments || [])];
        if (!merged.some(s => s.subtrade_id === subtradeId)) {
          merged.push({ subtrade_id: subtradeId, notes });
        }
        await base44.entities.EmployeeAssignment.update(existing.id, { subtrade_assignments: merged });
      } else {
        await base44.entities.EmployeeAssignment.create({
          assignment_date: dateStr,
          project_id: projectId,
          status: 'Assigned',
          employee_assignments: [],
          subtrade_assignments: [{ subtrade_id: subtradeId, notes }],
          color,
          notes: ''
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
            <CalendarPlus className="w-4 h-4 mr-2" /> Schedule Days
          </Button>
          <Button onClick={() => setShowEmployeeAssign(true)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            <UserPlus className="w-4 h-4 mr-2" /> Assign Employee
          </Button>
          <Button onClick={() => setShowSubtradeAssign(true)} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
            <Wrench className="w-4 h-4 mr-2" /> Assign Subtrade
          </Button>
          <Button variant="outline" onClick={() => setShowUnavailability(true)}>
            <UserX className="w-4 h-4 mr-2" /> Staff Availability
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setShowHolidays(true)}>
                <CalendarOff className="w-4 h-4 mr-2" /> Holidays
              </Button>
              <Button variant="outline" onClick={() => setShowSubtradeManager(true)} className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <Wrench className="w-4 h-4 mr-2" /> Manage Subtrades
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Unassigned warnings */}
      {unassignedWarnings.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>{unassignedWarnings.length} scheduled job(s) have no staff assigned.</strong>
                <div className="flex flex-wrap gap-1 mt-2">
                  {unassignedWarnings.slice(0, 10).map(a => {
                    const project = projects.find(p => p.id === a.project_id);
                    return (
                      <Badge key={a.id} variant="outline" className="text-xs text-amber-700 border-amber-300">
                        {project?.title || 'Unknown'} — {a.assignment_date}
                      </Badge>
                    );
                  })}
                  {unassignedWarnings.length > 10 && (
                    <span className="text-xs text-amber-600">+{unassignedWarnings.length - 10} more</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>How it works:</strong> Drag projects to months to schedule them. Click a month to assign jobs to specific days.
              Use <strong>Schedule Days</strong> to add project days, then <strong>Assign Employee</strong> or <strong>Assign Subtrade</strong> to staff them.
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
        subtrades={subtrades}
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
        holidays={holidays}
        onBulkAssign={handleBulkAssign}
      />

      <HolidayManager isOpen={showHolidays} onClose={() => setShowHolidays(false)} />

      <StaffUnavailabilityManager
        isOpen={showUnavailability}
        onClose={() => setShowUnavailability(false)}
        users={users}
      />

      <SubtradeManager
        isOpen={showSubtradeManager}
        onClose={() => setShowSubtradeManager(false)}
      />

      <SubtradeAssignDialog
        isOpen={showSubtradeAssign}
        onClose={() => setShowSubtradeAssign(false)}
        projects={projects}
        subtrades={subtrades}
        onAssign={handleSubtradeAssign}
      />

      <EmployeeProjectAssignDialog
        isOpen={showEmployeeAssign}
        onClose={() => setShowEmployeeAssign(false)}
        projects={projects}
        users={users}
        holidays={holidays}
        assignments={assignments}
        unavailabilities={unavailabilities}
        subtrades={subtrades}
        onOverrunExtend={handleOverrunExtend}
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
                subtrade_assignments: [],
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