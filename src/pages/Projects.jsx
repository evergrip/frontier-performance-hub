import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Projects() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const statusColors = {
    planning: 'bg-blue-500',
    design: 'bg-purple-500',
    permitting: 'bg-yellow-500',
    execution: 'bg-green-500',
    completion: 'bg-emerald-500',
    closed: 'bg-slate-500'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Projects</h1>
        <p className="text-lg text-slate-500">View and manage construction projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                  <Badge className={statusColors[project.status]}>
                    {project.status}
                  </Badge>
                </div>
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {project.contract_value && (
                  <p className="font-semibold text-slate-900">
                    ${project.contract_value.toLocaleString()}
                  </p>
                )}
                {project.start_date && (
                  <p className="text-slate-600">
                    Start: {format(new Date(project.start_date), 'MMM d, yyyy')}
                  </p>
                )}
                {project.target_completion_date && (
                  <p className="text-slate-600">
                    Target: {format(new Date(project.target_completion_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}