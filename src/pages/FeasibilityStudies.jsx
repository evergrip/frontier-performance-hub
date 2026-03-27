import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, ExternalLink, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import FeasibilityStudyFormDialog from '../components/feasibility/FeasibilityStudyFormDialog';

const STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  ready_to_generate: 'Ready',
  generated: 'Generated',
  sent: 'Sent',
  archived: 'Archived'
};

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  ready_to_generate: 'bg-amber-100 text-amber-700',
  generated: 'bg-green-100 text-green-700',
  sent: 'bg-purple-100 text-purple-700',
  archived: 'bg-slate-100 text-slate-500'
};

const RATING_LABELS = {
  highly_feasible: 'Highly Feasible',
  feasible_with_conditions: 'Feasible with Conditions',
  marginally_feasible: 'Marginally Feasible',
  not_feasible: 'Not Feasible'
};

export default function FeasibilityStudies() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: studies = [], isLoading } = useQuery({
    queryKey: ['feasibility-studies'],
    queryFn: () => base44.entities.FeasibilityStudy.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const filtered = studies.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q) ||
      s.property_address?.toLowerCase().includes(q) ||
      clientMap[s.client_id]?.company_name?.toLowerCase().includes(q) ||
      clientMap[s.client_id]?.contact_name?.toLowerCase().includes(q);
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feasibility Studies</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage pre-construction feasibility reports</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Study
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search studies..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No feasibility studies yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Create your first feasibility study to get started</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> New Study
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(study => {
            const client = clientMap[study.client_id];
            return (
              <Card key={study.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/FeasibilityBuilder?studyId=${study.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-slate-900 truncate">{study.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[study.status] || ''}`}>
                          {STATUS_LABELS[study.status] || study.status}
                        </span>
                        {study.overall_feasibility_rating && (
                          <Badge variant="outline" className="text-xs">
                            {RATING_LABELS[study.overall_feasibility_rating] || study.overall_feasibility_rating}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        {client && <span>{client.company_name || client.contact_name}</span>}
                        {study.property_address && <span>{study.property_address}</span>}
                        {study.jurisdiction && <span>{study.jurisdiction}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {study.generated_doc_url && (
                        <a href={study.generated_doc_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FeasibilityStudyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(studyId) => navigate(`/FeasibilityBuilder?studyId=${studyId}`)}
      />
    </div>
  );
}