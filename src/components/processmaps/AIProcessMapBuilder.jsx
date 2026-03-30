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

    let fileContent = null;
    let fileUrl = null;
    if (file) {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      fileUrl = uploaded.file_url;
      // Extract text content from the file for better reliability
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            full_text: { type: "string", description: "The complete text content of the document, preserving table structure and formatting" }
          }
        }
      });
      if (extracted?.status === "success" && extracted?.output) {
        fileContent = extracted.output.full_text || JSON.stringify(extracted.output);
      }
    }

    const stepTypeList = stepTypes.map(t => `${t.key}: ${t.label} - ${t.description || ""}`).join("\n");

    const prompt = `You are an expert process improvement consultant for the construction/renovation industry.
Analyze the following document content and extract a structured process map.

${fileContent ? `=== DOCUMENT CONTENT ===\n${fileContent}\n=== END DOCUMENT ===\n` : ""}
${additionalContext ? `ADDITIONAL CONTEXT FROM USER:\n${additionalContext}\n` : ""}

AVAILABLE STEP TYPES (use ONLY these keys for step_type):
${stepTypeList}

CURRENT PROCESS MAP CONTEXT:
Title: ${processMap?.title || "N/A"}
Description: ${processMap?.description || "N/A"}
Department: ${processMap?.department || "N/A"}

INSTRUCTIONS:
1. Group the steps into logical sections/phases (e.g. "Sales Handoff", "Feasibility", "Design", "Permitting", etc.)
2. For EACH step, assign the correct step_type from the available types above
3. For RACI: look at the document's participant list and assign responsible_roles, accountable_role, consulted_roles, informed_roles
4. Mark decision points (Go/No-Go, approval gates) with is_decision_point: true and list decision_options
5. Include inputs (what's needed) and outputs (what's produced) for each step
6. Generate step IDs like SEC1-001, SEC1-002, SEC2-001 etc.
7. Be thorough — capture ALL steps from the document, don't skip any
8. In the "improvements" section, suggest industry best practices that could enhance this process

IMPORTANT: Return ALL sections and ALL steps. This document has ~28 steps — make sure every single one is included.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
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

    if (!response?.sections || response.sections.length === 0) {
      setResult({ error: true, message: "AI did not return any sections. Try adding more context or a different document." });
      setLoading(false);
      return;
    }

    setResult(response);
    setLoading(false);
  };

  const handleReset = () => {
    setResult(null);
    setFile(null);
    setAdditionalContext("");
    if (fileRef.current) fileRef.current.value = "";
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
        ) : result?.error ? (
          <div className="space-y-4 mt-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Generation failed</p>
                <p className="text-sm text-red-600 mt-1">{result.message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleReset}>Try Again</Button>
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
              <Button variant="outline" onClick={handleReset}>
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