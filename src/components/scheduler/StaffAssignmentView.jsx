import React from 'react';
import { format, startOfWeek, addWeeks, eachDayOfInterval, getMonth, getYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const getProjectColor = (index) => COLORS[index % COLORS.length];

export default function StaffAssignmentView({
  project,
  month,
  users,
  projects,
  assignments,
  onDrop,
  onClearAssignment,
  onBack,
  currentWeekStart,
  onWeekChange
}) {
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: addWeeks(currentWeekStart, 1),
  }).filter((_, index) => index < 5);

  const projectAllocation = project?.monthly_work_allocations?.find(
    a => a.year === getYear(month) && a.month === getMonth(month) + 1
  );

  const getAssignmentForDay = (employeeId, date) => {
    return assignments.find(
      a =>
        a.employee_id === employeeId &&
        a.assignment_date === format(date, 'yyyy-MM-dd') &&
        a.project_id === project.id
    );
  };

  const getProjectColorByIndex = (projectId) => {
    const index = projects.findIndex(p => p.id === projectId);
    return getProjectColor(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <CardTitle>
            {project?.title} - {format(month, 'MMMM yyyy')}
            {projectAllocation && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({projectAllocation.percentage}% allocated)
              </span>
            )}
          </CardTitle>
          <div className="w-20" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekChange(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">
            {format(currentWeekStart, 'MMM d')} - {format(addWeeks(currentWeekStart, 1), 'MMM d, yyyy')}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekChange(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 w-32 border-r border-slate-200">
                  Employee
                </th>
                {weekDays.map(day => (
                  <th
                    key={format(day, 'yyyy-MM-dd')}
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-900 border-r border-slate-200 w-40"
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-xs text-slate-500">{format(day, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 border-r border-slate-200">
                    {user.full_name || user.email}
                  </td>
                  {weekDays.map(day => {
                    const assignment = getAssignmentForDay(user.id, day);
                    return (
                      <td
                        key={format(day, 'yyyy-MM-dd')}
                        onDragOver={handleDragOver}
                        onDrop={() => onDrop(user.id, day, project.id)}
                        className={`px-4 py-3 text-center text-sm border-r border-slate-200 min-h-20 cursor-copy transition-colors ${
                          !assignment ? 'bg-white hover:bg-slate-50' : ''
                        }`}
                        style={
                          assignment
                            ? { backgroundColor: getProjectColorByIndex(project.id), opacity: 0.9 }
                            : {}
                        }
                      >
                        {assignment ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="font-medium text-white text-sm">
                              {project.title}
                            </div>
                            <button
                              onClick={() => onClearAssignment(assignment.id)}
                              className="p-1 hover:bg-white/30 rounded transition-colors"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}