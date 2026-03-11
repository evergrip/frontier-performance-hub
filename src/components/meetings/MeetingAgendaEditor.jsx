import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, FileText, ClipboardList, Loader2 } from 'lucide-react';
import AgendaSectionFiller from './AgendaSectionFiller';

export default function MeetingAgendaEditor({
  agendaHtml, minutesHtml, agendaTemplateId, agendaSections,
  meetingType, meetingTitle,
  onAgendaChange, onMinutesChange, onTemplateSelect, onAgendaSectionsChange,
  showMinutes = false
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescOpen, setAiDescOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['agendaTemplates'],
    queryFn: () => base44.entities.MeetingAgendaTemplate.list(),
    initialData: [],
  });

  const activeTemplates = templates
    .filter(t => t.is_active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const relevantTemplates = activeTemplates.filter(t => !t.meeting_type || t.meeting_type === meetingType);

  const handleApplyTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect?.(templateId);

      // Apply structured sections
      if (template.sections && template.sections.length > 0) {
        const filledSections = template.sections.map(s => ({
          id: s.id,
          title: s.title,
          type: s.type,
          description: s.description || '',
          duration_minutes: s.duration_minutes || 0,
          content: '',
          items: (s.default_items || []).map(text => ({ text, checked: false })),
        }));
        onAgendaSectionsChange?.(filledSections);
      }

      // Also set legacy HTML if template has it
      if (template.content_html) {
        onAgendaChange?.(template.content_html);
      }
    }
  };

  const handleAIGenerate = async () => {
    setAiLoading(true);
    const prompt = `Generate a professional meeting agenda in HTML format for a meeting titled "${meetingTitle || 'Team Meeting'}". 
The meeting type is "${meetingType || 'general'}".
${agendaHtml ? `Use this existing agenda as a starting point and enhance it:\n${agendaHtml}` : ''}
Format the agenda with clear numbered sections, time allocations, and action-oriented items.
Use clean HTML with <h3>, <ol>, <li>, <p>, and <strong> tags. Keep it concise and actionable.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          agenda_html: { type: 'string', description: 'The HTML formatted agenda' }
        }
      }
    });
    onAgendaChange?.(result.agenda_html || '');
    setAiLoading(false);
  };

  const hasStructuredSections = agendaSections && agendaSections.length > 0;

  const templatePicker = (
    <div className="flex gap-2">
      <Select value={agendaTemplateId || ''} onValueChange={handleApplyTemplate}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Apply a template..." />
        </SelectTrigger>
        <SelectContent>
          {relevantTemplates.map(t => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
              {(t.sections || []).length > 0 && ` (${t.sections.length} sections)`}
            </SelectItem>
          ))}
          {relevantTemplates.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">No templates available</div>
          )}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" onClick={handleAIGenerate} disabled={aiLoading} className="gap-1.5 shrink-0">
        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
        {aiLoading ? 'Generating...' : 'AI Agenda'}
      </Button>
    </div>
  );

  const agendaContent = (
    <div className="space-y-3">
      {templatePicker}

      {hasStructuredSections ? (
        <AgendaSectionFiller
          sections={agendaSections}
          onChange={onAgendaSectionsChange}
        />
      ) : (
        <div className="bg-white rounded-md border">
          <ReactQuill
            value={agendaHtml || ''}
            onChange={onAgendaChange}
            placeholder="Write your meeting agenda here, or apply a template above..."
            theme="snow"
            modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] }}
          />
        </div>
      )}
    </div>
  );

  if (!showMinutes) {
    return (
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-1.5">
          <FileText className="w-4 h-4" /> Agenda
        </Label>
        {agendaContent}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs defaultValue="agenda">
        <TabsList className="w-full">
          <TabsTrigger value="agenda" className="flex-1 gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Agenda
          </TabsTrigger>
          <TabsTrigger value="minutes" className="flex-1 gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Minutes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-3">
          {agendaContent}
        </TabsContent>

        <TabsContent value="minutes" className="mt-3">
          <div className="bg-white rounded-md border">
            <ReactQuill
              value={minutesHtml || ''}
              onChange={onMinutesChange}
              placeholder="Record meeting minutes here..."
              theme="snow"
              modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}