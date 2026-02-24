import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, X, Clock, MessageSquare, FileText, CheckSquare, RotateCcw, StickyNote, Timer } from 'lucide-react';

const SECTION_TYPES = [
  { value: 'discussion', label: 'Discussion', icon: MessageSquare, description: 'Talking points to cover' },
  { value: 'text_input', label: 'Fillable Text', icon: FileText, description: 'Free text area to fill in during meeting' },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare, description: 'Items to check off' },
  { value: 'action_review', label: 'Action Review', icon: RotateCcw, description: 'Review previous action items' },
  { value: 'notes', label: 'Notes', icon: StickyNote, description: 'Open notes section' },
  { value: 'time_boxed', label: 'Time-Boxed Topic', icon: Timer, description: 'Timed discussion topic' },
];

function SectionTypeIcon({ type, className = "w-4 h-4" }) {
  const found = SECTION_TYPES.find(s => s.value === type);
  const Icon = found?.icon || MessageSquare;
  return <Icon className={className} />;
}

function SectionCard({ section, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const updateSection = (field, value) => {
    onChange(index, { ...section, [field]: value });
  };

  const addItem = () => {
    const items = [...(section.default_items || []), ''];
    updateSection('default_items', items);
  };

  const updateItem = (itemIdx, value) => {
    const items = [...(section.default_items || [])];
    items[itemIdx] = value;
    updateSection('default_items', items);
  };

  const removeItem = (itemIdx) => {
    updateSection('default_items', (section.default_items || []).filter((_, i) => i !== itemIdx));
  };

  const typeInfo = SECTION_TYPES.find(s => s.value === section.type) || SECTION_TYPES[0];
  const showItems = ['discussion', 'checklist'].includes(section.type);

  return (
    <Card className="p-4 space-y-3 bg-white border-slate-200">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <button type="button" onClick={() => onMoveUp(index)} disabled={isFirst} className="text-slate-300 hover:text-slate-500 disabled:opacity-30">▲</button>
          <button type="button" onClick={() => onMoveDown(index)} disabled={isLast} className="text-slate-300 hover:text-slate-500 disabled:opacity-30">▼</button>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <Input
              value={section.title || ''}
              onChange={e => updateSection('title', e.target.value)}
              placeholder="Section title"
              className="flex-1 font-medium"
            />
            <Select value={section.type || 'discussion'} onValueChange={v => updateSection('type', v)}>
              <SelectTrigger className="w-44">
                <div className="flex items-center gap-1.5">
                  <SectionTypeIcon type={section.type} className="w-3.5 h-3.5" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPES.map(st => (
                  <SelectItem key={st.value} value={st.value}>
                    <div className="flex items-center gap-2">
                      <st.icon className="w-3.5 h-3.5" />
                      {st.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={section.duration_minutes || ''}
              onChange={e => updateSection('duration_minutes', parseInt(e.target.value) || 0)}
              placeholder="Min"
              className="w-20"
            />
            <span className="text-xs text-slate-400 self-center">min</span>
          </div>

          <Input
            value={section.description || ''}
            onChange={e => updateSection('description', e.target.value)}
            placeholder="Helper text / instructions (shown during meeting)"
            className="text-sm text-slate-500"
          />

          {showItems && (
            <div className="space-y-1.5 pl-2 border-l-2 border-slate-100">
              <Label className="text-xs text-slate-400">
                {section.type === 'checklist' ? 'Checklist items' : 'Discussion points'}
              </Label>
              {(section.default_items || []).map((item, itemIdx) => (
                <div key={itemIdx} className="flex gap-1.5 items-center">
                  <span className="text-xs text-slate-300 w-4">{itemIdx + 1}.</span>
                  <Input
                    value={item}
                    onChange={e => updateItem(itemIdx, e.target.value)}
                    placeholder={`Item ${itemIdx + 1}`}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(itemIdx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-xs gap-1 h-7">
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

export default function AgendaSectionBuilder({ sections = [], onChange }) {
  const addSection = () => {
    onChange([...sections, {
      id: `s_${Date.now()}`,
      title: '',
      type: 'discussion',
      description: '',
      duration_minutes: 5,
      default_items: [],
    }]);
  };

  const updateSection = (index, updated) => {
    const next = [...sections];
    next[index] = updated;
    onChange(next);
  };

  const removeSection = (index) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...sections];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index) => {
    if (index === sections.length - 1) return;
    const next = [...sections];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const totalMinutes = sections.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Agenda Sections</Label>
        {totalMinutes > 0 && (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" /> {totalMinutes} min total
          </Badge>
        )}
      </div>

      {sections.length === 0 && (
        <div className="text-center py-6 text-slate-400 border-2 border-dashed rounded-lg">
          <p className="text-sm">Add sections to build your agenda structure</p>
        </div>
      )}

      <div className="space-y-2">
        {sections.map((section, idx) => (
          <SectionCard
            key={section.id || idx}
            section={section}
            index={idx}
            onChange={updateSection}
            onRemove={removeSection}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            isFirst={idx === 0}
            isLast={idx === sections.length - 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addSection} className="w-full gap-1.5">
        <Plus className="w-4 h-4" /> Add Section
      </Button>
    </div>
  );
}

export { SECTION_TYPES, SectionTypeIcon };