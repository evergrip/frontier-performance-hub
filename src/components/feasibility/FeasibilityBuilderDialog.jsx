import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Circle, ChevronRight, FileText, AlertTriangle, Zap, Lock } from 'lucide-react';
import ClauseInputForm from './ClauseInputForm';

const SECTIONS = [
  'Site & Zoning Analysis',
  'Structural & Building Condition',
  'Utility & Service Assessment',
  'Budget Analysis',
  'Regulatory & Permit Pathway',
  'Risk Assessment',
  'Recommendations & Next Steps'
];

const COMPLETION_COLORS = {
  not_started: 'text-slate-400',
  in_progress: 'text-amber-500',
  complete: 'text-green-600'
};

export default function FeasibilityBuilderDialog({ open, onOpenChange, studyId }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState(SECTIONS[0]);
  const [activeClauseId, setActiveClauseId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: study } = useQuery({
    queryKey: ['feasibility-study', studyId],
    queryFn: async () => {
      const studies = await base44.entities.FeasibilityStudy.filter({ id: studyId });
      return studies[0] || null;
    },
    enabled: !!studyId,
  });

  const { data: clauses = [] } = useQuery({
    queryKey: ['feasibility-clauses'],
    queryFn: () => base44.entities.FeasibilityClause.filter({ is_active: true }),
  });

  const { data: selections = [], refetch: refetchSelections } = useQuery({
    queryKey: ['feasibility-selections', studyId],
    queryFn: () => base44.entities.FeasibilitySelection.filter({ study_id: studyId }),
    enabled: !!studyId,
  });

  const clauseMap = useMemo(() => Object.fromEntries(clauses.map(c => [c.id, c])), [clauses]);
  const selectionByClause = useMemo(() => Object.fromEntries(selections.map(s => [s.clause_id, s])), [selections]);

  const sectionClauses = useMemo(() => {
    return clauses
      .filter(c => c.section === activeSection)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [clauses, activeSection]);

  const sectionStats = useMemo(() => {
    const stats = {};
    SECTIONS.forEach(section => {
      const sectionCls = clauses.filter(c => c.section === section);
      const included = sectionCls.filter(c => selectionByClause[c.id]?.included);
      const complete = included.filter(c => selectionByClause[c.id]?.completion_status === 'complete');
      stats[section] = { total: sectionCls.length, included: included.length, complete: complete.length };
    });
    return stats;
  }, [clauses, selectionByClause]);

  // Compute which clauses are required by triggers
  const triggeredClauseIds = useMemo(() => {
    const required = new Set();
    clauses.forEach(clause => {
      const sel = selectionByClause[clause.id];
      if (!sel?.included) return;
      (clause.triggers || []).forEach(trigger => {
        if (trigger.condition_type === 'clause_selected') {
          (trigger.target_clause_ids || []).forEach(id => required.add(id));
        } else if (trigger.condition_type === 'field_value' && trigger.field_key) {
          const userData = sel.user_data || {};
          const actual = String(userData[trigger.field_key] || '');
          if (actual === trigger.field_value) {
            (trigger.target_clause_ids || []).forEach(id => required.add(id));
          }
        }
      });
    });
    return required;
  }, [clauses, selectionByClause]);

  const toggleClause = async (clauseId) => {
    const sel = selectionByClause[clauseId];
    if (!sel) return;
    // Prevent deselecting a clause required by a trigger
    if (sel.included && triggeredClauseIds.has(clauseId)) return;
    await base44.entities.FeasibilitySelection.update(sel.id, { included: !sel.included });
    refetchSelections();
  };

  // Auto-include triggered clauses
  React.useEffect(() => {
    const autoInclude = async () => {
      for (const clauseId of triggeredClauseIds) {
        const sel = selectionByClause[clauseId];
        if (sel && !sel.included) {
          await base44.entities.FeasibilitySelection.update(sel.id, { included: true });
        }
      }
      if ([...triggeredClauseIds].some(id => selectionByClause[id] && !selectionByClause[id].included)) {
        refetchSelections();
      }
    };
    if (triggeredClauseIds.size > 0) autoInclude();
  }, [triggeredClauseIds]);

  const totalIncluded = selections.filter(s => s.included).length;
  const totalComplete = selections.filter(s => s.included && s.completion_status === 'complete').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl">{study?.title || 'Feasibility Study Builder'}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span>{study?.property_address}</span>
              <span>•</span>
              <span>{totalComplete}/{totalIncluded} sections complete</span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" disabled className="gap-2">
                <FileText className="w-4 h-4" /> Generate Report
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar — section navigator */}
            <div className="w-64 border-r bg-slate-50 overflow-y-auto shrink-0">
              <div className="p-3 space-y-1">
                {SECTIONS.map(section => {
                  const stats = sectionStats[section] || {};
                  const isActive = section === activeSection;
                  return (
                    <button
                      key={section}
                      onClick={() => { setActiveSection(section); setActiveClauseId(null); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-white shadow-sm border font-medium text-slate-900' : 'text-slate-600 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{section}</span>
                        <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                        <span>{stats.complete || 0}/{stats.included || 0} done</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle — clause list */}
            <div className="w-72 border-r overflow-y-auto shrink-0">
              <div className="p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">{activeSection}</p>
                {sectionClauses.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                    No clauses defined for this section yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sectionClauses.map(clause => {
                      const sel = selectionByClause[clause.id];
                      const included = sel?.included;
                      const status = sel?.completion_status || 'not_started';
                      const isActive = activeClauseId === clause.id;

                      return (
                        <div key={clause.id} className={`rounded-lg border transition-colors ${isActive ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}>
                        <div className="flex items-start gap-2 px-3 py-2.5">
                          <button onClick={() => toggleClause(clause.id)} className="mt-0.5 shrink-0" disabled={triggeredClauseIds.has(clause.id) && included}>
                            {triggeredClauseIds.has(clause.id) && included ? (
                              <Lock className="w-5 h-5 text-amber-500" />
                            ) : included ? (
                              <CheckCircle2 className={`w-5 h-5 ${COMPLETION_COLORS[status]}`} />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                          <button
                            onClick={() => setActiveClauseId(clause.id)}
                            className="flex-1 text-left"
                          >
                            <p className={`text-sm font-medium ${included ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{clause.title}</p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {clause.risk_level && (
                                <Badge variant="outline" className="text-xs">{clause.risk_level}</Badge>
                              )}
                              {triggeredClauseIds.has(clause.id) && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-amber-600"><Zap className="w-3 h-3" />Required by trigger</span>
                              )}
                              {(clause.triggers || []).length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Zap className="w-3 h-3" />Has triggers</span>
                              )}
                            </div>
                          </button>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right — input form */}
            <div className="flex-1 overflow-y-auto bg-white">
              {activeClauseId && clauseMap[activeClauseId] ? (
                <ClauseInputForm
                  clause={clauseMap[activeClauseId]}
                  selection={selectionByClause[activeClauseId]}
                  onSave={(userData, staffNotes) => saveClauseData(activeClauseId, userData, staffNotes)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <FileText className="w-12 h-12 mb-3" />
                  <p className="text-sm">Select a clause from the left to fill in details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}