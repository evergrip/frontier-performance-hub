import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const getProjectColor = (projectIndex) => COLORS[projectIndex % COLORS.length];

export default function DailyStaffScheduleView({
  assignments = [],
  users = [],
  projects = [],
  startDate,
  onClose
}) {
  const [weekStart, setWeekStart] = useState(startDate ? startOfWeek(startDate) : startOfWeek(new Date()));
  
  const weekEnd = endOfWeek(weekStart);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get unique employees from assignments
  const employeesInAssignments = new Set();
  assignments.forEach(a => {
    a.employee_assignments?.forEach(ea => {
      employeesInAssignments.add(ea.employee_id);
    });
  });

  const activeEmployees = users.filter(u => employeesInAssignments.has(u.id));

  const getAssignmentForEmployeeOnDay = (employeeId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return assignments.find(a =>
      a.assignment_date === dateStr &&
      a.employee_assignments?.some(ea => ea.employee_id === employeeId)
    );
  };

  const getHoursForEmployeeOnDay = (employeeId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const assignment = assignments.find(a =>
      a.assignment_date === dateStr &&
      a.employee_assignments?.some(ea => ea.employee_id === employeeId)
    );
    
    if (assignment) {
      const empAssignment = assignment.employee_assignments.find(ea => ea.employee_id === employeeId);
      return empAssignment?.hours || 0;
    }
    return 0;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Staff Schedule - {format(weekStart, 'MMM d')} to {format(weekEnd, 'MMM d, yyyy')}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={onClose} className="ml-4">
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-4 py-2 text-left font-semibold w-32">Employee</th>
                {daysInWeek.map(day => (
                  <th
                    key={format(day, 'yyyy-MM-dd')}
                    className="border border-slate-300 px-4 py-2 text-center font-semibold min-w-40"
                  >
                    <div className="font-medium text-slate-900">{format(day, 'EEE')}</div>
                    <div className="text-xs text-slate-600">{format(day, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map(employee => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 px-4 py-2 font-medium text-slate-900">
                    {employee.full_name}
                  </td>
                  {daysInWeek.map(day => {
                    const assignment = getAssignmentForEmployeeOnDay(employee.id, day);
                    const hours = getHoursForEmployeeOnDay(employee.id, day);
                    const project = assignment ? projects.find(p => p.id === assignment.project_id) : null;
                    const projectIndex = project ? projects.findIndex(p => p.id === project.id) : 0;

                    return (
                      <td
                        key={format(day, 'yyyy-MM-dd')}
                        className="border border-slate-300 px-4 py-2 text-center"
                      >
                        {assignment && project ? (
                          <div
                            className="p-2 rounded text-white text-sm font-medium"
                            style={{ backgroundColor: getProjectColor(projectIndex) }}
                          >
                            <div className="truncate">{project.title}</div>
                            <div className="text-xs opacity-90">{hours}h</div>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-sm">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activeEmployees.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No employees assigned for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
}