import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Play, Pause, BookOpen, Target, Calculator, Users } from 'lucide-react';
import Tooltip from '../components/kpi/Tooltip';
import KPITutorial from '../components/kpi/KPITutorial';
import { toast } from 'sonner';

export default function KPIDefinitions() {
  const [showForm, setShowForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [formData, setFormData] = useState(getEmptyForm());
  const queryClient = useQueryClient();

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.KPI.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kpis']);
      setShowForm(false);
      setFormData(getEmptyForm());
      toast.success('KPI created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kpis']);
      setShowForm(false);
      setEditingKPI(null);
      setFormData(getEmptyForm());
      toast.success('KPI updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['kpis']);
      toast.success('KPI deleted successfully');
    }
  });

  function getEmptyForm() {
    return {
      name: '',
      description: '',
      type: 'calculated',
      category: 'sales',
      measurement_unit: 'count',
      source_entity: '',
      metric_field: '',
      date_field: '',
      aggregation_method: 'count',
      filter_conditions: {},
      responsible_user_field: '',
      question: '',
      response_type: 'number',
      target_value: 0,
      threshold_comparison: 'less_than',
      threshold_value: 0,
      explanation_required_on_flag: false,
      reporting_period_type: 'monthly',
      is_active: true,
      display_order: 0
    };
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean up data based on type
    const submitData = { ...formData };
    if (formData.type === 'manual') {
      delete submitData.source_entity;
      delete submitData.metric_field;
      delete submitData.date_field;
      delete submitData.aggregation_method;
      delete submitData.filter_conditions;
      delete submitData.responsible_user_field;
    } else {
      delete submitData.question;
      delete submitData.response_type;
    }

    if (editingKPI) {
      updateMutation.mutate({ id: editingKPI.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (kpi) => {
    setEditingKPI(kpi);
    setFormData({ ...getEmptyForm(), ...kpi });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this KPI?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleActive = (kpi) => {
    updateMutation.mutate({
      id: kpi.id,
      data: { ...kpi, is_active: !kpi.is_active }
    });
  };

  const categoryIcons = {
    sales: Target,
    operations: Users,
    finance: Calculator,
    precon: BookOpen,
    projects: Users
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">KPI Definitions</h1>
          <p className="text-slate-600 mt-1">Define and manage performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTutorial(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Tutorial
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="w-4 h-4 mr-2" />
            New KPI
          </Button>
        </div>
      </div>

      {/* KPI List */}
      <div className="grid gap-4">
        {kpis.map((kpi) => {
          const CategoryIcon = categoryIcons[kpi.category] || Target;
          return (
            <Card key={kpi.id} className={!kpi.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{kpi.name}</CardTitle>
                        <Badge variant={kpi.type === 'calculated' ? 'default' : 'secondary'}>
                          {kpi.type}
                        </Badge>
                        <Badge variant="outline">{kpi.category}</Badge>
                        {!kpi.is_active && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                      <CardDescription>{kpi.description}</CardDescription>
                      
                      {/* KPI Details */}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Unit:</span>
                          <span className="ml-2 font-medium">{kpi.measurement_unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Period:</span>
                          <span className="ml-2 font-medium">{kpi.reporting_period_type}</span>
                        </div>
                        {kpi.target_value && (
                          <div>
                            <span className="text-slate-500">Target:</span>
                            <span className="ml-2 font-medium">{kpi.target_value}</span>
                          </div>
                        )}
                        {kpi.type === 'calculated' && (
                          <div>
                            <span className="text-slate-500">Source:</span>
                            <span className="ml-2 font-medium">{kpi.source_entity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(kpi)}
                      title={kpi.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {kpi.is_active ? (
                        <Pause className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Play className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(kpi)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(kpi.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* KPI Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingKPI(null);
          setFormData(getEmptyForm());
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKPI ? 'Edit KPI' : 'Create New KPI'}</DialogTitle>
            <DialogDescription>
              Define how this performance metric will be measured and tracked
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label>KPI Name *</Label>
                  <Tooltip content="A clear, descriptive name for this metric" />
                </div>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., New Leads per Month"
                  required
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label>Description</Label>
                  <Tooltip content="Explain what this KPI measures and why it matters" />
                </div>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this KPI..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Type *</Label>
                    <Tooltip content="Calculated = automatic from data, Manual = user input required" />
                  </div>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calculated">Calculated</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="precon">Precon</SelectItem>
                      <SelectItem value="projects">Projects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Unit *</Label>
                  <Select
                    value={formData.measurement_unit}
                    onValueChange={(value) => setFormData({ ...formData, measurement_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Calculated KPI Fields */}
            {formData.type === 'calculated' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900">Calculation Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Source Entity *</Label>
                      <Tooltip content="Which entity contains the data to measure" />
                    </div>
                    <Select
                      value={formData.source_entity}
                      onValueChange={(value) => setFormData({ ...formData, source_entity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Sale">Sale</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Metric Field *</Label>
                      <Tooltip content="The field to measure (e.g., status, contract_value)" />
                    </div>
                    <Input
                      value={formData.metric_field}
                      onChange={(e) => setFormData({ ...formData, metric_field: e.target.value })}
                      placeholder="e.g., status"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Date Field</Label>
                      <Tooltip content="Field used to filter by period (e.g., created_date)" />
                    </div>
                    <Input
                      value={formData.date_field}
                      onChange={(e) => setFormData({ ...formData, date_field: e.target.value })}
                      placeholder="e.g., created_date"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Aggregation *</Label>
                      <Tooltip content="How to calculate: count records, sum values, etc." />
                    </div>
                    <Select
                      value={formData.aggregation_method}
                      onValueChange={(value) => setFormData({ ...formData, aggregation_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Responsible User Field *</Label>
                      <Tooltip content="Field that links to the responsible user (e.g., assigned_to)" />
                    </div>
                    <Input
                      value={formData.responsible_user_field}
                      onChange={(e) => setFormData({ ...formData, responsible_user_field: e.target.value })}
                      placeholder="e.g., assigned_to"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Filter Conditions (JSON)</Label>
                      <Tooltip content='Optional filters as JSON, e.g., {"status": "converted"}' />
                    </div>
                    <Input
                      value={JSON.stringify(formData.filter_conditions)}
                      onChange={(e) => {
                        try {
                          setFormData({ ...formData, filter_conditions: JSON.parse(e.target.value) });
                        } catch {}
                      }}
                      placeholder='{"status": "converted"}'
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Manual KPI Fields */}
            {formData.type === 'manual' && (
              <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-amber-900">Manual Entry Settings</h3>
                
                <div>
                  <Label className="mb-2 block">Question *</Label>
                  <Input
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="What question should users answer?"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Response Type *</Label>
                  <Select
                    value={formData.response_type}
                    onValueChange={(value) => setFormData({ ...formData, response_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes_no">Yes/No</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Targets & Thresholds */}
            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900">Targets & Thresholds</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Target Value</Label>
                    <Tooltip content="The goal you want to achieve" />
                  </div>
                  <Input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Reporting Period</Label>
                    <Tooltip content="How often this KPI is measured" />
                  </div>
                  <Select
                    value={formData.reporting_period_type}
                    onValueChange={(value) => setFormData({ ...formData, reporting_period_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Threshold Comparison</Label>
                    <Tooltip content="When to flag this KPI" />
                  </div>
                  <Select
                    value={formData.threshold_comparison}
                    onValueChange={(value) => setFormData({ ...formData, threshold_comparison: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less_than">Less than</SelectItem>
                      <SelectItem value="greater_than">Greater than</SelectItem>
                      <SelectItem value="equal_to">Equal to</SelectItem>
                      <SelectItem value="not_equal_to">Not equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Threshold Value</Label>
                    <Tooltip content="Value that triggers a flag" />
                  </div>
                  <Input
                    type="number"
                    value={formData.threshold_value}
                    onChange={(e) => setFormData({ ...formData, threshold_value: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.explanation_required_on_flag}
                  onCheckedChange={(checked) => setFormData({ ...formData, explanation_required_on_flag: checked })}
                />
                <Label>Require explanation when flagged</Label>
                <Tooltip content="Users must provide an explanation if threshold is crossed" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingKPI(null);
                  setFormData(getEmptyForm());
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
                {editingKPI ? 'Update KPI' : 'Create KPI'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tutorial */}
      {showTutorial && <KPITutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
}