import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import EntityFieldPicker, { ENTITY_NAMES } from './EntityFieldPicker';

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'calculated',
  category: 'sales',
  measurement_unit: 'count',
  scope: 'company',
  assigned_user_ids: [],
  source_entity: '',
  metric_field: '',
  date_field: '',
  aggregation_method: 'count',
  filter_conditions: {},
  responsible_user_field: '',
  question: '',
  response_type: 'number',
  scorecard_questions: [],
  target_value: 0,
  threshold_comparison: 'less_than',
  threshold_value: 0,
  explanation_required_on_flag: false,
  reporting_period_type: 'monthly',
  is_active: true,
  display_order: 0
};

export default function KPIFormDialog({ open, onOpenChange, editingKPI, onSubmit, isSubmitting, defaultScope, hideScope = false, hideAssignment = false }) {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [filterText, setFilterText] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  useEffect(() => {
    if (open) {
      if (editingKPI) {
        setFormData({ ...EMPTY_FORM, ...editingKPI });
        setFilterText(editingKPI.filter_conditions ? JSON.stringify(editingKPI.filter_conditions) : '');
      } else {
        setFormData({ ...EMPTY_FORM, scope: defaultScope || 'company' });
        setFilterText('');
      }
    }
  }, [open, editingKPI, defaultScope]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    
    // Clean up based on type
    if (formData.type === 'manual') {
      delete submitData.source_entity;
      delete submitData.metric_field;
      delete submitData.date_field;
      delete submitData.aggregation_method;
      delete submitData.filter_conditions;
      delete submitData.responsible_user_field;
      delete submitData.scorecard_questions;
    } else if (formData.type === 'calculated') {
      delete submitData.question;
      delete submitData.response_type;
      delete submitData.scorecard_questions;
    } else if (formData.type === 'scorecard') {
      delete submitData.source_entity;
      delete submitData.metric_field;
      delete submitData.date_field;
      delete submitData.aggregation_method;
      delete submitData.filter_conditions;
      delete submitData.responsible_user_field;
      delete submitData.question;
      delete submitData.response_type;
      submitData.measurement_unit = 'points';
    }

    onSubmit(submitData);
  };

  const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingKPI ? 'Edit KPI' : 'Create New KPI'}</DialogTitle>
          <DialogDescription>
            Define how this metric will be measured and tracked
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basics */}
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Name *</Label>
              <Input value={formData.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., New Leads per Month" required />
            </div>

            <div>
              <Label className="mb-1 block">Description</Label>
              <Textarea value={formData.description} onChange={(e) => set('description', e.target.value)} placeholder="What does this KPI measure and why?" rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Type</Label>
                <Select value={formData.type} onValueChange={(v) => set('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calculated">Calculated (auto from data)</SelectItem>
                    <SelectItem value="manual">Manual (user enters)</SelectItem>
                    <SelectItem value="scorecard">Scorecard (checklist)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Category</Label>
                <Select value={formData.category} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="precon">Pre-Construction</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Unit</Label>
                <Select value={formData.measurement_unit} onValueChange={(v) => set('measurement_unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Calculated KPI: Dynamic entity/field pickers */}
          {formData.type === 'calculated' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-semibold text-blue-900 text-sm">Data Source Configuration</h3>
              <p className="text-xs text-blue-700">Select any entity and field in the system to build your KPI</p>

              <div className="grid grid-cols-2 gap-4">
                <EntityFieldPicker
                  selectedEntity={formData.source_entity}
                  onEntityChange={(v) => { set('source_entity', v); set('metric_field', ''); set('date_field', ''); set('responsible_user_field', ''); }}
                  selectedField={formData.metric_field}
                  onFieldChange={(v) => set('metric_field', v)}
                  label="Metric Field (what to measure)"
                />

                <div className="space-y-3">
                  <EntityFieldPicker
                    selectedEntity={formData.source_entity}
                    selectedField={formData.date_field}
                    onFieldChange={(v) => set('date_field', v)}
                    label="Date Field (for period filtering)"
                    showBuiltIns={true}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block text-xs text-slate-500">Aggregation Method</Label>
                  <Select value={formData.aggregation_method} onValueChange={(v) => set('aggregation_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count records</SelectItem>
                      <SelectItem value="sum">Sum values</SelectItem>
                      <SelectItem value="average">Average values</SelectItem>
                      <SelectItem value="min">Minimum value</SelectItem>
                      <SelectItem value="max">Maximum value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <EntityFieldPicker
                  selectedEntity={formData.source_entity}
                  selectedField={formData.responsible_user_field}
                  onFieldChange={(v) => set('responsible_user_field', v)}
                  label="Responsible User Field"
                  showBuiltIns={true}
                />
              </div>

              <div>
                <Label className="mb-1 block text-xs text-slate-500">Filter Conditions (JSON, optional)</Label>
                <Input
                  value={filterText}
                  onChange={(e) => {
                    setFilterText(e.target.value);
                    try {
                      set('filter_conditions', JSON.parse(e.target.value));
                    } catch {}
                  }}
                  placeholder='e.g. {"status": "converted"}'
                  className="font-mono text-sm"
                />
                <p className="text-xs text-blue-600 mt-1">Only include records matching these conditions</p>
              </div>
            </div>
          )}

          {/* Manual KPI */}
          {formData.type === 'manual' && (
            <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-semibold text-amber-900 text-sm">Manual Entry Settings</h3>
              <div>
                <Label className="mb-1 block">Question users will answer *</Label>
                <Input value={formData.question} onChange={(e) => set('question', e.target.value)} placeholder="e.g., How many client calls did you make this week?" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Response Type</Label>
                <Select value={formData.response_type} onValueChange={(v) => set('response_type', v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes_no">Yes / No</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Scorecard */}
          {formData.type === 'scorecard' && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-purple-900 text-sm">Scorecard Questions</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  set('scorecard_questions', [...(formData.scorecard_questions || []), {
                    question: '', response_type: 'yes_no', point_value_if_yes: 1, point_value_if_no: 0, max_points: 1, requires_explanation_if_wrong: true
                  }]);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </div>

              {formData.scorecard_questions?.map((q, idx) => (
                <Card key={idx} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-purple-700 mt-2">{idx + 1}.</span>
                    <Input
                      value={q.question}
                      onChange={(e) => {
                        const qs = [...formData.scorecard_questions];
                        qs[idx].question = e.target.value;
                        set('scorecard_questions', qs);
                      }}
                      placeholder="Question text..."
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                      const qs = [...formData.scorecard_questions];
                      qs.splice(idx, 1);
                      set('scorecard_questions', qs);
                    }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pl-6">
                    <Select value={q.response_type} onValueChange={(v) => {
                      const qs = [...formData.scorecard_questions];
                      qs[idx].response_type = v;
                      set('scorecard_questions', qs);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes_no">Yes/No</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                      </SelectContent>
                    </Select>
                    {q.response_type === 'yes_no' ? (
                      <>
                        <Input type="number" className="h-8 text-xs" placeholder="Pts if Yes" value={q.point_value_if_yes} onChange={(e) => {
                          const qs = [...formData.scorecard_questions];
                          qs[idx].point_value_if_yes = parseFloat(e.target.value) || 0;
                          qs[idx].max_points = Math.max(qs[idx].point_value_if_yes, qs[idx].point_value_if_no || 0);
                          set('scorecard_questions', qs);
                        }} />
                        <Input type="number" className="h-8 text-xs" placeholder="Pts if No" value={q.point_value_if_no} onChange={(e) => {
                          const qs = [...formData.scorecard_questions];
                          qs[idx].point_value_if_no = parseFloat(e.target.value) || 0;
                          set('scorecard_questions', qs);
                        }} />
                      </>
                    ) : (
                      <>
                        <Input type="number" className="h-8 text-xs" placeholder="Pts/unit" value={q.points_per_unit || 1} onChange={(e) => {
                          const qs = [...formData.scorecard_questions];
                          qs[idx].points_per_unit = parseFloat(e.target.value) || 1;
                          set('scorecard_questions', qs);
                        }} />
                        <Input type="number" className="h-8 text-xs" placeholder="Max pts" value={q.max_points || 1} onChange={(e) => {
                          const qs = [...formData.scorecard_questions];
                          qs[idx].max_points = parseFloat(e.target.value) || 1;
                          set('scorecard_questions', qs);
                        }} />
                      </>
                    )}
                    <div className="flex items-center gap-1">
                      <Switch checked={q.requires_explanation_if_wrong} onCheckedChange={(checked) => {
                        const qs = [...formData.scorecard_questions];
                        qs[idx].requires_explanation_if_wrong = checked;
                        set('scorecard_questions', qs);
                      }} className="scale-75" />
                      <span className="text-[10px] text-slate-500">Explain?</span>
                    </div>
                  </div>
                </Card>
              ))}

              {(!formData.scorecard_questions || formData.scorecard_questions.length === 0) && (
                <p className="text-sm text-purple-600 text-center py-3">Click "Add Question" to start building your scorecard</p>
              )}
            </div>
          )}

          {/* Scope (only shown if not hidden) */}
          {!hideScope && (
            <div>
              <Label className="mb-1 block text-xs text-slate-500">KPI Scope</Label>
              <Select value={formData.scope || 'company'} onValueChange={(v) => set('scope', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal (for yourself only)</SelectItem>
                  <SelectItem value="department">Department (for your team)</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assign Users */}
          {!hideAssignment && (
          <div>
            <Label className="mb-2 block text-xs text-slate-500">Assign to Specific Users (leave empty = all users)</Label>
            <div className="flex flex-wrap gap-2">
              {users.map(user => (
                <label key={user.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-lg border cursor-pointer hover:bg-slate-100 text-xs">
                  <input
                    type="checkbox"
                    checked={(formData.assigned_user_ids || []).includes(user.id)}
                    onChange={(e) => {
                      const ids = formData.assigned_user_ids || [];
                      set('assigned_user_ids', e.target.checked ? [...ids, user.id] : ids.filter(id => id !== user.id));
                    }}
                  />
                  {user.full_name}
                </label>
              ))}
            </div>
          </div>
          )}

          {/* Targets */}
          <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <h3 className="font-semibold text-green-900 text-sm">Targets & Alerts</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Target Value</Label>
                <Input type="number" value={formData.target_value} onChange={(e) => set('target_value', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Reporting Period</Label>
                <Select value={formData.reporting_period_type} onValueChange={(v) => set('reporting_period_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Flag When Value Is</Label>
                <Select value={formData.threshold_comparison} onValueChange={(v) => set('threshold_comparison', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less_than">Less than threshold</SelectItem>
                    <SelectItem value="greater_than">Greater than threshold</SelectItem>
                    <SelectItem value="equal_to">Equal to threshold</SelectItem>
                    <SelectItem value="not_equal_to">Not equal to threshold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-500">Threshold Value</Label>
                <Input type="number" value={formData.threshold_value} onChange={(e) => set('threshold_value', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.explanation_required_on_flag} onCheckedChange={(v) => set('explanation_required_on_flag', v)} />
              <Label className="text-xs">Require explanation when flagged</Label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#ea7924] hover:bg-[#d66a1f]" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingKPI ? 'Update KPI' : 'Create KPI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}