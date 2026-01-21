import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2, Calendar, CalendarDays } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { format, startOfYear, addWeeks, getWeek, getYear } from 'date-fns';
import { toast } from 'sonner';

export default function Projects() {
  const queryClient = useQueryClient();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const scheduleProjectMutation = useMutation({
    mutationFn: ({ projectId, weeks }) => 
      base44.entities.Project.update(projectId, { scheduled_weeks: weeks }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setScheduleDialogOpen(false);
      setSelectedWeeks([]);
      toast.success('Project scheduled');
    }
  });

  const unscheduledProjects = projects.filter(p => !p.scheduled_weeks || p.scheduled_weeks.length === 0);
  const scheduledProjects = projects.filter(p => p.scheduled_weeks && p.scheduled_weeks.length > 0);

  const statusGroups = [
    { statuses: ['planning', 'design'], label: 'Planning & Design', color: 'bg-blue-100 border-blue-200' },
    { statuses: ['permitting'], label: 'Permitting', color: 'bg-purple-100 border-purple-200' },
    { statuses: ['execution'], label: 'In Progress', color: 'bg-amber-100 border-amber-200' },
    { statuses: ['completion', 'closed'], label: 'Complete', color: 'bg-emerald-100 border-emerald-200' },
  ];

  const openScheduleDialog = (project) => {
    setSelectedProject(project);
    setSelectedWeeks(project.scheduled_weeks || []);
    setScheduleDialogOpen(true);
  };

  const toggleWeek = (weekNum) => {
    const weekObj = { year: selectedYear, week: weekNum };
    const exists = selectedWeeks.some(w => w.year === selectedYear && w.week === weekNum);
    
    if (exists) {
      setSelectedWeeks(selectedWeeks.filter(w => !(w.year === selectedYear && w.week === weekNum)));
    } else {
      setSelectedWeeks([...selectedWeeks, weekObj]);
    }
  };

  const handleSchedule = () => {
    scheduleProjectMutation.mutate({
      projectId: selectedProject.id,
      weeks: selectedWeeks
    });
  };

  const getWeekDateRange = (year, weekNum) => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const weekStart = addWeeks(yearStart, weekNum - 1);
    return format(weekStart, 'MMM d');
  };

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const quarters = [
    { name: 'Q1', weeks: weeks.slice(0, 13) },
    { name: 'Q2', weeks: weeks.slice(13, 26) },
    { name: 'Q3', weeks: weeks.slice(26, 39) },
    { name: 'Q4', weeks: weeks.slice(39, 52) }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Construction Projects</h1>
        <p className="text-lg text-slate-500">Schedule and track construction projects</p>
      </div>

      {/* Unscheduled Projects */}
      {unscheduledProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Waiting to be Scheduled</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unscheduledProjects.map(project => (
              <Card key={project.id} className="border-2 border-yellow-200 bg-yellow-50 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">{project.title}</h4>
                  {project.contract_value && (
                    <p className="text-sm font-bold text-slate-900 mb-3">
                      ${project.contract_value.toLocaleString()}
                    </p>
                  )}
                  <Button 
                    size="sm" 
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    onClick={() => openScheduleDialog(project)}
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Schedule Project
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Projects */}
      {scheduledProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Scheduled Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statusGroups.map(group => {
              const groupProjects = scheduledProjects.filter(p => group.statuses.includes(p.status));
              return (
                <div key={group.label}>
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900">{group.label}</h3>
                    <p className="text-sm text-slate-500">{groupProjects.length} projects</p>
                  </div>
                  <div className="space-y-3">
                    {groupProjects.map(project => (
                      <Card key={project.id} className={`border-2 ${group.color} hover:shadow-lg transition-shadow cursor-pointer`} onClick={() => openScheduleDialog(project)}>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-slate-900 mb-2">{project.title}</h4>
                          {project.contract_value && (
                            <p className="text-sm font-bold text-slate-900 mb-2">
                              ${project.contract_value.toLocaleString()}
                            </p>
                          )}
                          {project.scheduled_weeks && project.scheduled_weeks.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>{project.scheduled_weeks.length} weeks scheduled</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Building2}
              title="No projects yet"
              description="Projects will appear here once sales are closed"
            />
          </CardContent>
        </Card>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Project: {selectedProject?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label>Year</Label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
              >
                {[2026, 2027, 2028, 2029].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {quarters.map(quarter => (
                <div key={quarter.name}>
                  <h3 className="font-semibold text-slate-900 mb-2">{quarter.name}</h3>
                  <div className="grid grid-cols-13 gap-1">
                    {quarter.weeks.map(weekNum => {
                      const isSelected = selectedWeeks.some(w => w.year === selectedYear && w.week === weekNum);
                      return (
                        <button
                          key={weekNum}
                          onClick={() => toggleWeek(weekNum)}
                          className={`
                            px-2 py-2 text-xs rounded border transition-colors
                            ${isSelected 
                              ? 'bg-amber-600 text-white border-amber-700 font-semibold' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }
                          `}
                          title={`Week ${weekNum} - ${getWeekDateRange(selectedYear, weekNum)}`}
                        >
                          {weekNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>{selectedWeeks.filter(w => w.year === selectedYear).length}</strong> weeks selected for {selectedYear}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSchedule} disabled={scheduleProjectMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
                <CalendarDays className="w-4 h-4 mr-2" />
                Save Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}