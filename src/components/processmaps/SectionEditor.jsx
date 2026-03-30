import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import StepCard from "./StepCard";

export default function SectionEditor({ section, sectionIdx, dragHandleProps, stepTypes, onUpdate, onRemove, onAddStep, onEditStep, onRemoveStep }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card className="border-slate-200">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <div {...dragHandleProps} className="cursor-grab text-slate-400 hover:text-slate-600">
          <GripVertical className="w-5 h-5" />
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-slate-600">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <Input
          value={section.section_title || ""}
          onChange={e => onUpdate(sectionIdx, "section_title", e.target.value)}
          className="font-semibold text-slate-800 border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0"
          placeholder="Section Title"
        />
        <span className="text-xs text-slate-400 shrink-0">
          {(section.section_steps || []).length} step{(section.section_steps || []).length !== 1 ? "s" : ""}
        </span>
        <Button variant="ghost" size="icon" className="shrink-0 text-red-400 hover:text-red-600" onClick={() => onRemove(sectionIdx)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {!collapsed && (
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={section.section_description || ""}
            onChange={e => onUpdate(sectionIdx, "section_description", e.target.value)}
            placeholder="Section description (optional)..."
            rows={1}
            className="text-sm"
          />

          <Droppable droppableId={`steps-${sectionIdx}`} type="step">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[40px]">
                {(section.section_steps || []).map((step, stepIdx) => (
                  <Draggable key={`step-${sectionIdx}-${stepIdx}`} draggableId={`step-${sectionIdx}-${stepIdx}`} index={stepIdx}>
                    {(dragProv) => (
                      <div ref={dragProv.innerRef} {...dragProv.draggableProps}>
                        <StepCard
                          step={step}
                          stepTypes={stepTypes}
                          dragHandleProps={dragProv.dragHandleProps}
                          onEdit={() => onEditStep(sectionIdx, stepIdx)}
                          onRemove={() => onRemoveStep(sectionIdx, stepIdx)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <Button variant="outline" size="sm" onClick={() => onAddStep(sectionIdx)} className="gap-1 text-xs w-full border-dashed">
            <Plus className="w-3.5 h-3.5" /> Add Step
          </Button>
        </CardContent>
      )}
    </Card>
  );
}