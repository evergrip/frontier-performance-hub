import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, ExternalLink, Pencil, Loader2, Paperclip, ClipboardList, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import FeasibilityStudyFormDialog from './FeasibilityStudyFormDialog';

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

export default function BuilderHeader({ study, totalIncluded, totalComplete, activeTab, setActiveTab, onOpenOfflineDialog }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const generateReport = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateFeasibilityReport', { studyId: study?.id });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Report generated successfully!');
      queryClient.invalidateQueries(['feasibility-study', study?.id]);
      if (data.doc_url) window.open(data.doc_url, '_blank');
    },
    onError: (err) => {
      toast.error('Failed to generate report: ' + (err?.response?.data?.error || err?.message || 'Unknown error'));
    }
  });

  const progressPct = totalIncluded > 0 ? Math.round((totalComplete / totalIncluded) * 100) : 0;

  return (
    <>
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/FeasibilityStudies')} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 truncate">{study?.title || 'Loading...'}</h1>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-4 h-4 text-slate-400" />
                </Button>
                {study?.status && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[study.status]}`}>
                    {STATUS_LABELS[study.status]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                {study?.property_address && <span>{study.property_address}</span>}
                {study?.jurisdiction && <><span>•</span><span>{study.jurisdiction}</span></>}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right mr-2 hidden sm:block">
                <div className="text-sm font-medium text-slate-700">{totalComplete}/{totalIncluded} complete</div>
                <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-amber-600 hover:text-amber-700"
                onClick={onOpenOfflineDialog}
              >
                <WifiOff className="w-4 h-4" /> Offline
              </Button>
              {study?.generated_doc_url && (
                <a href={study.generated_doc_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="gap-2 text-blue-600">
                    <ExternalLink className="w-4 h-4" /> View Report
                  </Button>
                </a>
              )}
              <Button
                size="sm"
                disabled={totalIncluded === 0 || totalComplete < totalIncluded || generateReport.isPending}
                className="gap-2"
                onClick={() => generateReport.mutate()}
              >
                {generateReport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {generateReport.isPending ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-4 -mb-4 border-b-0">
            <button
              onClick={() => setActiveTab('clauses')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'clauses'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Clauses
            </button>
            <button
              onClick={() => setActiveTab('appendix')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'appendix'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Paperclip className="w-4 h-4" /> Appendix & Photos
            </button>
          </div>
        </div>
      </div>

      <FeasibilityStudyFormDialog open={editOpen} onOpenChange={setEditOpen} study={study} />
    </>
  );
}