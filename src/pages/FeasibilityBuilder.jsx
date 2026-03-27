import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import BuilderHeader from '../components/feasibility/BuilderHeader';
import BuilderSidebar, { SECTIONS } from '../components/feasibility/BuilderSidebar';
import BuilderClauseCard from '../components/feasibility/BuilderClauseCard';
import AppendixPhotosTab from '../components/feasibility/AppendixPhotosTab';
import ClauseFormDialog from '../components/admin/ClauseFormDialog';

export default function FeasibilityBuilder() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const studyId = urlParams.get('studyId');

  const [activeSection, setActiveSection] = useState(SECTIONS[0]);
  const [activeTab, setActiveTab] = useState('clauses');
  const [clauseFormOpen, setClauseFormOpen] = useState(false);
  const [editingClause, setEditingClause] = useState(null);
  const [clauseSaving, setClauseSaving] = useState(false);

  // Mobile section selector
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);

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
          if (String(userData[trigger.field_key] || '') === trigger.field_value) {
            (trigger.target_clause_ids || []).forEach(id => required.add(id));
          }
        }
      });
    });
    return required;
  }, [clauses, selectionByClause]);

  // Auto-include triggered clauses
  useEffect(() => {
    const autoInclude = async () => {
      let changed = false;
      for (const clauseId of triggeredClauseIds) {
        const sel = selectionByClause[clauseId];
        if (sel && !sel.included) {
          await base44.entities.FeasibilitySelection.update(sel.id, { included: true });
          changed = true;
        }
      }
      if (changed) refetchSelections();
    };
    if (triggeredClauseIds.size > 0) autoInclude();
  }, [triggeredClauseIds]);

  const totalIncluded = selections.filter(s => s.included).length;
  const totalComplete = selections.filter(s => s.included && s.completion_status === 'complete').length;

  const toggleClause = async (clauseId) => {
    const sel = selectionByClause[clauseId];
    if (!sel) return;
    if (sel.included && triggeredClauseIds.has(clauseId)) return;
    await base44.entities.FeasibilitySelection.update(sel.id, { included: !sel.included });
    refetchSelections();
  };

  const saveClauseData = async (clauseId, userData, staffNotes) => {
    const sel = selectionByClause[clauseId];
    if (!sel) return;
    const clause = clauseMap[clauseId];
    const requiredFields = (clause?.input_fields || []).filter(f => f.required);
    const allFilled = requiredFields.every(f => userData[f.key] !== undefined && userData[f.key] !== '');
    await base44.entities.FeasibilitySelection.update(sel.id, {
      user_data: userData,
      staff_notes: staffNotes,
      completion_status: allFilled ? 'complete' : 'in_progress'
    });
    refetchSelections();
    toast.success('Saved');
  };

  const handleSaveClause = async (formData) => {
    setClauseSaving(true);
    try {
      if (editingClause) {
        await base44.entities.FeasibilityClause.update(editingClause.id, formData);
      } else {
        const savedClause = await base44.entities.FeasibilityClause.create(formData);
        if (studyId && savedClause?.id) {
          await base44.entities.FeasibilitySelection.create({
            study_id: studyId,
            clause_id: savedClause.id,
            included: true,
            completion_status: 'not_started'
          });
        }
      }
      queryClient.invalidateQueries(['feasibility-clauses']);
      queryClient.invalidateQueries(['all-feasibility-clauses']);
      refetchSelections();
      setClauseFormOpen(false);
      setEditingClause(null);
    } finally {
      setClauseSaving(false);
    }
  };

  if (!studyId) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        No study selected.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BuilderHeader
        study={study}
        totalIncluded={totalIncluded}
        totalComplete={totalComplete}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === 'appendix' ? (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <AppendixPhotosTab
            study={study}
            onStudyUpdated={() => queryClient.invalidateQueries(['feasibility-study', studyId])}
          />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
          <BuilderSidebar
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            sectionStats={sectionStats}
          />

          {/* Mobile section selector */}
          <div className="lg:hidden w-full">
            <select
              value={activeSection}
              onChange={e => setActiveSection(e.target.value)}
              className="w-full mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium"
            >
              {SECTIONS.map((s, i) => (
                <option key={s} value={s}>{i + 1}. {s}</option>
              ))}
            </select>
          </div>

          {/* Main clause content */}
          <div className="flex-1 min-w-0 hidden lg:block">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{activeSection}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Toggle clauses on/off and fill in the details for each
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditingClause(null); setClauseFormOpen(true); }}>
                <Plus className="w-4 h-4" /> Add Clause
              </Button>
            </div>

            {sectionClauses.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium">No clauses defined for this section</p>
                <p className="text-xs mt-1">Add clauses from the clause library or create a new one</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sectionClauses.map(clause => (
                  <BuilderClauseCard
                    key={clause.id}
                    clause={clause}
                    selection={selectionByClause[clause.id]}
                    isTriggered={triggeredClauseIds.has(clause.id)}
                    onToggle={toggleClause}
                    onSave={saveClauseData}
                  />
                ))}
              </div>
            )}

            {/* Section navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              {SECTIONS.indexOf(activeSection) > 0 ? (
                <Button variant="outline" onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(activeSection) - 1])}>
                  ← Previous Section
                </Button>
              ) : <div />}
              {SECTIONS.indexOf(activeSection) < SECTIONS.length - 1 ? (
                <Button onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(activeSection) + 1])}>
                  Next Section →
                </Button>
              ) : <div />}
            </div>
          </div>

          {/* Mobile main content (mirrors desktop) */}
          <div className="flex-1 min-w-0 lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">{activeSection}</h2>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditingClause(null); setClauseFormOpen(true); }}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            {sectionClauses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">No clauses for this section</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sectionClauses.map(clause => (
                  <BuilderClauseCard
                    key={clause.id}
                    clause={clause}
                    selection={selectionByClause[clause.id]}
                    isTriggered={triggeredClauseIds.has(clause.id)}
                    onToggle={toggleClause}
                    onSave={saveClauseData}
                  />
                ))}
              </div>
            )}
            <div className="flex justify-between mt-6 pt-4 border-t">
              {SECTIONS.indexOf(activeSection) > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(activeSection) - 1])}>
                  ← Prev
                </Button>
              ) : <div />}
              {SECTIONS.indexOf(activeSection) < SECTIONS.length - 1 ? (
                <Button size="sm" onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(activeSection) + 1])}>
                  Next →
                </Button>
              ) : <div />}
            </div>
          </div>
        </div>
      )}

      <ClauseFormDialog
        open={clauseFormOpen}
        onOpenChange={(v) => { setClauseFormOpen(v); if (!v) setEditingClause(null); }}
        clause={editingClause}
        allClauses={clauses}
        onSave={handleSaveClause}
        saving={clauseSaving}
      />
    </div>
  );
}