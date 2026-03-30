import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Upload, Sparkles, Loader2, FileText, X, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AIProcessMapBuilder({ open, onOpenChange, processMap, stepTypes, onApply }) {
  const [file, setFile] = useState(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showImprovements, setShowImprovements] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleGenerate = async () => {
    if (!file && !additionalContext.trim()) return;
    setLoading(true);
    setResult(null);

    let fileUrl = null;
    if (file) {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      fileUrl = uploaded.file_url;
    }

    const stepTypeList = stepTypes.map(t => `${t.key}: ${t.label} - ${t.description || ""}`).join("\n");

    const prompt = `You are an expert process improvement consultant for the construction/renovation industry. 
Analyze the uploaded document${additionalContext ? " and additional context" : ""} and extract a structured process map.

AVAILABLE STEP TYPES:
${stepTypeList}

CURRENT PROCESS MAP CONTEXT:
Title: ${processMap?.title || "N/A"}
Description: ${processMap?.description || "N/A"}
Department: ${processMap?.department || "N/A"}

${additionalContext ? `ADDITIONAL CONTEXT FROM USER:\n${additionalContext}\n` : ""}

Return a JSON response with:
1. "sections" - array of process sections, each with:
   - "section_title": string
   - "section_description": string
   - "section_steps": array of steps, each with:
     - "step_description": string (clear, actionable description)
     - "step_type": one of the available step type keys
     - "responsible_roles": array of role names
     - "accountable_role": single role name
     - "consulted_roles": array of role names  
     - "informed_roles": array of role names
     - "estimated_duration_minutes": number or null
     - "inputs": array of strings (what's needed to start)
     - "outputs": array of objects with "name" and "description"
     - "is_decision_point": boolean
     - "decision_options": array of objects with "option" and "description" (only if decision point)
     - "notes": string

2. "improvements" - a markdown string with suggested improvements based on construction industry best practices, including:
   - Missing steps or controls
   - Opportunities for automation
   - Risk mitigation suggestions
   - RACI improvements
   - Quality checkpoints that should be added
   - Industry standard benchmarks

3. "objective" - suggested objective if the process map doesn't have one
4. "scope" - suggested scope if the process map doesn't have one

Be thorough and detailed. Generate step IDs in format SEC-001, SEC-002 etc. per section.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrl ? [fileUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section_title: { type: "string" },
                section_description: { type: "string" },
                section_steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step_id: { type: "string" },
                      step_description: { type: "string" },
                      step_type: { type: "string" },
                      responsible_roles: { type: "array", items: { type: "string" } },
                      accountable_role: { type: "string" },
                      consulted_roles: { type: "array", items: { type: "string" } },
                      informed_roles: { type: "array", items: { type: "string" } },
                      estimated_duration_minutes: { type: "number" },
                      inputs: { type: "array", items: { type: "string" } },
                      outputs: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            description: { type: "string" },
                          },
                        },
                      },
                      is_decision_point: { type: "boolean" },
                      decision_options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            option: { type: "string" },
                            description: { type: "string" },
                          },
                        },
                      },
                      notes: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          improvements: { type: "string" },
          objective: { type: "string" },
          scope: { type: "string" },
        },
      },
      model: "claude_sonnet_4_6",
    });

    setResult(response);
    setLoading(false);
  };

  const handleApply = (mode) => {
    if (!result) return;
    // Normalize sections with sort_order and clean data
    const sections = (result.sections || []).map((sec, sIdx) => ({
      section_title: sec.section_title,
      section_description: sec.section_description || "",
      sort_order: sIdx,
      section_steps: (sec.section_steps || []).map((step, stIdx) => ({
        step_id: step.step_id || `${sIdx + 1}-${stIdx + 1}`,
        step_description: step.step_description || "",
        step_type: step.step_type || "task",
        sort_order: stIdx,
        responsible_roles: step.responsible_roles || [],
        accountable_role: step.accountable_role || "",
        consulted_roles: step.consulted_roles || [],
        informed_roles: step.informed_roles || [],
        estimated_duration_minutes: step.estimated_duration_minutes || null,
        prerequisites: [],
        inputs: step.inputs || [],
        outputs: step.outputs || [],
        resources: [],
        is_decision_point: step.is_decision_point || false,
        decision_options: step.decision_options || [],
        notes: step.notes || "",
        custom_fields: {},
      })),
    }));

    onApply({ sections, mode, objective: result.objective, scope: result.scope });
    onOpenChange(false);
    setResult(null);
    setFile(null);
    setAdditionalContext("");
  };

  const totalSteps = result ? result.sections?.reduce((s, sec) => s + (sec.section_steps?.length || 0), 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI Process Builder
          </DialogTitle>
          <DialogDescription>
            Upload a document (PDF, Word, text) or describe your process, and AI will build a structured process map with improvement suggestions.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 mt-2">
            {/* File upload */}
            <div>
              <Label>Upload Document</Label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.html,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div className="flex items-center gap-3 p-3 mt-1 bg-slate-50 rounded-lg border">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full mt-1 p-6 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-center"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Click to upload a document</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, Word, Text, Excel, HTML, or images</p>
                </button>
              )}
            </div>

            {/* Additional context */}
            <div>
              <Label>Additional Context (optional)</Label>
              <Textarea
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="Describe the process, any special requirements, or paste process text here..."
                rows={4}
                className="mt-1"
              />
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              This uses a higher-quality AI model and may consume more integration credits.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={loading || (!file && !additionalContext.trim())} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Analyzing..." : "Generate Process Map"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Preview results */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Process map generated!</p>
                <p className="text-sm text-green-600 mt-1">
                  {result.sections?.length || 0} sections · {totalSteps} steps with RACI assignments
                </p>
              </div>
            </div>

            {/* Sections preview */}
            <div className="space-y-2">
              <Label>Sections & Steps</Label>
              {(result.sections || []).map((sec, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-sm text-slate-800">{sec.section_title}</p>
                  {sec.section_description && <p className="text-xs text-slate-500 mt-0.5">{sec.section_description}</p>}
                  <div className="mt-2 space-y-1">
                    {(sec.section_steps || []).map((step, j) => {
                      const st = stepTypes.find(t => t.key === step.step_type);
                      return (
                        <div key={j} className="flex items-start gap-2 text-xs text-slate-600">
                          <span>{st?.icon || "•"}</span>
                          <span>{step.step_description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Improvements */}
            {result.improvements && (
              <div className="border rounded-lg">
                <button
                  onClick={() => setShowImprovements(!showImprovements)}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm flex-1">Improvement Suggestions</span>
                  {showImprovements ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {showImprovements && (
                  <div className="p-4 pt-0 prose prose-sm prose-slate max-w-none text-sm">
                    <ReactMarkdown>{result.improvements}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* Apply buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setResult(null); }}>
                ← Back to Edit
              </Button>
              <Button variant="outline" onClick={() => handleApply("append")}>
                Append to Existing
              </Button>
              <Button onClick={() => handleApply("replace")} className="gap-1">
                <Sparkles className="w-4 h-4" /> Replace All Sections
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}