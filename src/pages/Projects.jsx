import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Calendar } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { format } from 'date-fns';

export default function Projects() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const statusGroups = [
    { statuses: ['planning', 'design'], label: 'Planning & Design', color: 'bg-blue-100 border-blue-200' },
    { statuses: ['permitting'], label: 'Permitting', color: 'bg-purple-100 border-purple-200' },
    { statuses: ['execution'], label: 'In Progress', color: 'bg-amber-100 border-amber-200' },
    { statuses: ['completion', 'closed'], label: 'Complete', color: 'bg-emerald-100 border-emerald-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Projects</h1>
        <p className="text-lg text-slate-500">Track your construction projects</p>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusGroups.map(group => {
            const groupProjects = projects.filter(p => group.statuses.includes(p.status));
            return (
              <div key={group.label}>
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">{group.label}</h3>
                  <p className="text-sm text-slate-500">{groupProjects.length} projects</p>
                </div>
                <div className="space-y-3">
                  {groupProjects.map(project => (
                    <Card key={project.id} className={`border-2 ${group.color} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 flex-1">{project.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            project.project_type === 'preconstruction' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {project.project_type}
                          </span>
                        </div>
                        {project.contract_value && (
                          <p className="text-sm font-bold text-slate-900 mb-2">
                            ${project.contract_value.toLocaleString()}
                          </p>
                        )}
                        {project.actual_margin !== undefined && (
                          <p className="text-sm text-slate-600 mb-2">
                            Margin: {project.actual_margin}%
                          </p>
                        )}
                        {project.target_completion_date && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>Due {format(new Date(project.target_completion_date), 'MMM d, yyyy')}</span>
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
      ) : (
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
    </div>
  );
}