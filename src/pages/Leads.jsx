import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Target } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';

export default function Leads() {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const statusColumns = [
    { status: 'new', label: 'New', color: 'bg-blue-100 border-blue-200' },
    { status: 'contacted', label: 'Contacted', color: 'bg-purple-100 border-purple-200' },
    { status: 'qualified', label: 'Qualified', color: 'bg-emerald-100 border-emerald-200' },
    { status: 'converted', label: 'Converted', color: 'bg-amber-100 border-amber-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Leads Pipeline</h1>
        <p className="text-lg text-slate-500">Track your lead progression</p>
      </div>

      {leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusColumns.map(column => {
            const columnLeads = leads.filter(l => l.status === column.status);
            return (
              <div key={column.status}>
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">{column.label}</h3>
                  <p className="text-sm text-slate-500">{columnLeads.length} leads</p>
                </div>
                <div className="space-y-3">
                  {columnLeads.map(lead => (
                    <Card key={lead.id} className={`border-2 ${column.color} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-slate-900 mb-2">{lead.title}</h4>
                        {lead.estimated_value && (
                          <p className="text-sm text-slate-600 mb-2">
                            ${lead.estimated_value.toLocaleString()}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-xs text-slate-500 capitalize">
                            {lead.project_type?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </div>
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
              icon={Target}
              title="No leads yet"
              description="Start tracking your sales pipeline by adding leads"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}