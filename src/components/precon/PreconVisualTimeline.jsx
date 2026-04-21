import React from 'react';
import { CheckCircle2, Circle, Clock, SkipForward, AlertTriangle, Calendar } from 'lucide-react';
import { calculateDueDate } from './preconGuardrails';
import { format, isPast, differenceInDays } from 'date-fns';

const gateColors = {
  'DG': 'border-blue-400 bg-blue-50',
  'IA': 'border-purple-400 bg-purple-50',
  'CS': 'border-emerald-400 bg-emerald-50',
  'AR': 'border-amber-400 bg-amber-50',
};

const gateDotColors = {
  'DG': 'bg-blue-500',
  'IA': 'bg-purple-500',
  'CS': 'bg-emerald-500',
  'AR': 'bg-amber-500',
};

function StatusDot({ status, gate }) {
  if (status === 'complete') return <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div>;
  if (status === 'in_progress') return <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><Clock className="w-3.5 h-3.5 text-white" /></div>;
  if (status === 'skipped') return <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center"><SkipForward className="w-3.5 h-3.5 text-white" /></div>;
  if (gate) return <div className={`w-6 h-6 rounded-full ${gateDotColors[gate] || 'bg-slate-300'} flex items-center justify-center`}><Circle className="w-3 h-3 text-white" /></div>;
  return <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-slate-300" />;
}

export default function PreconVisualTimeline({ stages, progressMap, projectStartDate, onStageClick, activeStageId }) {
  // Build completion dates map for relative due date calculations
  const completionDates = {};
  stages.forEach(s => {
    const p = progressMap[s.id];
    if (p?.completed_at) {
      completionDates[s.stage_order] = p.completed_at;
    }
  });

  const completedCount = stages.filter(s => progressMap[s.id]?.status === 'complete').length;
  const pct = stages.length ? Math.round((completedCount / stages.length) * 100) : 0;

  // Find current active stage (first non-complete, non-skipped)
  const currentStage = stages.find(s => {
    const status = progressMap[s.id]?.status || 'not_started';
    return status !== 'complete' && status !== 'skipped';
  });

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Pre-Construction Progress</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {completedCount} of {stages.length} stages complete
              {currentStage && <span> • Currently: <span className="text-blue-300 font-medium">{currentStage.stage_name}</span></span>}
            </p>
          </div>
          <div className="text-2xl font-bold">{pct}%</div>
        </div>
        <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Visual timeline */}
      <div className="relative">
        <div className="space-y-0">
          {stages.map((stage, idx) => {
            const prog = progressMap[stage.id];
            const status = prog?.status || 'not_started';
            const isActive = activeStageId === stage.id;
            const dueDate = calculateDueDate(stage.due_date_logic, projectStartDate, completionDates);
            const isOverdue = dueDate && status !== 'complete' && status !== 'skipped' && isPast(dueDate);
            const daysUntilDue = dueDate && status !== 'complete' && status !== 'skipped' ? differenceInDays(dueDate, new Date()) : null;
            const isLast = idx === stages.length - 1;

            return (
              <div key={stage.id} className="flex group">
                {/* Timeline track */}
                <div className="flex flex-col items-center mr-3 relative" style={{ minWidth: 24 }}>
                  <StatusDot status={status} gate={stage.approval_gate} />
                  {!isLast && (
                    <div className={`w-0.5 flex-1 min-h-[20px] ${status === 'complete' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                  )}
                </div>

                {/* Stage card */}
                <button
                  className={`flex-1 mb-1 p-2.5 rounded-lg text-left transition-all border ${
                    isActive ? 'border-blue-300 bg-blue-50 shadow-sm' :
                    status === 'complete' ? 'border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50' :
                    status === 'in_progress' ? 'border-blue-100 bg-blue-50/40 hover:bg-blue-50' :
                    status === 'skipped' ? 'border-slate-100 bg-slate-50/40 opacity-50' :
                    'border-slate-100 bg-white hover:bg-slate-50'
                  } ${stage.approval_gate ? gateColors[stage.approval_gate] || '' : ''}`}
                  onClick={() => onStageClick?.(stage.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 w-5 shrink-0">{stage.stage_order}</span>
                    <span className={`text-xs font-medium flex-1 ${
                      status === 'complete' ? 'text-emerald-700' :
                      status === 'skipped' ? 'text-slate-400 line-through' :
                      status === 'in_progress' ? 'text-blue-700' :
                      'text-slate-700'
                    }`}>
                      {stage.stage_name}
                    </span>
                    {stage.approval_gate && (
                      <span className="text-[9px] px-1 py-0.5 rounded-full font-semibold bg-white/60 text-slate-600">
                        {stage.approval_gate}
                      </span>
                    )}
                    {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                  </div>

                  {/* Due date + completion info */}
                  <div className="flex items-center gap-3 mt-1 ml-5">
                    {dueDate && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${
                        isOverdue ? 'text-red-500 font-medium' :
                        daysUntilDue !== null && daysUntilDue <= 3 ? 'text-amber-500' :
                        'text-slate-400'
                      }`}>
                        <Calendar className="w-2.5 h-2.5" />
                        {format(dueDate, 'MMM d')}
                        {isOverdue && ' (overdue)'}
                        {!isOverdue && daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && ` (${daysUntilDue}d)`}
                      </span>
                    )}
                    {status === 'complete' && prog?.completed_at && (
                      <span className="text-[10px] text-emerald-500">
                        Completed {format(new Date(prog.completed_at), 'MMM d')}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}