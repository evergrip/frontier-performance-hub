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
import { Plus, Edit, Trash2, Play, Pause, BookOpen, Target, Calculator, Users, Sparkles } from 'lucide-react';
import Tooltip from '../components/kpi/Tooltip';
import KPITutorial from '../components/kpi/KPITutorial';
import { toast } from 'sonner';

export default function KPIDefinitions() {
  const [showForm, setShowForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAICreator, setShowAICreator] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
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
      scorecard_questions: [],
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

  const handleAICreate = async () => {
    if (!aiDescription.trim()) {
      toast.error('Please describe the KPI you want to create');
      return;
    }

    setAiLoading(true);
    console.log('Starting AI KPI creation...');
    try {
      console.log('Calling InvokeLLM...');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a KPI configuration expert. Based on this description, create a complete KPI configuration.

User's KPI description: "${aiDescription}"

Analyze this and determine:
1. The best KPI type (calculated, manual, or scorecard)
2. All configuration details needed

For SCORECARD type: Create multiple questions with point values. Each question should have:
- question: the question text
- response_type: "yes_no" or "number"
- For yes_no: point_value_if_yes, point_value_if_no, max_points
- For number: expected_number_value, points_per_unit, max_points
- requires_explanation_if_wrong: true/false

For CALCULATED type: Specify source_entity, metric_field, aggregation_method, etc.

For MANUAL type: Specify the question and response_type.

Return a complete KPI configuration object.`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["calculated", "manual", "scorecard"] },
            category: { type: "string", enum: ["sales", "operations", "finance", "precon", "projects"] },
            measurement_unit: { type: "string" },
            source_entity: { type: "string" },
            metric_field: { type: "string" },
            date_field: { type: "string" },
            aggregation_method: { type: "string" },
            responsible_user_field: { type: "string" },
            filter_conditions: { type: "object" },
            question: { type: "string" },
            response_type: { type: "string" },
            scorecard_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  response_type: { type: "string" },
                  point_value_if_yes: { type: "number" },
                  point_value_if_no: { type: "number" },
                  expected_number_value: { type: "number" },
                  points_per_unit: { type: "number" },
                  max_points: { type: "number" },
                  requires_explanation_if_wrong: { type: "boolean" }
                }
              }
            },
            target_value: { type: "number" },
            reporting_period_type: { type: "string" },
            explanation: { type: "string" }
          }
        }
      });

      console.log('AI response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      
      // InvokeLLM returns the data directly when using response_json_schema
      const data = response;
      console.log('Parsed data:', JSON.stringify(data, null, 2));

      const newFormData = {
        ...getEmptyForm(),
        ...data,
        filter_conditions: data.filter_conditions || {},
        scorecard_questions: data.scorecard_questions || []
      };
      
      console.log('New form data:', JSON.stringify(newFormData, null, 2));
      
      setFormData(newFormData);
      setAiDescription('');
      setShowAICreator(false);
      setShowForm(true);
      toast.success('AI configured your KPI! Review and adjust as needed.');
    } catch (error) {
      console.error('AI KPI Creation Error:', error);
      toast.error(error.message || 'Failed to generate KPI configuration');
    } finally {
      setAiLoading(false);
    }
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
          <Button variant="outline" onClick={() => setShowAICreator(true)} className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:bg-purple-100">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Creator
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-[#ea7924] hover:bg-[#d66a1f]">
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
                      <SelectItem value="scorecard">Scorecard</SelectItem>
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
                      <SelectItem value="points">Points</SelectItem>
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
                      onValueChange={(value) => setFormData({ ...formData, source_entity: value, metric_field: '', date_field: '', responsible_user_field: '' })}
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
                      <Tooltip content="The field to measure" />
                    </div>
                    <Select
                      value={formData.metric_field}
                      onValueChange={(value) => setFormData({ ...formData, metric_field: value })}
                      disabled={!formData.source_entity}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.source_entity ? "Select field" : "Select entity first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.source_entity === 'Lead' && (
                          <>
                            <SelectItem value="status">status</SelectItem>
                            <SelectItem value="lead_score">lead_score</SelectItem>
                            <SelectItem value="estimated_precon_value">estimated_precon_value</SelectItem>
                            <SelectItem value="estimated_construction_value">estimated_construction_value</SelectItem>
                          </>
                        )}
                        {formData.source_entity === 'Sale' && (
                          <>
                            <SelectItem value="status">status</SelectItem>
                            <SelectItem value="contract_value">contract_value</SelectItem>
                            <SelectItem value="estimated_construction_budget">estimated_construction_budget</SelectItem>
                            <SelectItem value="estimated_margin">estimated_margin</SelectItem>
                          </>
                        )}
                        {formData.source_entity === 'Project' && (
                          <>
                            <SelectItem value="status">status</SelectItem>
                            <SelectItem value="contract_value">contract_value</SelectItem>
                            <SelectItem value="actual_costs">actual_costs</SelectItem>
                            <SelectItem value="actual_margin">actual_margin</SelectItem>
                          </>
                        )}
                        {formData.source_entity === 'Client' && (
                          <>
                            <SelectItem value="status">status</SelectItem>
                            <SelectItem value="total_project_value">total_project_value</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Date Field</Label>
                      <Tooltip content="Field used to filter by period" />
                    </div>
                    <Select
                      value={formData.date_field}
                      onValueChange={(value) => setFormData({ ...formData, date_field: value })}
                      disabled={!formData.source_entity}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.source_entity ? "Select field" : "Select entity first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_date">created_date</SelectItem>
                        <SelectItem value="updated_date">updated_date</SelectItem>
                        {formData.source_entity === 'Sale' && (
                          <>
                            <SelectItem value="close_date">close_date</SelectItem>
                            <SelectItem value="target_precon_completion_date">target_precon_completion_date</SelectItem>
                          </>
                        )}
                        {formData.source_entity === 'Project' && (
                          <>
                            <SelectItem value="start_date">start_date</SelectItem>
                            <SelectItem value="target_completion_date">target_completion_date</SelectItem>
                            <SelectItem value="actual_completion_date">actual_completion_date</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
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
                      <Tooltip content="Field that links to the responsible user" />
                    </div>
                    <Select
                      value={formData.responsible_user_field}
                      onValueChange={(value) => setFormData({ ...formData, responsible_user_field: value })}
                      disabled={!formData.source_entity}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.source_entity ? "Select field" : "Select entity first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.source_entity === 'Lead' && (
                          <SelectItem value="assigned_to">assigned_to</SelectItem>
                        )}
                        {formData.source_entity === 'Sale' && (
                          <SelectItem value="assigned_to">assigned_to</SelectItem>
                        )}
                        {formData.source_entity === 'Project' && (
                          <SelectItem value="project_manager_id">project_manager_id</SelectItem>
                        )}
                        {formData.source_entity === 'Client' && (
                          <SelectItem value="created_by">created_by</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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

            {/* Scorecard KPI Fields */}
            {formData.type === 'scorecard' && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-purple-900">Scorecard Questions</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        scorecard_questions: [
                          ...(formData.scorecard_questions || []),
                          {
                            question: '',
                            response_type: 'yes_no',
                            point_value_if_yes: 1,
                            point_value_if_no: 0,
                            max_points: 1,
                            requires_explanation_if_wrong: true
                          }
                        ]
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Question
                  </Button>
                </div>

                {formData.scorecard_questions?.length === 0 && (
                  <p className="text-sm text-purple-600">Add questions that staff will answer</p>
                )}

                {formData.scorecard_questions?.map((q, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Label>Question {idx + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newQuestions = [...formData.scorecard_questions];
                            newQuestions.splice(idx, 1);
                            setFormData({ ...formData, scorecard_questions: newQuestions });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      <Input
                        value={q.question}
                        onChange={(e) => {
                          const newQuestions = [...formData.scorecard_questions];
                          newQuestions[idx].question = e.target.value;
                          setFormData({ ...formData, scorecard_questions: newQuestions });
                        }}
                        placeholder="e.g., Are your uniforms free of holes?"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Response Type</Label>
                          <Select
                            value={q.response_type}
                            onValueChange={(value) => {
                              const newQuestions = [...formData.scorecard_questions];
                              newQuestions[idx].response_type = value;
                              setFormData({ ...formData, scorecard_questions: newQuestions });
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes_no">Yes/No</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {q.response_type === 'yes_no' && (
                          <>
                            <div>
                              <Label className="text-xs">Points if Yes</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={q.point_value_if_yes}
                                onChange={(e) => {
                                  const newQuestions = [...formData.scorecard_questions];
                                  newQuestions[idx].point_value_if_yes = parseFloat(e.target.value);
                                  newQuestions[idx].max_points = Math.max(parseFloat(e.target.value), q.point_value_if_no || 0);
                                  setFormData({ ...formData, scorecard_questions: newQuestions });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Points if No</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={q.point_value_if_no}
                                onChange={(e) => {
                                  const newQuestions = [...formData.scorecard_questions];
                                  newQuestions[idx].point_value_if_no = parseFloat(e.target.value);
                                  setFormData({ ...formData, scorecard_questions: newQuestions });
                                }}
                              />
                            </div>
                          </>
                        )}

                        {q.response_type === 'number' && (
                          <>
                            <div>
                              <Label className="text-xs">Expected Value</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={q.expected_number_value || 0}
                                onChange={(e) => {
                                  const newQuestions = [...formData.scorecard_questions];
                                  newQuestions[idx].expected_number_value = parseFloat(e.target.value);
                                  setFormData({ ...formData, scorecard_questions: newQuestions });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Points per Unit</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={q.points_per_unit || 1}
                                onChange={(e) => {
                                  const newQuestions = [...formData.scorecard_questions];
                                  newQuestions[idx].points_per_unit = parseFloat(e.target.value);
                                  setFormData({ ...formData, scorecard_questions: newQuestions });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Max Points</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={q.max_points || 1}
                                onChange={(e) => {
                                  const newQuestions = [...formData.scorecard_questions];
                                  newQuestions[idx].max_points = parseFloat(e.target.value);
                                  setFormData({ ...formData, scorecard_questions: newQuestions });
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={q.requires_explanation_if_wrong}
                          onCheckedChange={(checked) => {
                            const newQuestions = [...formData.scorecard_questions];
                            newQuestions[idx].requires_explanation_if_wrong = checked;
                            setFormData({ ...formData, scorecard_questions: newQuestions });
                          }}
                        />
                        <Label className="text-xs">Require explanation if wrong answer</Label>
                      </div>
                    </div>
                  </Card>
                ))}
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
              <Button type="submit" className="bg-[#ea7924] hover:bg-[#d66a1f]">
                {editingKPI ? 'Update KPI' : 'Create KPI'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Creator Dialog */}
      <Dialog open={showAICreator} onOpenChange={setShowAICreator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI KPI Creator
            </DialogTitle>
            <DialogDescription>
              Describe the KPI you want to track, and AI will configure it for you
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Describe your KPI</Label>
              <Textarea
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder="Example: Track Karen's prospecting activities - she should do 2 tradeshows, 10 calls, and 20 door knocks per month. Each activity has different point values."
                rows={4}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Tips:</strong> Be specific about:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Who this KPI is for and what department</li>
                <li>What should be measured (counts, yes/no, calculated from data)</li>
                <li>Target values or expectations</li>
                <li>How often it should be tracked</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAICreator(false)} disabled={aiLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleAICreate} 
                disabled={aiLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate KPI
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutorial */}
      {showTutorial && <KPITutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
}