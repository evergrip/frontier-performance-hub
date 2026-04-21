import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight, SkipForward, FileText, ShieldAlert, Bot } from 'lucide-react';
import { toast } from 'sonner';
import DeliverableForm from './DeliverableForm';
import PreconVisualTimeline from './PreconVisualTimeline';
import PreconHandoffPackage from './PreconHandoffPackage';
import { fullGuardrailCheck, extractFinancialSummary } from './preconGuardrails';
import StageAssistantChat from './StageAssistantChat';
import CopilotAlertsBanner from './CopilotAlertsBanner';
import BuildertrendAnalyzer from './BuildertrendAnalyzer';

export default function PreconProcessTab({ leadId }) {
  const queryClient = useQueryClient();
  const [expandedStage, setExpandedStage] = useState(null);
  const [showForm, setShowForm] = useState(null);
  const [showChat, setShowChat] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'detail'

  const { data: stages = [] } = useQuery({
    queryKey: ['precon-stages'],
    queryFn: () => base44.entities.PreconStage.list('stage_order', 200),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['precon-progress', leadId],
    queryFn: () => base44.entities.PreconProgress.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const { data: allLeads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date', 500),
    staleTime: 60000,
  });
  const leadData = allLeads.find(l => l.id === leadId) || null;

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
    staleTime: 60000,
  });
  const clientData = leadData?.client_id ? allClients.find(c => c.id === leadData.client_id) || null : null;

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500),
    staleTime: 60000,
    enabled: !!leadData?.converted_to_sale_id,
  });
  const saleData = leadData?.converted_to_sale_id ? allSales.find(s => s.id === leadData.converted_to_sale_id) || null : null;

  const activeStages = stages.filter(s => s.is_active !== false).sort((a, b) => a.stage_order - b.stage_order);
  const progressMap = {};
  progress.forEach(p => { progressMap[p.stage_id] = p; });

  // Determine project start date (first progress created_date, or lead created_date)
  const projectStartDate = progress.length > 0
    ? progress.reduce((min, p) => (!min || p.created_date < min) ? p.created_date : min, null)
    : leadData?.created_date;

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
    const { canComplete, failures } = fullGuardrailCheck(stage, prog);
    if (!canComplete) {
      toast.error(`Cannot complete: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? ` (+${failures.length - 3} more)` : ''}`, { duration: 5000 });
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

  const handleTimelineClick = (stageId) => {
    setExpandedStage(stageId);
    setViewMode('detail');
  };

  // Financial summary
  const financials = extractFinancialSummary(progress, stages);
  const CURRENCY_FMT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const gateColors = {
    'DG': 'bg-blue-100 text-blue-700',
    'IA': 'bg-purple-100 text-purple-700',
    'CS': 'bg-emerald-100 text-emerald-700',
    'AR': 'bg-amber-100 text-amber-700',
  };

  const statusIcon = (status) => {
    if (status === 'complete') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === 'in_progress') return <Clock className="w-5 h-5 text-blue-500" />;
    if (status === 'skipped') return <SkipForward className="w-5 h-5 text-slate-400" />;
    return <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;
  };

  return (
    <div className="space-y-4">
      {/* View toggle + financial summary */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'detail' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setViewMode('detail')}
          >
            Detail View
          </button>
        </div>
        <div className="flex gap-3 text-xs text-slate-500">
          {financials.estimatedPreconValue && (
            <span>Pre-Con: <span className="font-semibold text-slate-700">{CURRENCY_FMT.format(financials.estimatedPreconValue)}</span></span>
          )}
          {financials.estimatedConstructionValue && (
            <span>Construction: <span className="font-semibold text-slate-700">{CURRENCY_FMT.format(financials.estimatedConstructionValue)}</span></span>
          )}
        </div>
      </div>

      {/* Co-Pilot Alerts */}
      <CopilotAlertsBanner leadId={leadId} />

      {/* Visual Timeline View */}
      {viewMode === 'timeline' && (
        <PreconVisualTimeline
          stages={activeStages}
          progressMap={progressMap}
          projectStartDate={projectStartDate}
          onStageClick={handleTimelineClick}
          activeStageId={expandedStage}
        />
      )}

      {/* Detail View */}
      {viewMode === 'detail' && (
        <div className="space-y-1">
          {activeStages.map((stage) => {
            const prog = progressMap[stage.id];
            const status = prog?.status || 'not_started';
            const isExpanded = expandedStage === stage.id;
            const { canComplete, failures } = fullGuardrailCheck(stage, prog);
            const isFormOpen = showForm === stage.id;
            const isChatOpen = showChat === stage.id;

            return (
              <div key={stage.id} className={`border rounded-lg transition-colors ${
                status === 'complete' ? 'border-emerald-200 bg-emerald-50/50' :
                status === 'in_progress' ? 'border-blue-200 bg-blue-50/50' :
                status === 'skipped' ? 'border-slate-200 bg-slate-50 opacity-60' :
                'border-slate-200'
              }`}>
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                >
                  {statusIcon(status)}
                  <span className="text-xs font-mono text-slate-400 w-6">{stage.stage_order}</span>
                  <span className={`flex-1 text-sm font-medium ${status === 'complete' ? 'text-emerald-700 line-through' : status === 'skipped' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {stage.stage_name}
                  </span>
                  {/* Guardrail indicator */}
                  {status !== 'complete' && status !== 'skipped' && !canComplete && (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" title="Missing required fields" />
                  )}
                  {stage.approval_gate && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${gateColors[stage.approval_gate] || 'bg-slate-100 text-slate-600'}`}>
                      {stage.approval_gate}
                    </span>
                  )}
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>

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

                    {/* Guardrail warnings */}
                    {status !== 'complete' && status !== 'skipped' && failures.length > 0 && (
                      <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                        <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold mb-0.5">Completion blocked ({failures.length} issue{failures.length > 1 ? 's' : ''}):</p>
                          {failures.slice(0, 5).map((f, i) => <p key={i}>• {f}</p>)}
                          {failures.length > 5 && <p className="italic">+{failures.length - 5} more...</p>}
                        </div>
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

                    {/* Buildertrend Analyzer */}
                    {status !== 'skipped' && (
                      <BuildertrendAnalyzer
                        stage={stage}
                        leadId={leadId}
                        leadData={leadData}
                        progress={prog}
                      />
                    )}

                    {/* Deliverable Form + Co-Pilot toggle */}
                    {status !== 'skipped' && (
                      <div className="border-t border-slate-100 pt-2 flex gap-2">
                        <Button
                          type="button" variant="outline" size="sm" className="text-xs flex-1"
                          onClick={() => setShowForm(isFormOpen ? null : stage.id)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {isFormOpen ? 'Hide Form' : 'Open Form'}
                        </Button>
                        <Button
                          type="button" variant={isChatOpen ? 'default' : 'outline'} size="sm"
                          className={`text-xs flex-1 ${isChatOpen ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                          onClick={() => setShowChat(isChatOpen ? null : stage.id)}
                        >
                          <Bot className="w-3 h-3 mr-1" />
                          {isChatOpen ? 'Hide Co-Pilot' : 'Co-Pilot'}
                        </Button>
                      </div>
                    )}

                    {isFormOpen && status !== 'skipped' && (
                      <DeliverableForm
                        stage={stage}
                        progress={prog}
                        leadId={leadId}
                        allProgress={progress}
                        stages={stages}
                        leadData={leadData}
                        clientData={clientData}
                        saleData={saleData}
                      />
                    )}

                    {/* Co-Pilot Chat */}
                    {isChatOpen && status !== 'skipped' && (
                      <StageAssistantChat
                        stage={stage}
                        progress={prog}
                        leadData={leadData}
                        clientData={clientData}
                        saleData={saleData}
                        allProgress={progress}
                        stages={stages}
                      />
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
                          <Button
                            size="sm"
                            className={`text-xs ${canComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`}
                            onClick={() => handleComplete(stage)}
                            disabled={!canComplete}
                            title={!canComplete ? `Blocked: ${failures[0]}` : 'Mark complete'}
                          >
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
      )}

      {/* Handoff package (visible when at or near Stage 34) */}
      {activeStages.length > 0 && (
        <PreconHandoffPackage
          stages={activeStages}
          progressMap={progressMap}
          leadData={leadData}
          clientData={clientData}
        />
      )}
    </div>
  );
}