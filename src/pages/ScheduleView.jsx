import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DailyStaffScheduleView from '@/components/scheduler/DailyStaffScheduleView';

export default function ScheduleView() {
  const [searchParams] = useSearchParams();
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : null;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : null;

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['employeeAssignments'],
    queryFn: async () => {
      return await base44.entities.EmployeeAssignment.list();
    },
  });

  // Filter assignments to only those within the selected date range
  const filteredAssignments = useMemo(() => {
    if (!startDate || !endDate) return assignments;
    
    return assignments.filter(a => {
      const assignmentDate = new Date(a.assignment_date);
      return assignmentDate >= startDate && assignmentDate <= endDate;
    });
  }, [assignments, startDate, endDate]);

  if (!startDate || !endDate) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-slate-600">No date range selected. Please create a schedule first.</p>
          <Link to={createPageUrl('Scheduler')}>
            <Button className="mt-4">Back to Scheduler</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('Scheduler')}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>
      </div>

      <DailyStaffScheduleView
        assignments={filteredAssignments}
        users={users}
        projects={projects}
        startDate={startDate}
        endDate={endDate}
        onClose={() => {}}
      />
    </div>
  );
}