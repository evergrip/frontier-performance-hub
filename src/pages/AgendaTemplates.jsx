import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FileText, Loader2, Clock } from 'lucide-react';
import AgendaSectionBuilder, { SECTION_TYPES, SectionTypeIcon } from '../components/meetings/AgendaSectionBuilder';

export default function AgendaTemplates() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', meeting_type: '', sections: [], is_active: true, display_order: 0 });
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['agendaTemplates'],
    queryFn: () => base44.entities.MeetingAgendaTemplate.list(),
    initialData: [],
  });

  const { data: meetingTypes = [] } = useQuery({
    queryKey: ['meetingTypes'],
    queryFn: () => base44.entities.MeetingType.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MeetingAgendaTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agendaTemplates'] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingAgendaTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agendaTemplates'] }); setFormOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingAgendaTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendaTemplates'] }),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', meeting_type: '', sections: [], is_active: true, display_order: 0 });
    setFormOpen(true);
  };

  const openEdit = (template) => {
    setEditing(template);
    setForm({
      name: template.name,
      meeting_type: template.meeting_type || '',
      sections: template.sections || [],
      is_active: template.is_active !== false,
      display_order: template.display_order || 0,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const data = { ...form };
    if (!data.meeting_type) delete data.meeting_type;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (template) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const getTypeLabel = (val) => meetingTypes.find(t => t.value === val)?.label || val || 'All Types';
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agenda Templates</h1>
          <p className="text-slate-500">Build structured agenda templates with sections, checklists, and fillable fields</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No agenda templates yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            .map(t => {
              const sections = t.sections || [];
              const totalMin = sections.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
              return (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{t.name}</CardTitle>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="outline">{getTypeLabel(t.meeting_type)}</Badge>
                          {sections.length > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              {sections.length} section{sections.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {totalMin > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="w-3 h-3" /> {totalMin}m
                            </Badge>
                          )}
                          {t.is_active === false && <Badge className="bg-red-100 text-red-700">Inactive</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sections.length > 0 ? (
                      <div className="space-y-1">
                        {sections.map((s, idx) => (
                          <div key={s.id || idx} className="flex items-center gap-2 text-sm text-slate-600">
                            <SectionTypeIcon type={s.type} className="w-3.5 h-3.5 text-slate-400" />
                            <span>{s.title || 'Untitled'}</span>
                            {s.duration_minutes > 0 && <span className="text-xs text-slate-400">({s.duration_minutes}m)</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No sections defined</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Agenda Template'}</DialogTitle>
            <DialogDescription>Define the structure and sections for your meeting agenda</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Weekly Tactical Agenda" />
              </div>
              <div>
                <Label>Meeting Type <span className="text-slate-400">(optional)</span></Label>
                <Select value={form.meeting_type || 'all'} onValueChange={v => setForm(prev => ({ ...prev, meeting_type: v === 'all' ? '' : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {meetingTypes.filter(t => t.is_active !== false).map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AgendaSectionBuilder
              sections={form.sections || []}
              onChange={sections => setForm(prev => ({ ...prev, sections }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.name}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}