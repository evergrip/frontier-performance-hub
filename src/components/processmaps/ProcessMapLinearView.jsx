import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Clock, ExternalLink, ArrowRight, Users } from "lucide-react";

const DEFAULT_STEP_TYPES = [
  { key: "task", label: "Task", icon: "✅", color: "#3b82f6" },
  { key: "deliverable", label: "Deliverable", icon: "📄", color: "#10b981" },
  { key: "milestone", label: "Milestone", icon: "🏁", color: "#8b5cf6" },
  { key: "meeting", label: "Meeting", icon: "👥", color: "#f59e0b" },
  { key: "decision", label: "Decision Point", icon: "❓", color: "#ef4444" },
  { key: "information_hand_off", label: "Information Handoff", icon: "🔄", color: "#6366f1" },
  { key: "admin_requirement", label: "Admin Requirement", icon: "📋", color: "#64748b" },
  { key: "client_signature_required", label: "Client Signature Required", icon: "✍️", color: "#ec4899" },
];

function StepDetail({ step, stepTypes }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = stepTypes.find(t => t.key === step.step_type) || {};

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-3 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm"
        style={{ backgroundColor: typeConfig.color || "#94a3b8" }}
        title={typeConfig.label}
      >
        <span className="text-white text-[10px]">{typeConfig.icon || "•"}</span>
      </div>

      <div
        className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {step.step_id && <span className="text-xs font-mono text-slate-400">{step.step_id}</span>}
              <p className="text-sm font-medium text-slate-800">{step.step_description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {step.responsible_roles?.length > 0 && (
                <span className="text-xs text-blue-600 flex items-center gap-0.5">
                  <Users className="w-3 h-3" /> {step.responsible_roles.join(", ")}
                </span>
              )}
              {step.estimated_duration_minutes && (
                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {step.estimated_duration_minutes}m
                </span>
              )}
              {step.is_decision_point && (
                <Badge variant="outline" className="text-xs text-red-600 border-red-200">Decision Point</Badge>
              )}
            </div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
            {/* RACI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {step.responsible_roles?.length > 0 && (
                <div><span className="text-xs font-semibold text-blue-600">Responsible</span><p className="text-xs text-slate-600">{step.responsible_roles.join(", ")}</p></div>
              )}
              {step.accountable_role && (
                <div><span className="text-xs font-semibold text-purple-600">Accountable</span><p className="text-xs text-slate-600">{step.accountable_role}</p></div>
              )}
              {step.consulted_roles?.length > 0 && (
                <div><span className="text-xs font-semibold text-amber-600">Consulted</span><p className="text-xs text-slate-600">{step.consulted_roles.join(", ")}</p></div>
              )}
              {step.informed_roles?.length > 0 && (
                <div><span className="text-xs font-semibold text-green-600">Informed</span><p className="text-xs text-slate-600">{step.informed_roles.join(", ")}</p></div>
              )}
            </div>

            {/* Inputs/Outputs */}
            {step.inputs?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-500">Inputs:</span>
                <p className="text-xs text-slate-600">{step.inputs.join(" • ")}</p>
              </div>
            )}
            {step.outputs?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-500">Outputs:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {step.outputs.map((o, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">{o.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Decision options */}
            {step.is_decision_point && step.decision_options?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-red-600">Decision Options:</span>
                <div className="space-y-1 mt-1">
                  {step.decision_options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <ArrowRight className="w-3 h-3 text-red-400" />
                      <span className="font-medium text-slate-700">{opt.option}</span>
                      {opt.next_step_id && <span className="text-slate-400">→ {opt.next_step_id}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {step.resources?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-500">Resources:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {step.resources.map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> {r.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {step.notes && (
              <div>
                <span className="text-xs font-semibold text-slate-500">Notes:</span>
                <p className="text-xs text-slate-600">{step.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProcessMapLinearView({ processMap }) {
  const sections = processMap.sections || [];
  const stepTypes = DEFAULT_STEP_TYPES; // Would use CompanySettings in prod

  if (sections.length === 0) {
    return <p className="text-center text-sm text-slate-400 py-10">No sections defined yet.</p>;
  }

  return (
    <div className="space-y-8">
      {sections.map((section, sIdx) => (
        <div key={sIdx}>
          <div className="mb-3">
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">{section.section_title}</h3>
            {section.section_description && <p className="text-sm text-slate-500 mt-0.5">{section.section_description}</p>}
          </div>

          {/* Timeline connector */}
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-3">
              {(section.section_steps || []).map((step, stepIdx) => (
                <StepDetail key={stepIdx} step={step} stepTypes={stepTypes} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}