import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Save, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import SectionEditor from "../components/processmaps/SectionEditor";
import StepFormDialog from "../components/processmaps/StepFormDialog";
import AIProcessMapBuilder from "../components/processmaps/AIProcessMapBuilder";

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

export default function ProcessMapEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const mapId = urlParams.get("id");
  const queryClient = useQueryClient();

  const [sections, setSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [stepDialog, setStepDialog] = useState({ open: false, sectionIdx: null, step: null, stepIdx: null });
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const { data: processMap, isLoading } = useQuery({
    queryKey: ["processMap", mapId],
    queryFn: () => base44.entities.ProcessMap.filter({ id: mapId }),
    select: (data) => data?.[0],
    enabled: !!mapId,
  });

  const { data: settings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.list();
      return list?.[0] || {};
    },
  });

  const stepTypes = settings?.process_step_types?.length > 0 ? settings.process_step_types : DEFAULT_STEP_TYPES;

  const handleAIApply = async ({ sections: aiSections, mode, objective, scope }) => {
    if (mode === "replace") {
      setSections(aiSections);
    } else {
      setSections(prev => [...prev, ...aiSections.map((s, i) => ({ ...s, sort_order: prev.length + i }))]);
    }
    // Update objective/scope if empty
    if (objective || scope) {
      const updates = {};
      if (objective && !processMap.objective) updates.objective = objective;
      if (scope && !processMap.scope) updates.scope = scope;
      if (Object.keys(updates).length > 0) {
        await base44.entities.ProcessMap.update(mapId, updates);
        queryClient.invalidateQueries({ queryKey: ["processMap", mapId] });
      }
    }
  };

  useEffect(() => {
    if (processMap?.sections) {
      setSections(JSON.parse(JSON.stringify(processMap.sections)));
    }
  }, [processMap]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ProcessMap.update(mapId, { sections });
    queryClient.invalidateQueries({ queryKey: ["processMap", mapId] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSection = () => {
    const title = newSectionTitle.trim() || `Section ${sections.length + 1}`;
    setSections(prev => [...prev, {
      section_title: title,
      section_description: "",
      sort_order: prev.length,
      section_steps: [],
    }]);
    setNewSectionTitle("");
  };

  const handleSectionKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSection();
    }
  };

  const updateSection = (idx, field, value) => {
    setSections(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const removeSection = (idx) => {
    if (!window.confirm("Delete this section and all its steps?")) return;
    setSections(prev => prev.filter((_, i) => i !== idx));
  };

  // Quick-add step directly (no dialog)
  const quickAddStep = (sectionIdx, step) => {
    setSections(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[sectionIdx].section_steps.push(step);
      return copy;
    });
  };

  // Open dialog for detailed editing
  const editStep = (sectionIdx, stepIdx) => {
    const step = sections[sectionIdx].section_steps[stepIdx];
    setStepDialog({ open: true, sectionIdx, step, stepIdx });
  };

  const saveStep = (step) => {
    setSections(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const sec = copy[stepDialog.sectionIdx];
      if (stepDialog.stepIdx !== null) {
        sec.section_steps[stepDialog.stepIdx] = step;
      } else {
        step.sort_order = sec.section_steps.length;
        sec.section_steps.push(step);
      }
      return copy;
    });
    setStepDialog({ open: false, sectionIdx: null, step: null, stepIdx: null });
  };

  const removeStep = (sectionIdx, stepIdx) => {
    setSections(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[sectionIdx].section_steps.splice(stepIdx, 1);
      return copy;
    });
  };

  const onDragEnd = useCallback((result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "section") {
      setSections(prev => {
        const copy = [...prev];
        const [moved] = copy.splice(source.index, 1);
        copy.splice(destination.index, 0, moved);
        return copy.map((s, i) => ({ ...s, sort_order: i }));
      });
    } else if (type === "step") {
      const srcSecIdx = parseInt(source.droppableId.replace("steps-", ""));
      const dstSecIdx = parseInt(destination.droppableId.replace("steps-", ""));
      setSections(prev => {
        const copy = JSON.parse(JSON.stringify(prev));
        const [moved] = copy[srcSecIdx].section_steps.splice(source.index, 1);
        copy[dstSecIdx].section_steps.splice(destination.index, 0, moved);
        copy[dstSecIdx].section_steps.forEach((s, i) => { s.sort_order = i; });
        if (srcSecIdx !== dstSecIdx) {
          copy[srcSecIdx].section_steps.forEach((s, i) => { s.sort_order = i; });
        }
        return copy;
      });
    }
  }, []);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (!processMap) {
    return <div className="text-center py-20 text-slate-500">Process map not found.</div>;
  }

  const totalSteps = sections.reduce((sum, s) => sum + (s.section_steps || []).length, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/ProcessMaps">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{processMap.title}</h1>
            <p className="text-sm text-slate-500">
              {sections.length} section{sections.length !== 1 ? "s" : ""} · {totalSteps} step{totalSteps !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setAiDialogOpen(true)} className="gap-1">
          <Sparkles className="w-4 h-4" /> AI Builder
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved ✓" : "Save"}
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {sections.map((section, sIdx) => (
                <Draggable key={`section-${sIdx}`} draggableId={`section-${sIdx}`} index={sIdx}>
                  {(dragProvided) => (
                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                      <SectionEditor
                        section={section}
                        sectionIdx={sIdx}
                        dragHandleProps={dragProvided.dragHandleProps}
                        stepTypes={stepTypes}
                        onUpdate={updateSection}
                        onRemove={removeSection}
                        onAddStep={quickAddStep}
                        onEditStep={editStep}
                        onRemoveStep={removeStep}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Inline add section */}
      <div className="mt-4 flex gap-2 items-center">
        <Input
          value={newSectionTitle}
          onChange={e => setNewSectionTitle(e.target.value)}
          onKeyDown={handleSectionKeyDown}
          placeholder="New section name... (press Enter)"
          className="flex-1 h-10"
        />
        <Button variant="outline" onClick={addSection} className="gap-1 h-10 shrink-0">
          <Plus className="w-4 h-4" /> Add Section
        </Button>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-12 mt-4 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-500 mb-1">No sections yet.</p>
          <p className="text-sm text-slate-400">Type a section name above and press Enter to start.</p>
        </div>
      )}

      <StepFormDialog
        open={stepDialog.open}
        onOpenChange={(o) => setStepDialog(s => ({ ...s, open: o }))}
        step={stepDialog.step}
        stepTypes={stepTypes}
        allSteps={sections.flatMap(s => s.section_steps || [])}
        onSave={saveStep}
      />

      <AIProcessMapBuilder
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        processMap={processMap}
        stepTypes={stepTypes}
        onApply={handleAIApply}
      />
    </div>
  );
}