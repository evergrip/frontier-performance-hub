import React, { useState } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import EmployeeAssignmentModal from './EmployeeAssignmentModal';
import DateRangePickerModal from './DateRangePickerModal';

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
  onAssign,
  onRemove,
  onCreateSchedule
}) {
  const [expandedDay, setExpandedDay] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [dateRangeModalOpen, setDateRangeModalOpen] = useState(false);

  if (!isOpen || !month) return null;

  const monthStart = startOfMonth(month);
  const daysInMonth = getDaysInMonth(month);
  const startingDayOfWeek = monthStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Create array with empty slots for days before month starts
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
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    onAssign({
      date: dateStr,
      project_id: projectId,
    });
  };

  const handleRemoveJobFromDay = (assignmentId) => {
    onRemove(assignmentId);
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
          {/* Available jobs for this month */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Jobs Allocated to {format(month, 'MMMM')}:</h3>
            <div className="flex flex-wrap gap-2">
              {allocatedProjects.map((project, idx) => (
                <Badge
                  key={project.id}
                  className="px-3 py-2 text-white"
                  style={{ backgroundColor: getProjectColor(projects.findIndex(p => p.id === project.id)) }}
                >
                  {project.title}
                </Badge>
              ))}
            </div>
          </div>

          {/* Days of month */}
          <div className="grid grid-cols-7 gap-2">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="font-semibold text-center text-slate-600 text-sm py-2">
                {day}
              </div>
            ))}

            {/* Days */}
            {allDays.map((day, idx) => {
              if (!day) {
                return (
                  <div key={`empty-${idx}`} className="border rounded-lg p-2 min-h-32 bg-gray-100" />
                );
              }

              const dayAssignmentsList = getAssignmentsForDay(day);
              const dayStr = format(day, 'yyyy-MM-dd');
              const isExpanded = expandedDay === dayStr;

              return (
                <div
                  key={dayStr}
                  className="border rounded-lg p-2 min-h-32 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-slate-900 text-sm">{format(day, 'd')}</div>
                    {!isExpanded && (
                      <button
                        onClick={() => setExpandedDay(dayStr)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <Plus className="w-3 h-3 text-slate-600" />
                      </button>
                    )}
                  </div>

                  {/* Jobs assigned to this day */}
                  <div className="space-y-1 mb-2">
                    {dayAssignmentsList.map(assignment => {
                      const project = projects.find(p => p.id === assignment.project_id);
                      const projectIdx = projects.findIndex(p => p.id === assignment.project_id);
                      const employeeCount = assignment.employee_assignments?.length || 0;
                      return (
                        <div
                          key={assignment.id}
                          className="p-1 rounded text-white text-xs flex items-center justify-between gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: getProjectColor(projectIdx) }}
                          onClick={() => handleJobClick(assignment, day)}
                        >
                          <div className="truncate text-xs flex flex-col">
                            <span>{project?.title}</span>
                            {employeeCount > 0 && (
                              <span className="text-[10px] opacity-80">
                                {employeeCount} employee{employeeCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveJobFromDay(assignment.id);
                            }}
                            className="hover:bg-white/30 rounded p-0.5 flex-shrink-0"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add job options when expanded */}
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
                  <Button
                    onClick={() => setDateRangeModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Create Schedule
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Done
                  </Button>
                </div>
      </DialogContent>

      <EmployeeAssignmentModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        onAssign={handleAssignEmployee}
        projectTitle={selectedJob?.project?.title}
        date={selectedJob?.day}
        users={users}
        existingAssignments={selectedJob?.existingEmployees}
        allAssignments={assignments}
        currentAssignmentId={selectedJob?.assignment?.id}
      />

      <DateRangePickerModal
        isOpen={dateRangeModalOpen}
        onClose={() => setDateRangeModalOpen(false)}
        onConfirm={(startDate, endDate) => {
          setDateRangeModalOpen(false);
          if (onCreateSchedule) {
            onCreateSchedule(startDate, endDate);
          }
        }}
      />
    </Dialog>
  );
}