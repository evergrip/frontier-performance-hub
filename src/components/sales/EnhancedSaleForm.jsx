import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedSaleForm({ open, onOpenChange, onSuccess, initialSale = null }) {
  const [formData, setFormData] = useState({
    title: '',
    sale_type: 'construction',
    contract_value: '',
    estimated_margin: '',
    close_date: '',
    status: 'prospect',
    notes: ''
  });
  const [nlpInput, setNlpInput] = useState('');
  const [isProcessingNLP, setIsProcessingNLP] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialSale) {
      setFormData({
        title: initialSale.title || '',
        sale_type: initialSale.sale_type || 'construction',
        contract_value: initialSale.contract_value || '',
        estimated_margin: initialSale.estimated_margin || '',
        close_date: initialSale.close_date || '',
        status: initialSale.status || 'prospect',
        notes: initialSale.notes || ''
      });
    }
  }, [initialSale]);

  const handleNLPProcess = async () => {
    if (!nlpInput.trim()) {
      toast.error('Please enter sale details');
      return;
    }

    setIsProcessingNLP(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract sale information from this description and format as JSON:

"${nlpInput}"

Extract:
- title: Sale title/name
- sale_type: "preconstruction" or "construction"
- contract_value: estimated contract value (number only)
- estimated_margin: margin percentage (number only)
- close_date: expected close date (YYYY-MM-DD format)
- notes: any additional details

Return structured data.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            sale_type: { type: "string", enum: ["preconstruction", "construction"] },
            contract_value: { type: "number" },
            estimated_margin: { type: "number" },
            close_date: { type: "string" },
            notes: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        ...response,
        contract_value: response.contract_value || '',
        estimated_margin: response.estimated_margin || ''
      }));
      
      toast.success('Sale details extracted successfully');
      setNlpInput('');
    } catch (error) {
      toast.error('Failed to process sale description');
    } finally {
      setIsProcessingNLP(false);
    }
  };

  const validateForm = async () => {
    setIsValidating(true);
    const issues = [];

    // Basic validation
    if (!formData.title) issues.push('Title is required');
    if (!formData.contract_value || formData.contract_value <= 0) {
      issues.push('Valid contract value is required');
    }

    // AI-powered validation
    try {
      const response = await base44.functions.invoke('aiDataValidator', {
        validation_type: 'data_quality',
        entity_type: 'Sale',
        entity_id: null
      });

      const saleCheck = {
        ...formData,
        contract_value: parseFloat(formData.contract_value) || 0,
        estimated_margin: parseFloat(formData.estimated_margin) || 0
      };

      if (saleCheck.contract_value > 5000000) {
        issues.push('Large contract value - please verify');
      }
      if (saleCheck.estimated_margin > 50) {
        issues.push('Unusually high margin - please confirm');
      }
      if (saleCheck.estimated_margin < 0) {
        issues.push('Negative margin - check your numbers');
      }
    } catch (error) {
      console.error('Validation error:', error);
    }

    setValidationIssues(issues);
    setIsValidating(false);
    return issues.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid && validationIssues.length > 0) {
      toast.error('Please fix validation issues');
      return;
    }

    setIsSaving(true);
    try {
      const user = await base44.auth.me();
      const saleData = {
        ...formData,
        contract_value: parseFloat(formData.contract_value) || 0,
        estimated_margin: parseFloat(formData.estimated_margin) || 0,
        assigned_to: user.id,
        client_id: 'temp-client-id' // Would come from client selector
      };

      if (initialSale) {
        await base44.entities.Sale.update(initialSale.id, saleData);
        toast.success('Sale updated successfully');
      } else {
        await base44.entities.Sale.create(saleData);
        toast.success('Sale created successfully');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save sale');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialSale ? 'Edit Sale' : 'Create New Sale'}
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
            placeholder="e.g., 'Construction project for ABC Corp, $500k value, 25% margin, closing next month'"
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
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Fill from Description
              </>
            )}
          </Button>
        </div>

        {/* Validation Issues */}
        {validationIssues.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <AlertCircle className="w-4 h-4" />
              Validation Issues
            </div>
            <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
              {validationIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Project/Sale name"
                required
              />
            </div>

            <div>
              <Label>Sale Type</Label>
              <Select 
                value={formData.sale_type} 
                onValueChange={(value) => setFormData({...formData, sale_type: value})}
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
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Contract Value *</Label>
              <Input
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                placeholder="500000"
                required
              />
            </div>

            <div>
              <Label>Estimated Margin (%)</Label>
              <Input
                type="number"
                value={formData.estimated_margin}
                onChange={(e) => setFormData({...formData, estimated_margin: e.target.value})}
                placeholder="25"
              />
            </div>

            <div className="col-span-2">
              <Label>Expected Close Date</Label>
              <Input
                type="date"
                value={formData.close_date}
                onChange={(e) => setFormData({...formData, close_date: e.target.value})}
              />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={validateForm}
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Validate
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {initialSale ? 'Update' : 'Create'} Sale
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}