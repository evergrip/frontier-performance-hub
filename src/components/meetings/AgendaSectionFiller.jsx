import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, MessageSquare, FileText, CheckSquare, RotateCcw, StickyNote, Timer, Plus, X } from 'lucide-react';

const ICONS = {
  discussion: MessageSquare,
  text_input: FileText,
  checklist: CheckSquare,
  action_review: RotateCcw,
  notes: StickyNote,
  time_boxed: Timer,
};

export default function AgendaSectionFiller({ sections = [], onChange }) {
  const updateSection = (index, updates) => {
    const next = [...sections];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const updateItem = (sectionIdx, itemIdx, updates) => {
    const next = [...sections];
    const items = [...(next[sectionIdx].items || [])];
    items[itemIdx] = { ...items[itemIdx], ...updates };
    next[sectionIdx] = { ...next[sectionIdx], items };
    onChange(next);
  };

  const addItem = (sectionIdx) => {
    const next = [...sections];
    const items = [...(next[sectionIdx].items || [])];
    items.push({ text: '', checked: false });
    next[sectionIdx] = { ...next[sectionIdx], items };
    onChange(next);
  };

  const removeItem = (sectionIdx, itemIdx) => {
    const next = [...sections];
    const items = (next[sectionIdx].items || []).filter((_, i) => i !== itemIdx);
    next[sectionIdx] = { ...next[sectionIdx], items };
    onChange(next);
  };

  if (!sections || sections.length === 0) return null;

  const totalMinutes = sections.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-1.5">
          <FileText className="w-4 h-4" /> Agenda
        </Label>
        {totalMinutes > 0 && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="w-3 h-3" /> {totalMinutes} min
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {sections.map((section, sIdx) => {
          const Icon = ICONS[section.type] || MessageSquare;
          return (
            <div key={section.id || sIdx} className="border rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-sm flex-1">{section.title}</span>
                {section.duration_minutes > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="w-3 h-3" /> {section.duration_minutes}m
                  </Badge>
                )}
              </div>

              {section.description && (
                <p className="text-xs text-slate-400 italic">{section.description}</p>
              )}

              {/* Text input / notes */}
              {(section.type === 'text_input' || section.type === 'notes') && (
                <Textarea
                  value={section.content || ''}
                  onChange={e => updateSection(sIdx, { content: e.target.value })}
                  placeholder={section.type === 'notes' ? 'Meeting notes...' : 'Enter details...'}
                  rows={3}
                  className="text-sm bg-white"
                />
              )}

              {/* Time-boxed topic */}
              {section.type === 'time_boxed' && (
                <Textarea
                  value={section.content || ''}
                  onChange={e => updateSection(sIdx, { content: e.target.value })}
                  placeholder="Discussion notes for this topic..."
                  rows={2}
                  className="text-sm bg-white"
                />
              )}

              {/* Discussion points */}
              {section.type === 'discussion' && (
                <div className="space-y-1.5 pl-1">
                  {(section.items || []).map((item, iIdx) => (
                    <div key={iIdx} className="flex items-start gap-2">
                      <span className="text-xs text-slate-400 pt-2 w-4">{iIdx + 1}.</span>
                      <Input
                        value={item.text}
                        onChange={e => updateItem(sIdx, iIdx, { text: e.target.value })}
                        placeholder="Discussion point"
                        className="flex-1 h-8 text-sm bg-white"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(sIdx, iIdx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => addItem(sIdx)} className="text-xs gap-1 h-7">
                    <Plus className="w-3 h-3" /> Add Point
                  </Button>
                </div>
              )}

              {/* Checklist */}
              {section.type === 'checklist' && (
                <div className="space-y-1.5 pl-1">
                  {(section.items || []).map((item, iIdx) => (
                    <div key={iIdx} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.checked || false}
                        onCheckedChange={v => updateItem(sIdx, iIdx, { checked: !!v })}
                      />
                      <Input
                        value={item.text}
                        onChange={e => updateItem(sIdx, iIdx, { text: e.target.value })}
                        placeholder="Checklist item"
                        className="flex-1 h-8 text-sm bg-white"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(sIdx, iIdx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => addItem(sIdx)} className="text-xs gap-1 h-7">
                    <Plus className="w-3 h-3" /> Add Item
                  </Button>
                </div>
              )}

              {/* Action review */}
              {section.type === 'action_review' && (
                <p className="text-xs text-slate-500 bg-white p-2 rounded border">
                  Previous action items will be automatically populated from the linked parent meeting.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}