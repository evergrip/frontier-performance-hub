import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Sparkles, Loader2, Copy, BookOpen, Search } from "lucide-react";

const CATEGORIES = [
  { value: "customer_feedback", label: "Customer Feedback" },
  { value: "employee_satisfaction", label: "Employee Satisfaction" },
  { value: "market_research", label: "Market Research" },
  { value: "event_feedback", label: "Event Feedback" },
  { value: "product_feedback", label: "Product Feedback" },
  { value: "general", label: "General" },
  { value: "custom", label: "Custom" },
];

const CATEGORY_COLORS = {
  customer_feedback: "bg-blue-100 text-blue-700",
  employee_satisfaction: "bg-green-100 text-green-700",
  market_research: "bg-purple-100 text-purple-700",
  event_feedback: "bg-orange-100 text-orange-700",
  product_feedback: "bg-pink-100 text-pink-700",
  general: "bg-slate-100 text-slate-700",
  custom: "bg-amber-100 text-amber-700",
};

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function SurveyTemplateLibrary({ open, onOpenChange, onCreated }) {
  const [search, setSearch] = useState("");
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTemplate, setAiTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["surveyTemplates"],
    queryFn: () => base44.entities.Survey.filter({ is_template: true }, "-created_date"),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Survey.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      onOpenChange(false);
      onCreated?.();
    },
  });

  const useTemplate = (template) => {
    createMutation.mutate({
      title: `${template.title} (Copy)`,
      description: template.description,
      questions: (template.questions || []).map(q => ({ ...q, id: "q_" + Math.random().toString(36).substring(2, 9) })),
      styling: template.styling || {},
      success_message: template.success_message || "Thank you for completing this survey!",
      status: "draft",
      access_type: "link_only",
      share_token: generateToken(),
    });
  };

  const generateAITemplate = async () => {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    setAiTemplate(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a professional survey template based on this goal: "${aiGoal}"

Generate a JSON object with these fields:
- title: Survey title
- description: Brief description
- template_category: one of customer_feedback, employee_satisfaction, market_research, event_feedback, product_feedback, general
- questions: array of 6-10 questions, each with:
  - id: unique id like "q_1", "q_2" etc
  - text: the question text
  - type: one of text, textarea, radio, checkbox, dropdown, number, rating, scale
  - required: boolean
  - options: array of strings (only for radio, checkbox, dropdown)
  - description: optional helper text

Make the questions professional, well-structured, and comprehensive for the stated goal.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          template_category: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                type: { type: "string" },
                required: { type: "boolean" },
                options: { type: "array", items: { type: "string" } },
                description: { type: "string" },
              },
            },
          },
        },
      },
    });
    setAiTemplate(result);
    setAiLoading(false);
  };

  const useAITemplate = () => {
    if (!aiTemplate) return;
    createMutation.mutate({
      title: aiTemplate.title,
      description: aiTemplate.description,
      questions: aiTemplate.questions,
      status: "draft",
      access_type: "link_only",
      share_token: generateToken(),
      success_message: "Thank you for completing this survey!",
    });
  };

  const filtered = templates.filter(t =>
    !search || t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.template_description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Survey Templates
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">Template Library</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">AI Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No templates yet</p>
                <p className="text-xs text-slate-400">Save a survey as template or use the AI generator</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map(t => (
                  <Card key={t.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">{t.title}</h4>
                        <Badge className={CATEGORY_COLORS[t.template_category] || CATEGORY_COLORS.general}>
                          {CATEGORIES.find(c => c.value === t.template_category)?.label || "General"}
                        </Badge>
                      </div>
                      {t.template_description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{t.template_description}</p>
                      )}
                      <p className="text-xs text-slate-400 mb-3">{t.questions?.length || 0} questions</p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => useTemplate(t)} disabled={createMutation.isPending}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-4">
            <div>
              <Label>Describe your survey goal</Label>
              <Textarea
                value={aiGoal}
                onChange={e => setAiGoal(e.target.value)}
                placeholder="e.g. I want to measure customer satisfaction after they use our new mobile app feature..."
                rows={3}
              />
            </div>
            <Button onClick={generateAITemplate} disabled={!aiGoal.trim() || aiLoading} className="bg-purple-600 hover:bg-purple-700">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {aiLoading ? "Generating..." : "Generate Template"}
            </Button>

            {aiTemplate && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{aiTemplate.title}</h3>
                    <p className="text-sm text-slate-500">{aiTemplate.description}</p>
                  </div>
                  <div className="space-y-1">
                    {aiTemplate.questions?.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-white rounded p-2 border">
                        <Badge variant="outline" className="text-[10px] shrink-0">{q.type}</Badge>
                        <span className="truncate">{q.text}</span>
                        {q.required && <span className="text-red-500 shrink-0">*</span>}
                      </div>
                    ))}
                  </div>
                  <Button onClick={useAITemplate} className="w-full bg-[#ea7924] hover:bg-[#d66a1f]" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Survey from Template"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function SaveAsTemplateDialog({ open, onOpenChange, survey }) {
  const [category, setCategory] = useState(survey?.template_category || "general");
  const [description, setDescription] = useState(survey?.template_description || "");
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Survey.update(survey.id, {
      is_template: true,
      template_category: category,
      template_description: description,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["surveyTemplates"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Template Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Describe when to use this template..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} className="bg-[#ea7924] hover:bg-[#d66a1f]" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save as Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}