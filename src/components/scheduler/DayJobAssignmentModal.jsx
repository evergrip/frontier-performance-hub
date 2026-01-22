import React, { useState } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Users } from 'lucide-react';

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
  onRemove
}) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayAssignments, setDayAssignments] = useState({});

  if (!isOpen || !month) return null;

  const monthStart = startOfMonth(month);
  const daysInMonth = getDaysInMonth(month);
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
            {days.map(day => {
              const dayAssignmentsList = getAssignmentsForDay(day);
              const projectIndex = days[0].getDay();
              const startDayOffset = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
              const dayOfWeek = (days.indexOf(day) + startDayOffset) % 7;

              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className="border rounded-lg p-2 min-h-32 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="font-semibold text-slate-900 text-sm mb-2">{format(day, 'd')}</div>

                  {/* Jobs assigned to this day */}
                  <div className="space-y-1">
                    {dayAssignmentsList.map(assignment => {
                      const project = projects.find(p => p.id === assignment.project_id);
                      const projectIdx = projects.findIndex(p => p.id === assignment.project_id);
                      return (
                        <div
                          key={assignment.id}
                          className="p-1 rounded text-white text-xs flex items-center justify-between gap-1"
                          style={{ backgroundColor: getProjectColor(projectIdx) }}
                        >
                          <span className="truncate">{project?.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveJobFromDay(assignment.id);
                            }}
                            className="hover:bg-white/30 rounded p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add job button */}
                  {selectedDay && format(selectedDay, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') && (
                    <div className="mt-2 space-y-1">
                      {allocatedProjects.map(project => {
                        const projectIdx = projects.findIndex(p => p.id === project.id);
                        return (
                          <button
                            key={project.id}
                            onClick={() => handleAddJobToDay(day, project.id)}
                            className="w-full px-2 py-1 rounded text-white text-xs font-medium transition-opacity hover:opacity-80"
                            style={{ backgroundColor: getProjectColor(projectIdx) }}
                          >
                            + {project.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}