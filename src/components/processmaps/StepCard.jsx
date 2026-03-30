import React from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2, ExternalLink } from "lucide-react";

export default function StepCard({ step, stepTypes, dragHandleProps, onEdit, onRemove }) {
  const typeConfig = stepTypes.find(t => t.key === step.step_type) || {};

  return (
    <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors group">
      <div {...dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500">
        <GripVertical className="w-4 h-4" />
      </div>

      {typeConfig.icon && (
        <span className="text-sm shrink-0" title={typeConfig.label}>{typeConfig.icon}</span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {step.step_id && (
            <span className="text-xs font-mono text-slate-400 shrink-0">{step.step_id}</span>
          )}
          <p className="text-sm text-slate-700 truncate">{step.step_description || "Untitled Step"}</p>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {step.responsible_roles?.length > 0 && (
            <span className="text-xs text-blue-600">R: {step.responsible_roles.join(", ")}</span>
          )}
          {step.accountable_role && (
            <span className="text-xs text-purple-600">A: {step.accountable_role}</span>
          )}
          {step.is_decision_point && (
            <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Decision</span>
          )}
          {(step.resources || []).length > 0 && (
            <span className="text-xs text-slate-400 flex items-center gap-0.5">
              <ExternalLink className="w-3 h-3" /> {step.resources.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 text-slate-500" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </Button>
      </div>
    </div>
  );
}