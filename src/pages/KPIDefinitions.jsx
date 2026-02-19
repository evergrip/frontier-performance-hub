import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Play, Pause, Target, Calculator, Users, Sparkles, BookOpen, ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import KPIFormDialog from '../components/kpi/KPIFormDialog';

export default function KPIDefinitions() {
  const [showForm, setShowForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [showAICreator, setShowAICreator] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Target className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Admin Access Required</h1>
        <p className="text-slate-500 mt-2">Only administrators can manage KPI definitions.</p>
      </div>
    );
  }

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.KPI.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kpis']);
      setShowForm(false);
      setEditingKPI(null);
      toast.success('KPI created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kpis']);
      setShowForm(false);
      setEditingKPI(null);
      toast.success('KPI updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['kpis']);
      toast.success('KPI deleted');
    }
  });

  const handleSubmit = (submitData) => {
    if (editingKPI) {
      updateMutation.mutate({ id: editingKPI.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (kpi) => {
    setEditingKPI(kpi);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this KPI?')) deleteMutation.mutate(id);
  };

  const toggleActive = (kpi) => {
    updateMutation.mutate({ id: kpi.id, data: { ...kpi, is_active: !kpi.is_active } });
  };

  const handleAICreate = async () => {
    if (!aiDescription.trim()) { toast.error('Describe the KPI you want'); return; }
    setAiLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a KPI configuration expert for a construction/remodeling company.

Available entities and their fields (use entity.schema() for any of these):
- Lead: status, lead_score, estimated_precon_value, estimated_construction_value, assigned_to, source, client_id
- Sale: status, sale_type, contract_value, estimated_margin, close_date, assigned_to, client_id
- Project: status, project_type, contract_value, actual_costs, actual_margin, start_date, target_completion_date, project_manager_id
- Client: status, total_project_value, contact_name
- CommissionTransaction: user_id, amount, sale_type, transaction_type, status
- CommissionBank: user_id, total_earned, current_bank_balance, available_balance, ytd_sales_volume
- EmployeeAssignment: assignment_date, project_id, employee_assignments (array)
- EmployeeUnavailability: employee_id, start_date, end_date, reason
- ProjectOverrun: project_id, employee_id, explanation

Based on: "${aiDescription}"

Create a KPI config. For calculated type, source_entity must be one of the entity names above, metric_field and date_field must be real fields on that entity, responsible_user_field must link to a user.`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["calculated", "manual", "scorecard"] },
            category: { type: "string", enum: ["sales", "operations", "finance", "precon", "projects"] },
            measurement_unit: { type: "string", enum: ["count", "percentage", "days", "USD", "hours", "points"] },
            source_entity: { type: "string" },
            metric_field: { type: "string" },
            date_field: { type: "string" },
            aggregation_method: { type: "string", enum: ["count", "sum", "average", "min", "max"] },
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
            reporting_period_type: { type: "string", enum: ["daily", "weekly", "monthly", "quarterly", "yearly"] },
            threshold_comparison: { type: "string" },
            threshold_value: { type: "number" },
            explanation_required_on_flag: { type: "boolean" }
          }
        }
      });

      const data = response.properties || response;
      setEditingKPI({
        ...data,
        filter_conditions: data.filter_conditions || {},
        scorecard_questions: data.scorecard_questions || [],
        is_active: true,
        display_order: 0,
        assigned_user_ids: [],
        _isNew: true
      });
      setAiDescription('');
      setShowAICreator(false);
      setShowForm(true);
      toast.success('AI configured your KPI — review and save!');
    } catch (error) {
      toast.error(error.message || 'Failed to generate KPI');
    } finally {
      setAiLoading(false);
    }
  };

  const typeIcons = { calculated: Calculator, manual: BookOpen, scorecard: ClipboardCheck };
  const typeColors = { calculated: 'bg-blue-100 text-blue-800', manual: 'bg-amber-100 text-amber-800', scorecard: 'bg-purple-100 text-purple-800' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">KPI Definitions</h1>
          <p className="text-slate-600 mt-1">Define what you want to track — the system does the rest</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAICreator(true)} className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700 hover:bg-amber-100">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Creator
          </Button>
          <Button onClick={() => { setEditingKPI(null); setShowForm(true); }} className="bg-[#ea7924] hover:bg-[#d66a1f]">
            <Plus className="w-4 h-4 mr-2" />
            New KPI
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total KPIs</p>
          <p className="text-2xl font-bold text-slate-900">{kpis.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{kpis.filter(k => k.is_active).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Calculated</p>
          <p className="text-2xl font-bold text-blue-600">{kpis.filter(k => k.type === 'calculated').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Manual / Scorecard</p>
          <p className="text-2xl font-bold text-amber-600">{kpis.filter(k => k.type !== 'calculated').length}</p>
        </Card>
      </div>

      {/* KPI List */}
      <div className="grid gap-3">
        {kpis.map((kpi) => {
          const TypeIcon = typeIcons[kpi.type] || Target;
          return (
            <Card key={kpi.id} className={`transition-opacity ${!kpi.is_active ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <CardTitle className="text-base">{kpi.name}</CardTitle>
                        <Badge className={`text-[10px] px-1.5 py-0 ${typeColors[kpi.type]}`}>{kpi.type}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{kpi.category}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{kpi.reporting_period_type}</Badge>
                        {!kpi.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                      </div>
                      {kpi.description && <CardDescription className="text-xs">{kpi.description}</CardDescription>}
                      
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {kpi.target_value > 0 && <span>Target: <strong className="text-slate-700">{kpi.target_value} {kpi.measurement_unit}</strong></span>}
                        {kpi.type === 'calculated' && kpi.source_entity && (
                          <span>Source: <strong className="text-slate-700">{kpi.source_entity}.{kpi.metric_field}</strong> ({kpi.aggregation_method})</span>
                        )}
                        {kpi.type === 'scorecard' && kpi.scorecard_questions?.length > 0 && (
                          <span><strong className="text-slate-700">{kpi.scorecard_questions.length}</strong> questions</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(kpi)} title={kpi.is_active ? 'Deactivate' : 'Activate'}>
                      {kpi.is_active ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(kpi)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(kpi.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}

        {kpis.length === 0 && !isLoading && (
          <Card className="p-12 text-center">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No KPIs defined yet</p>
            <Button onClick={() => setShowForm(true)} className="bg-[#ea7924] hover:bg-[#d66a1f]">
              <Plus className="w-4 h-4 mr-2" /> Create Your First KPI
            </Button>
          </Card>
        )}
      </div>

      {/* KPI Form Dialog */}
      <KPIFormDialog
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingKPI(null); }}
        editingKPI={editingKPI?._isNew ? { ...editingKPI, id: undefined } : editingKPI}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* AI Creator */}
      <Dialog open={showAICreator} onOpenChange={setShowAICreator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              AI KPI Creator
            </DialogTitle>
            <DialogDescription>
              Describe what you want to track in plain English
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="Example: Track how many leads each salesperson converts per month, flag if below 3"
              rows={4}
            />

            <div className="bg-slate-50 border rounded-lg p-3">
              <p className="text-xs font-medium text-slate-700 mb-2">💡 The AI knows about ALL your data:</p>
              <p className="text-xs text-slate-500">
                Leads, Sales, Projects, Clients, Commissions, Employee Assignments, Unavailability, Project Overruns, and more.
                Just describe what matters to your business.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAICreator(false)} disabled={aiLoading}>Cancel</Button>
              <Button onClick={handleAICreate} disabled={aiLoading} className="bg-[#ea7924] hover:bg-[#d66a1f]">
                {aiLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate KPI</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}