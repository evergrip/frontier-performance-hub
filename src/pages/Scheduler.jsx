import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Scheduler() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['employeeAssignments', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addWeeks(currentWeekStart, 1);
      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const allAssignments = await base44.entities.EmployeeAssignment.filter({});
      return allAssignments.filter(a => a.assignment_date >= startDate && a.assignment_date < endDate);
    },
  });

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: addWeeks(currentWeekStart, 1),
  }).filter((_, index) => index < 5);

  const getProjectName = (projectId) => {
    if (!projectId) return '';
    const project = projects.find(p => p.id === projectId);
    return project?.title || projectId;
  };

  const getAssignmentForDay = (employeeId, date) => {
    return assignments.find(
      a => a.employee_id === employeeId && 
           a.assignment_date === format(date, 'yyyy-MM-dd')
    );
  };

  const getBackgroundColor = (assignment) => {
    if (!assignment) return 'bg-white';
    if (assignment.color) return '';
    return 'bg-slate-100';
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Staff Scheduler</h1>
        <p className="text-lg text-slate-500">Weekly assignment schedule</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <CardTitle>
            {format(currentWeekStart, 'MMM d')} - {format(addWeeks(currentWeekStart, 0), 'MMM d, yyyy')}
          </CardTitle>
          <div className="w-20" />
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
                          className={`px-4 py-3 text-center text-sm border-r border-slate-200 min-h-16 ${getBackgroundColor(assignment)}`}
                          style={assignment?.color ? { backgroundColor: assignment.color } : {}}
                        >
                          {assignment ? (
                            <div className="font-medium text-slate-900">
                              {assignment.status === 'OFF' ? 'OFF' : getProjectName(assignment.project_id)}
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
    </div>
  );
}