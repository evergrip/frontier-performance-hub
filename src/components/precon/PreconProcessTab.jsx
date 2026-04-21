import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown, ChevronRight, SkipForward } from 'lucide-react';
import { toast } from 'sonner';

function parseValidationRules(rulesText) {
  if (!rulesText) return [];
  return rulesText.split(',').map(r => r.trim()).filter(Boolean);
}

function checkValidation(progress, rules) {
  const failures = [];
  for (const rule of rules) {
    const lower = rule.toLowerCase();
    if (lower.includes('deliverable') && lower.includes('required')) {
      if (!progress?.deliverable_notes?.trim() && !progress?.deliverable_url?.trim()) {
        failures.push('Deliverable notes or URL required');
      }
    }
    if (lower.includes('approval') && lower.includes('approved')) {
      if (progress?.approval_status !== 'approved') {
        failures.push('Approval must be granted');
      }
    }
  }
  return failures;
}

export default function PreconProcessTab({ leadId }) {
  const queryClient = useQueryClient();
  const [expandedStage, setExpandedStage] = useState(null);

  const { data: stages = [] } = useQuery({
    queryKey: ['precon-stages'],
    queryFn: () => base44.entities.PreconStage.list('stage_order', 200),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['precon-progress', leadId],
    queryFn: () => base44.entities.PreconProgress.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const activeStages = stages.filter(s => s.is_active !== false).sort((a, b) => a.stage_order - b.stage_order);
  const progressMap = {};
  progress.forEach(p => { progressMap[p.stage_id] = p; });

  const updateMutation = useMutation({
    mutationFn: async ({ stageId, data }) => {
      const existing = progressMap[stageId];
      if (existing) {
        return base44.entities.PreconProgress.update(existing.id, data);
      } else {
        return base44.entities.PreconProgress.create({ lead_id: leadId, stage_id: stageId, ...data });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['precon-progress', leadId]),
  });

  const handleComplete = async (stage) => {
    const prog = progressMap[stage.id] || {};
    const rules = parseValidationRules(stage.validation_rules);
    const failures = checkValidation(prog, rules);
    if (failures.length > 0) {
      toast.error(`Cannot complete: ${failures.join('; ')}`);
      return;
    }
    const user = await base44.auth.me();
    updateMutation.mutate({
      stageId: stage.id,
      data: { status: 'complete', completed_by: user.id, completed_at: new Date().toISOString() },
    });
    toast.success(`"${stage.stage_name}" marked complete`);
  };

  const handleStart = (stage) => {
    updateMutation.mutate({ stageId: stage.id, data: { status: 'in_progress' } });
  };

  const handleSkip = (stage) => {
    updateMutation.mutate({ stageId: stage.id, data: { status: 'skipped' } });
  };

  const handleFieldSave = (stageId, field, value) => {
    updateMutation.mutate({ stageId, data: { [field]: value } });
    toast.success('Saved');
  };

  const completedCount = activeStages.filter(s => progressMap[s.id]?.status === 'complete').length;
  const pct = activeStages.length ? Math.round((completedCount / activeStages.length) * 100) : 0;

  const statusIcon = (status) => {
    if (status === 'complete') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === 'in_progress') return <Clock className="w-5 h-5 text-blue-500" />;
    if (status === 'skipped') return <SkipForward className="w-5 h-5 text-slate-400" />;
    return <Circle className="w-5 h-5 text-slate-300" />;
  };

  const gateColors = {
    'DG': 'bg-blue-100 text-blue-700',
    'IA': 'bg-purple-100 text-purple-700',
    'CS': 'bg-emerald-100 text-emerald-700',
    'AR': 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-600">Pre-Construction Progress</span>
          <span className="text-xs font-bold text-slate-700">{completedCount}/{activeStages.length} ({pct}%)</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-1">
        {activeStages.map((stage, idx) => {
          const prog = progressMap[stage.id];
          const status = prog?.status || 'not_started';
          const isExpanded = expandedStage === stage.id;
          const rules = parseValidationRules(stage.validation_rules);
          const failures = checkValidation(prog, rules);

          return (
            <div key={stage.id} className={`border rounded-lg transition-colors ${
              status === 'complete' ? 'border-emerald-200 bg-emerald-50/50' :
              status === 'in_progress' ? 'border-blue-200 bg-blue-50/50' :
              status === 'skipped' ? 'border-slate-200 bg-slate-50 opacity-60' :
              'border-slate-200'
            }`}>
              {/* Header row */}
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
              >
                {statusIcon(status)}
                <span className="text-xs font-mono text-slate-400 w-6">{stage.stage_order}</span>
                <span className={`flex-1 text-sm font-medium ${status === 'complete' ? 'text-emerald-700 line-through' : status === 'skipped' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {stage.stage_name}
                </span>
                {stage.approval_gate && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${gateColors[stage.approval_gate] || 'bg-slate-100 text-slate-600'}`}>
                    {stage.approval_gate}
                  </span>
                )}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                  {stage.purpose && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Purpose</p>
                      <p className="text-sm text-slate-700">{stage.purpose}</p>
                    </div>
                  )}
                  {stage.main_deliverable && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Main Deliverable</p>
                      <p className="text-sm text-slate-700">{stage.main_deliverable}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-slate-400">R:</span> <span className="font-medium text-blue-600">{stage.raci_responsible || '-'}</span></div>
                    <div><span className="text-slate-400">A:</span> <span className="font-medium text-purple-600">{stage.raci_accountable || '-'}</span></div>
                    <div><span className="text-slate-400">C:</span> <span>{stage.raci_consulted || '-'}</span></div>
                    <div><span className="text-slate-400">I:</span> <span>{stage.raci_informed || '-'}</span></div>
                  </div>

                  {/* Validation warnings */}
                  {status !== 'complete' && status !== 'skipped' && failures.length > 0 && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <div>{failures.map((f, i) => <p key={i}>{f}</p>)}</div>
                    </div>
                  )}

                  {/* Editable fields */}
                  {status !== 'skipped' && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Deliverable Notes</p>
                        <Textarea
                          defaultValue={prog?.deliverable_notes || ''}
                          onBlur={(e) => handleFieldSave(stage.id, 'deliverable_notes', e.target.value)}
                          rows={2}
                          placeholder="Notes on deliverable, evidence, etc."
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Deliverable URL</p>
                        <Input
                          defaultValue={prog?.deliverable_url || ''}
                          onBlur={(e) => handleFieldSave(stage.id, 'deliverable_url', e.target.value)}
                          placeholder="Link to file or document"
                          className="text-sm"
                        />
                      </div>
                      {stage.approval_gate && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Approval Status</p>
                          <div className="flex gap-2">
                            {['pending', 'approved', 'rejected'].map(s => (
                              <Button
                                key={s}
                                size="sm"
                                variant={prog?.approval_status === s ? 'default' : 'outline'}
                                className={`text-xs capitalize ${prog?.approval_status === s && s === 'approved' ? 'bg-emerald-600' : ''} ${prog?.approval_status === s && s === 'rejected' ? 'bg-red-600' : ''}`}
                                onClick={() => handleFieldSave(stage.id, 'approval_status', s)}
                              >
                                {s}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {status === 'not_started' && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleStart(stage)}>
                          <Clock className="w-3 h-3 mr-1" /> Start
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-slate-400" onClick={() => handleSkip(stage)}>
                          <SkipForward className="w-3 h-3 mr-1" /> Skip
                        </Button>
                      </>
                    )}
                    {status === 'in_progress' && (
                      <>
                        <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleComplete(stage)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-slate-400" onClick={() => handleSkip(stage)}>
                          <SkipForward className="w-3 h-3 mr-1" /> Skip
                        </Button>
                      </>
                    )}
                    {(status === 'complete' || status === 'skipped') && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateMutation.mutate({ stageId: stage.id, data: { status: 'in_progress', completed_by: null, completed_at: null } })}>
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}