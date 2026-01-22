import React from 'react';
import { format, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SchedulerLayer1({
  projects,
  currentDate,
  onPrevMonth,
  onNextMonth,
  onDrillDown,
  onEditAllocations,
  updateAllocation,
}) {
  const monthsToShow = 12;
  const months = Array.from({ length: monthsToShow }, (_, i) => addMonths(currentDate, i));

  const getAllocatedPercentage = (project, year, month) => {
    return project.monthly_work_allocations?.find(a => a.year === year && a.month === month)?.percentage || 0;
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={onPrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-semibold text-slate-900">
          {format(currentDate, 'MMMM yyyy')} - {format(addMonths(currentDate, monthsToShow - 1), 'MMMM yyyy')}
        </h2>
        <Button variant="outline" size="icon" onClick={onNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Projects with allocations */}
      <div className="space-y-3">
        {projects.map(project => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{project.title}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{project.status}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditAllocations(project.id)}
                  className="gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Allocations
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1">
                {months.map((month) => {
                  const percentage = getAllocatedPercentage(project, month.getFullYear(), month.getMonth() + 1);
                  return (
                    <button
                      key={format(month, 'yyyy-MM')}
                      onClick={() => percentage > 0 && onDrillDown(month)}
                      className={`p-2 rounded text-center text-xs font-medium transition-all ${
                        percentage > 0
                          ? 'bg-amber-500 text-white cursor-pointer hover:bg-amber-600'
                          : 'bg-slate-100 text-slate-400 cursor-default'
                      }`}
                      title={`${format(month, 'MMM yyyy')}: ${percentage}%`}
                    >
                      <div className="text-2xs">{format(month, 'MMM')}</div>
                      <div className="text-xs font-bold">{percentage}%</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}