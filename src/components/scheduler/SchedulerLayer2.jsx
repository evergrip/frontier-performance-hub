import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function SchedulerLayer2({
  selectedMonth,
  users,
  assignments,
  onBack,
  refetchAssignments,
}) {
  const [draggedProject, setDraggedProject] = useState(null);

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeAssignment.create(data),
    onSuccess: () => refetchAssignments(),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeAssignment.delete(id),
    onSuccess: () => refetchAssignments(),
  });

  const weekDays = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  }).filter(date => [1, 2, 3, 4, 5].includes(date.getDay()));

  const getAssignmentForDay = (employeeId, date) => {
    return assignments.find(
      a => a.employee_id === employeeId && a.assignment_date === format(date, 'yyyy-MM-dd')
    );
  };

  const handleDrop = (employeeId, date) => {
    if (!draggedProject) return;
    createAssignmentMutation.mutate({
      employee_id: employeeId,
      assignment_date: format(date, 'yyyy-MM-dd'),
      status: draggedProject.status,
      color: draggedProject.color || COLORS[0],
    });
    setDraggedProject(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold text-slate-900">
          {format(selectedMonth, 'MMMM yyyy')} - Staff Assignment
        </h2>
      </div>

      {/* Drag-and-drop grid */}
      <Card>
        <CardContent className="p-0">
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
                      className="px-4 py-3 text-center text-sm font-semibold text-slate-900 border-r border-slate-200 min-w-28"
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
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(user.id, day)}
                          className="px-4 py-3 text-center border-r border-slate-200 min-h-20 cursor-copy hover:bg-amber-50 transition-colors"
                          style={assignment?.color ? { backgroundColor: assignment.color, opacity: 0.9 } : {}}
                        >
                          {assignment && (
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-medium text-white text-sm">{assignment.status}</span>
                              <button
                                onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                className="p-1 hover:bg-white/30 rounded transition-colors"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          )}
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
    </div>
  );
}