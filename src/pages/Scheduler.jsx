import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function Scheduler() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedProject, setDraggedProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['employeeAssignments', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addWeeks(currentWeekStart, 1);
      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const allAssignments = await base44.entities.EmployeeAssignment.filter({});
      return allAssignments.filter(a => a.assignment_date >= startDate && a.assignment_date < endDate);
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeAssignment.create(data),
    onSuccess: () => refetchAssignments(),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeAssignment.delete(id),
    onSuccess: () => refetchAssignments(),
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

  const getProjectColor = (projectId) => {
    if (!projectId) return COLORS[0];
    const index = projects.findIndex(p => p.id === projectId);
    return COLORS[index % COLORS.length];
  };

  const handleDragStart = (project) => {
    setDraggedProject(project);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (employeeId, date) => {
    if (!draggedProject) return;
    
    const color = draggedProject.color || getProjectColor(draggedProject.id);
    createAssignmentMutation.mutate({
      employee_id: employeeId,
      assignment_date: format(date, 'yyyy-MM-dd'),
      project_id: draggedProject.id,
      status: draggedProject.title,
      color: color,
    });
    setDraggedProject(null);
  };

  const handleClearAssignment = (assignmentId) => {
    deleteAssignmentMutation.mutate(assignmentId);
  };

  return (
    <div className="flex gap-6">
      {/* Projects Sidebar */}
      <div className="w-56 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Projects</h2>
          <p className="text-xs text-slate-500 mb-3">Drag projects to assign</p>
        </div>
        <div className="space-y-2">
          {projects.map(project => (
            <div
              key={project.id}
              draggable
              onDragStart={() => handleDragStart(project)}
              className="p-3 rounded-lg bg-white border-2 border-slate-200 cursor-move hover:shadow-md hover:border-slate-300 transition-all"
              style={{ borderColor: getProjectColor(project.id) }}
            >
              <div className="font-medium text-slate-900 text-sm">{project.title}</div>
              <div className="text-xs text-slate-500 mt-1">{project.status}</div>
            </div>
          ))}
        </div>

        {/* OFF Button */}
        <div
          draggable
          onDragStart={() => handleDragStart({ id: null, title: 'OFF' })}
          className="p-3 rounded-lg bg-red-100 border-2 border-red-300 cursor-move hover:shadow-md transition-all"
        >
          <div className="font-medium text-red-900 text-sm">OFF</div>
        </div>
      </div>

      {/* Main Scheduler */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Staff Scheduler</h1>
          <p className="text-lg text-slate-500">Drag projects onto cells to assign staff</p>
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
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(user.id, day)}
                          className={`px-4 py-3 text-center text-sm border-r border-slate-200 min-h-20 cursor-copy ${
                            draggedProject ? 'bg-amber-50' : 'bg-white'
                          } hover:bg-slate-50 transition-colors`}
                          style={assignment?.color ? { backgroundColor: assignment.color, opacity: 0.9 } : {}}
                        >
                          {assignment ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="font-medium text-white text-sm">
                                {assignment.status === 'OFF' ? 'OFF' : getProjectName(assignment.project_id)}
                              </div>
                              <button
                                onClick={() => handleClearAssignment(assignment.id)}
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
      </div>
    </div>
  );
}