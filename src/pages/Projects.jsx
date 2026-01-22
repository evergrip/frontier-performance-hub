import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Calendar, CalendarDays, Users } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { format, startOfYear, addWeeks, getWeek, getYear, eachMonthOfInterval, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export default function Projects() {
  const queryClient = useQueryClient();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCrew, setSelectedCrew] = useState('unassigned');
  const [monthlyAllocations, setMonthlyAllocations] = useState([]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, data }) => 
      base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setScheduleDialogOpen(false);
      setSelectedWeeks([]);
      setMonthlyAllocations([]);
      toast.success('Project updated');
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
    setSelectedCrew(project.crew_assignment || 'unassigned');
    setMonthlyAllocations(project.monthly_revenue_allocations || []);
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

  const updateMonthlyAllocation = (year, month, percentage) => {
    const existing = monthlyAllocations.find(a => a.year === year && a.month === month);
    const value = parseFloat(percentage) || 0;
    
    if (existing) {
      setMonthlyAllocations(
        monthlyAllocations.map(a => 
          a.year === year && a.month === month 
            ? { ...a, percentage: value }
            : a
        )
      );
    } else {
      setMonthlyAllocations([...monthlyAllocations, { year, month, percentage: value }]);
    }
  };

  const getMonthlyAllocation = (year, month) => {
    const allocation = monthlyAllocations.find(a => a.year === year && a.month === month);
    return allocation?.percentage || 0;
  };

  const totalAllocation = monthlyAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0);

  const handleSaveProject = () => {
    updateProjectMutation.mutate({
      projectId: selectedProject.id,
      data: {
        scheduled_weeks: selectedWeeks,
        crew_assignment: selectedCrew,
        monthly_revenue_allocations: monthlyAllocations.filter(a => a.percentage > 0)
      }
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

  const months = eachMonthOfInterval({
    start: new Date(selectedYear, 0, 1),
    end: new Date(selectedYear, 11, 31)
  });

  const crewColors = {
    crew_a: 'bg-blue-500',
    crew_b: 'bg-green-500',
    crew_c: 'bg-purple-500',
    crew_d: 'bg-orange-500',
    unassigned: 'bg-slate-400'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Construction Projects</h1>
        <p className="text-lg text-slate-500">Schedule and track construction projects</p>
      </div>

      <Tabs defaultValue="unscheduled" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="unscheduled">Waiting to Schedule</TabsTrigger>
          <TabsTrigger value="calendar">Project Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="unscheduled" className="space-y-6">
          {/* Unscheduled Projects */}
          {unscheduledProjects.length > 0 ? (
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
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={Building2}
                  title="All projects scheduled"
                  description="No projects waiting to be scheduled"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={Calendar}
                title="New scheduling system coming soon"
                description="The daily employee assignment calendar will be available here"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule/Edit Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Project: {selectedProject?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Crew Assignment */}
            <div>
              <Label className="mb-2 block">Assign Crew</Label>
              <div className="flex gap-2">
                {['crew_a', 'crew_b', 'crew_c', 'crew_d', 'unassigned'].map(crew => (
                  <button
                    key={crew}
                    onClick={() => setSelectedCrew(crew)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all
                      ${selectedCrew === crew 
                        ? `${crewColors[crew]} text-white shadow-lg` 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }
                    `}
                  >
                    {crew.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Selection */}
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

            {/* Weekly Schedule */}
            <div>
              <Label className="mb-2 block">Select Weeks</Label>
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
            </div>

            {/* Monthly Revenue Allocation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Monthly Revenue Allocation (% of ${selectedProject?.contract_value?.toLocaleString()})</Label>
                <span className={`text-sm font-semibold ${totalAllocation === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {totalAllocation.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {months.map(month => {
                  const monthNum = getMonth(month) + 1;
                  const yearNum = getYear(month);
                  const value = getMonthlyAllocation(yearNum, monthNum);
                  
                  return (
                    <div key={month.toString()} className="space-y-1">
                      <Label className="text-xs">{format(month, 'MMM yyyy')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={value || ''}
                        onChange={(e) => updateMonthlyAllocation(yearNum, monthNum, e.target.value)}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProject} 
                disabled={updateProjectMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
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