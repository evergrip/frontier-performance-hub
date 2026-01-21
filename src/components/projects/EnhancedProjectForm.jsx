import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedProjectForm({ open, onOpenChange, onSuccess, initialProject = null }) {
  const [formData, setFormData] = useState({
    title: '',
    project_type: 'construction',
    contract_value: '',
    actual_costs: '',
    start_date: '',
    target_completion_date: '',
    status: 'planning',
    notes: ''
  });
  const [nlpInput, setNlpInput] = useState('');
  const [isProcessingNLP, setIsProcessingNLP] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialProject) {
      setFormData({
        title: initialProject.title || '',
        project_type: initialProject.project_type || 'construction',
        contract_value: initialProject.contract_value || '',
        actual_costs: initialProject.actual_costs || '',
        start_date: initialProject.start_date || '',
        target_completion_date: initialProject.target_completion_date || '',
        status: initialProject.status || 'planning',
        notes: initialProject.notes || ''
      });
    }
  }, [initialProject]);

  const handleNLPProcess = async () => {
    if (!nlpInput.trim()) return;

    setIsProcessingNLP(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract project information from this description:

"${nlpInput}"

Extract:
- title: Project name
- project_type: "preconstruction" or "construction"
- contract_value: total contract value (number)
- start_date: start date (YYYY-MM-DD)
- target_completion_date: completion date (YYYY-MM-DD)
- notes: additional details`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            project_type: { type: "string", enum: ["preconstruction", "construction"] },
            contract_value: { type: "number" },
            start_date: { type: "string" },
            target_completion_date: { type: "string" },
            notes: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        ...response,
        contract_value: response.contract_value || '',
        actual_costs: prev.actual_costs
      }));
      
      toast.success('Project details extracted');
      setNlpInput('');
    } catch (error) {
      toast.error('Failed to process description');
    } finally {
      setIsProcessingNLP(false);
    }
  };

  const analyzeRisk = async () => {
    if (!formData.contract_value) {
      toast.error('Enter contract value first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke('aiRecommender', {
        context_type: 'project_risk',
        entity_data: {
          ...formData,
          contract_value: parseFloat(formData.contract_value),
          actual_costs: parseFloat(formData.actual_costs) || 0
        }
      });

      setRiskAnalysis(response.data.recommendations[0]);
      toast.success('Risk analysis complete');
    } catch (error) {
      toast.error('Failed to analyze risk');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateMargin = () => {
    const contract = parseFloat(formData.contract_value) || 0;
    const costs = parseFloat(formData.actual_costs) || 0;
    if (contract === 0) return 0;
    return (((contract - costs) / contract) * 100).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSaving(true);
    try {
      const user = await base44.auth.me();
      const projectData = {
        ...formData,
        contract_value: parseFloat(formData.contract_value) || 0,
        actual_costs: parseFloat(formData.actual_costs) || 0,
        actual_margin: parseFloat(calculateMargin()),
        project_manager_id: user.id,
        client_id: 'temp-client-id', // Would come from client selector
        sale_id: 'temp-sale-id' // Would come from sale selector
      };

      if (initialProject) {
        await base44.entities.Project.update(initialProject.id, projectData);
        toast.success('Project updated');
      } else {
        await base44.entities.Project.create(projectData);
        toast.success('Project created');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const margin = calculateMargin();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialProject ? 'Edit Project' : 'Create New Project'}
            <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI-Enhanced
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* NLP Input */}
        <div className="space-y-2 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <Label className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Quick Entry (Natural Language)
          </Label>
          <Textarea
            placeholder="e.g., 'Residential construction project, $2M contract, starting next month, 8 month timeline'"
            value={nlpInput}
            onChange={(e) => setNlpInput(e.target.value)}
            rows={2}
          />
          <Button 
            onClick={handleNLPProcess} 
            disabled={isProcessingNLP}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isProcessingNLP ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Auto-Fill from Description
          </Button>
        </div>

        {/* Risk Analysis */}
        {riskAnalysis && (
          <div className={`p-4 rounded-lg border ${
            riskAnalysis.risk_level === 'high' ? 'bg-red-50 border-red-200' :
            riskAnalysis.risk_level === 'medium' ? 'bg-amber-50 border-amber-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Level: {riskAnalysis.risk_level?.toUpperCase()}
            </div>
            {riskAnalysis.identified_risks?.length > 0 && (
              <div className="text-sm space-y-1">
                {riskAnalysis.identified_risks.map((risk, i) => (
                  <p key={i}>• {risk}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Margin Indicator */}
        {formData.contract_value && formData.actual_costs && (
          <div className={`p-3 rounded-lg flex items-center justify-between ${
            margin < 0 ? 'bg-red-50 border border-red-200' :
            margin < 15 ? 'bg-amber-50 border border-amber-200' :
            'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">Current Margin:</span>
            </div>
            <span className="text-lg font-bold">{margin}%</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Project name"
                required
              />
            </div>

            <div>
              <Label>Project Type</Label>
              <Select 
                value={formData.project_type} 
                onValueChange={(value) => setFormData({...formData, project_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preconstruction">Preconstruction</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="permitting">Permitting</SelectItem>
                  <SelectItem value="execution">Execution</SelectItem>
                  <SelectItem value="completion">Completion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Contract Value *</Label>
              <Input
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                placeholder="2000000"
                required
              />
            </div>

            <div>
              <Label>Actual Costs</Label>
              <Input
                type="number"
                value={formData.actual_costs}
                onChange={(e) => setFormData({...formData, actual_costs: e.target.value})}
                placeholder="1500000"
              />
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>

            <div>
              <Label>Target Completion</Label>
              <Input
                type="date"
                value={formData.target_completion_date}
                onChange={(e) => setFormData({...formData, target_completion_date: e.target.value})}
              />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Project details..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={analyzeRisk}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Analyze Risk
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialProject ? 'Update' : 'Create'} Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}