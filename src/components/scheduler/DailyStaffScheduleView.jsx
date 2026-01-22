import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Printer, Send } from 'lucide-react';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const getProjectColor = (projectIndex) => COLORS[projectIndex % COLORS.length];

export default function DailyStaffScheduleView({
  assignments = [],
  users = [],
  projects = [],
  startDate,
  endDate,
  onClose
}) {
  const [weekStart, setWeekStart] = useState(startDate || new Date());
  
  let weekEnd = endDate || endOfWeek(weekStart);
  
  // Ensure weekEnd doesn't exceed the provided endDate
  if (endDate && weekEnd > endDate) {
    weekEnd = endDate;
  }
  
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

  const handlePrint = () => {
    window.print();
  };

  const handleSendToStaff = () => {
    const scheduleText = generateScheduleText();
    // In a real app, this would open an email dialog or call a backend function
    // For now, we'll copy to clipboard and show a message
    navigator.clipboard.writeText(scheduleText);
    alert('Schedule copied to clipboard. You can now paste it into an email.');
  };

  const generateScheduleText = () => {
    let text = `Staff Schedule - ${format(weekStart, 'MMM d')} to ${format(weekEnd, 'MMM d, yyyy')}\n\n`;
    
    activeEmployees.forEach(employee => {
      text += `${employee.full_name}\n`;
      daysInWeek.forEach(day => {
        const assignment = getAssignmentForEmployeeOnDay(employee.id, day);
        const hours = getHoursForEmployeeOnDay(employee.id, day);
        const project = assignment ? projects.find(p => p.id === assignment.project_id) : null;
        
        if (project) {
          text += `  ${format(day, 'EEE MMM d')}: ${project.title} (${hours}h)\n`;
        } else {
          text += `  ${format(day, 'EEE MMM d')}: Off\n`;
        }
      });
      text += '\n';
    });
    
    return text;
  };

  return (
    <Card className="w-full print:shadow-none print:border-0">
      <CardHeader className="flex flex-row items-center justify-between print:pb-4">
        <CardTitle>Staff Schedule - {format(weekStart, 'MMM d')} to {format(weekEnd, 'MMM d, yyyy')}</CardTitle>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            disabled={startDate && weekStart <= startDate}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            disabled={endDate && addDays(weekStart, 7) > endDate}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleSendToStaff}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Send to Staff
          </Button>
          <Button variant="outline" onClick={onClose}>
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