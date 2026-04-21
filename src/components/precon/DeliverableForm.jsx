import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import CONFIGS from './deliverableFormConfigs';
import DeliverableFieldRenderer from './DeliverableFieldRenderer';
import DeliverableAttachments from './DeliverableAttachments';
import ExportDeliverablePDF from './ExportDeliverablePDF';
import { evaluateFormula, resolveAutoFrom } from './calcEngine';

export default function DeliverableForm({ stage, progress, leadId, allProgress, stages, leadData, clientData, saleData }) {
  const queryClient = useQueryClient();
  const config = CONFIGS[stage.stage_order];
  const [formData, setFormData] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoPopulated = useRef(false);

  // Build stageOrderMap: stage_id -> stage_order
  const stageOrderMap = {};
  (stages || []).forEach(s => { stageOrderMap[s.id] = s.stage_order; });

  // Initialize form data from progress
  useEffect(() => {
    setFormData(progress?.form_data || {});
    setAttachments(progress?.attachments || []);
    setDirty(false);
    autoPopulated.current = false;
  }, [progress?.id, stage.id]);

  // Auto-populate empty fields from references
  useEffect(() => {
    if (!config || autoPopulated.current) return;
    autoPopulated.current = true;
    const existing = progress?.form_data || {};
    const updates = {};
    const ctx = { leadData, clientData, saleData, allProgress, stageOrderMap };
    for (const field of config.fields) {
      if (field.auto_from && !existing[field.key] && existing[field.key] !== 0) {
        const resolved = resolveAutoFrom(field.auto_from, ctx);
        if (resolved !== undefined && resolved !== null && resolved !== '') {
          updates[field.key] = resolved;
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
      setDirty(true);
    }
  }, [config, leadData, clientData, saleData, allProgress]);

  const handleChange = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  // Compute calculated fields
  const calculatedValues = {};
  if (config) {
    for (const field of config.fields) {
      if (field.type === 'calculated' && field.formula) {
        calculatedValues[field.key] = evaluateFormula(field.formula, formData);
      }
    }
  }

  // Validation check
  const getValidationErrors = () => {
    if (!config) return [];
    const errors = [];
    for (const field of config.fields) {
      if (field.required && field.type !== 'calculated') {
        const val = formData[field.key];
        if (val === undefined || val === null || val === '' || val === false) {
          errors.push(field.label);
        }
      }
    }
    return errors;
  };

  const validationErrors = getValidationErrors();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (progress?.id) {
        return base44.entities.PreconProgress.update(progress.id, data);
      } else {
        return base44.entities.PreconProgress.create({ lead_id: leadId, stage_id: stage.id, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['precon-progress', leadId]);
      setDirty(false);
      setSaving(false);
      toast.success('Form saved');
    },
    onError: () => setSaving(false),
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate({ form_data: formData, attachments });
  };

  const handleAttachmentsSave = (newAttachments) => {
    setAttachments(newAttachments);
    // Save immediately for attachments
    saveMutation.mutate({ form_data: formData, attachments: newAttachments });
  };

  if (!config) {
    return (
      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500 italic">
        No structured form configured for this deliverable. Use the notes and URL fields above.
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{config.title}</h4>
        <div className="flex items-center gap-2">
          <ExportDeliverablePDF
            stageName={stage.stage_name}
            config={config}
            formData={formData}
            calculatedValues={calculatedValues}
          />
          <Button
            type="button" size="sm" className="text-xs"
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            <Save className="w-3 h-3 mr-1" />
            {saving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      {/* Validation summary */}
      {validationErrors.length > 0 ? (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <div>Required: {validationErrors.join(', ')}</div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="w-3 h-3" /> All required fields complete
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-3">
        {config.fields.map(field => (
          <DeliverableFieldRenderer
            key={field.key}
            field={field}
            value={formData[field.key]}
            calculatedValue={calculatedValues[field.key]}
            onChange={handleChange}
            disabled={progress?.status === 'complete'}
          />
        ))}
      </div>

      {/* Attachments */}
      <div className="border-t border-slate-100 pt-3">
        <DeliverableAttachments
          attachments={attachments}
          onSave={handleAttachmentsSave}
        />
      </div>

      {/* Save again at bottom */}
      {dirty && (
        <div className="flex justify-end pt-1">
          <Button type="button" size="sm" className="text-xs" disabled={saving} onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" /> {saving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      )}
    </div>
  );
}