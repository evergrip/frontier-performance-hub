import React, { useState, useMemo } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, CalendarOff, AlertTriangle, Wrench } from 'lucide-react';
import EmployeeAssignmentModal from './EmployeeAssignmentModal';
import DateRangePickerModal from './DateRangePickerModal';
import HolidayWorkApprovalDialog from './HolidayWorkApprovalDialog';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
const getProjectColor = (index) => COLORS[index % COLORS.length];

export default function DayJobAssignmentModal({
  isOpen,
  onClose,
  month,
  projects,
  allocatedProjects,
  assignments,
  users,
  holidays = [],
  subtrades = [],
  onAssign,
  onRemove,
  onCreateSchedule
}) {
  const [expandedDay, setExpandedDay] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [dateRangeModalOpen, setDateRangeModalOpen] = useState(false);
  const [holidayApproval, setHolidayApproval] = useState(null);

  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => { map[h.date] = h.name; });
    return map;
  }, [holidays]);

  if (!isOpen || !month) return null;

  const monthStart = startOfMonth(month);
  const daysInMonth = getDaysInMonth(month);
  const startingDayOfWeek = monthStart.getDay();
  
  const emptySlots = Array(startingDayOfWeek).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
  const allDays = [...emptySlots, ...days];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getAssignmentsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return assignments.filter(a => a.assignment_date === dateStr);
  };

  const handleAddJobToDay = (day, projectId) => {
    const dateStr = format(day, 'yyyy-MM-dd');

    if (holidayMap[dateStr]) {
      setHolidayApproval({
        date: dateStr,
        holidayName: holidayMap[dateStr],
        projectId
      });
      return;
    }

    onAssign({ date: dateStr, project_id: projectId });
  };

  const handleHolidayApproved = (reason) => {
    if (!holidayApproval) return;
    onAssign({
      date: holidayApproval.date,
      project_id: holidayApproval.projectId,
      notes: `Holiday work approved: ${reason}`
    });
    setHolidayApproval(null);
  };

  const handleJobClick = (assignment, day) => {
    const project = projects.find(p => p.id === assignment.project_id);
    setSelectedJob({
      assignment,
      project,
      day: format(day, 'MMM d, yyyy'),
      existingEmployees: assignment.employee_assignments || []
    });
    setEmployeeModalOpen(true);
  };

  const handleAssignEmployee = (employees) => {
    if (selectedJob) {
      onAssign({
        date: selectedJob.assignment.assignment_date,
        project_id: selectedJob.assignment.project_id,
        employee_assignments: employees
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Jobs to Days - {format(month, 'MMMM yyyy')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available jobs */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Projects Scheduled for {format(month, 'MMMM')}:</h3>
            <div className="flex flex-wrap gap-2">
              {allocatedProjects.map((project) => (
                <Badge
                  key={project.id}
                  className="px-3 py-2 text-white"
                  style={{ backgroundColor: getProjectColor(projects.findIndex(p => p.id === project.id)) }}
                >
                  {project.title}
                </Badge>
              ))}
              {allocatedProjects.length === 0 && (
                <p className="text-sm text-slate-500">No projects scheduled. Drag projects to this month first.</p>
              )}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <div key={day} className="font-semibold text-center text-slate-600 text-sm py-2">
                {day}
              </div>
            ))}

            {allDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="border rounded-lg p-2 min-h-32 bg-gray-100" />;
              }

              const dayStr = format(day, 'yyyy-MM-dd');
              const dayAssignmentsList = getAssignmentsForDay(day);
              const isExpanded = expandedDay === dayStr;
              const isHoliday = !!holidayMap[dayStr];

              return (
                <div
                  key={dayStr}
                  className={`border rounded-lg p-2 min-h-32 transition-colors ${
                    isHoliday
                      ? 'bg-red-50 border-red-200 hover:bg-red-100'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <div className="font-semibold text-slate-900 text-sm">{format(day, 'd')}</div>
                      {isHoliday && (
                        <CalendarOff className="w-3 h-3 text-red-500" title={holidayMap[dayStr]} />
                      )}
                    </div>
                    {!isExpanded && (
                      <button onClick={() => setExpandedDay(dayStr)} className="p-1 hover:bg-slate-200 rounded">
                        <Plus className="w-3 h-3 text-slate-600" />
                      </button>
                    )}
                  </div>

                  {isHoliday && (
                    <div className="text-[10px] text-red-600 font-medium mb-1 truncate" title={holidayMap[dayStr]}>
                      {holidayMap[dayStr]}
                    </div>
                  )}

                  <div className="space-y-1 mb-2">
                    {dayAssignmentsList.map(assignment => {
                      const project = projects.find(p => p.id === assignment.project_id);
                      const projectIdx = projects.findIndex(p => p.id === assignment.project_id);
                      const employeeCount = assignment.employee_assignments?.length || 0;
                      const subtradeCount = assignment.subtrade_assignments?.length || 0;
                      const isUnassigned = employeeCount === 0;
                      return (
                        <div key={assignment.id}>
                          <div
                            className={`p-1 rounded text-white text-xs flex items-center justify-between gap-1 cursor-pointer hover:opacity-80 transition-opacity ${isUnassigned ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                            style={{ backgroundColor: getProjectColor(projectIdx) }}
                            onClick={() => handleJobClick(assignment, day)}
                          >
                            <div className="truncate text-xs flex flex-col">
                              <span>{project?.title}</span>
                              <div className="flex items-center gap-1">
                                {employeeCount > 0 && (
                                  <span className="text-[10px] opacity-80">{employeeCount} staff</span>
                                )}
                                {subtradeCount > 0 && (
                                  <span className="text-[10px] opacity-80 flex items-center">
                                    <Wrench className="w-2 h-2 mr-0.5" />{subtradeCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemove(assignment.id); }}
                              className="hover:bg-white/30 rounded p-0.5 flex-shrink-0"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          {isUnassigned && (
                            <div className="flex items-center gap-1 mt-0.5 text-[9px] text-amber-600">
                              <AlertTriangle className="w-2.5 h-2.5" /> No staff assigned
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isExpanded && (
                    <div className="space-y-1">
                      {allocatedProjects.map(project => {
                        const projectIdx = projects.findIndex(p => p.id === project.id);
                        return (
                          <button
                            key={project.id}
                            onClick={() => {
                              handleAddJobToDay(day, project.id);
                              setExpandedDay(null);
                            }}
                            className="w-full px-2 py-1 rounded text-white text-xs font-medium transition-opacity hover:opacity-80 truncate"
                            style={{ backgroundColor: getProjectColor(projectIdx) }}
                            title={project.title}
                          >
                            + {project.title}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setExpandedDay(null)}
                        className="w-full px-2 py-1 rounded text-slate-600 text-xs hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Button onClick={() => setDateRangeModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            Create Schedule
          </Button>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>

      <EmployeeAssignmentModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        onAssign={handleAssignEmployee}
        projectTitle={selectedJob?.project?.title}
        date={selectedJob?.day}
        users={users}
        projects={projects}
        existingAssignments={selectedJob?.existingEmployees}
        allAssignments={assignments}
        currentAssignmentId={selectedJob?.assignment?.id}
      />

      <DateRangePickerModal
        isOpen={dateRangeModalOpen}
        onClose={() => setDateRangeModalOpen(false)}
        onConfirm={(startDate, endDate) => {
          setDateRangeModalOpen(false);
          if (onCreateSchedule) onCreateSchedule(startDate, endDate);
        }}
      />

      <HolidayWorkApprovalDialog
        isOpen={!!holidayApproval}
        onClose={() => setHolidayApproval(null)}
        holidayName={holidayApproval?.holidayName}
        date={holidayApproval?.date}
        onApprove={handleHolidayApproved}
      />
    </Dialog>
  );
}