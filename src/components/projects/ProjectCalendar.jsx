import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, getMonth, getYear } from 'date-fns';

const crewColors = {
  crew_a: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100', border: 'border-blue-500' },
  crew_b: { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-100', border: 'border-green-500' },
  crew_c: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100', border: 'border-purple-500' },
  crew_d: { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100', border: 'border-orange-500' },
  unassigned: { bg: 'bg-slate-400', text: 'text-slate-700', light: 'bg-slate-100', border: 'border-slate-400' }
};

export default function ProjectCalendar({ projects, year, onProjectClick }) {
  const months = eachMonthOfInterval({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31)
  });

  const getProjectsForMonth = (month) => {
    const monthNum = getMonth(month) + 1;
    const yearNum = getYear(month);

    return projects.filter(project => {
      if (!project.monthly_revenue_allocations) return false;
      return project.monthly_revenue_allocations.some(
        alloc => alloc.year === yearNum && alloc.month === monthNum
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${crewColors.crew_a.bg}`}></div>
          <span className="text-sm text-slate-600">Crew A</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${crewColors.crew_b.bg}`}></div>
          <span className="text-sm text-slate-600">Crew B</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${crewColors.crew_c.bg}`}></div>
          <span className="text-sm text-slate-600">Crew C</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${crewColors.crew_d.bg}`}></div>
          <span className="text-sm text-slate-600">Crew D</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map(month => {
          const monthProjects = getProjectsForMonth(month);
          const totalRevenue = monthProjects.reduce((sum, project) => {
            const allocation = project.monthly_revenue_allocations?.find(
              a => a.year === getYear(month) && a.month === getMonth(month) + 1
            );
            return sum + (allocation ? (project.contract_value * allocation.percentage / 100) : 0);
          }, 0);

          return (
            <Card key={month.toString()}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{format(month, 'MMMM')}</CardTitle>
                <p className="text-xs text-slate-500 font-semibold">
                  ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} revenue
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {monthProjects.length > 0 ? (
                  monthProjects.map(project => {
                    const crew = project.crew_assignment || 'unassigned';
                    const colors = crewColors[crew];
                    const allocation = project.monthly_revenue_allocations?.find(
                      a => a.year === getYear(month) && a.month === getMonth(month) + 1
                    );

                    return (
                      <div
                        key={project.id}
                        onClick={() => onProjectClick(project)}
                        className={`p-2 rounded-lg border-l-4 ${colors.light} ${colors.border} cursor-pointer hover:shadow-md transition-shadow`}
                      >
                        <p className="text-xs font-semibold text-slate-900 truncate">{project.title}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-xs ${colors.text}`}>
                            {crew.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {allocation?.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">No projects</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}