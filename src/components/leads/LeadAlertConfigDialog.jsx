import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import LeadAlertEmailPreview from './LeadAlertEmailPreview';

const ALL_FIELDS = [
  { key: 'title', label: 'Lead Title' },
  { key: 'client', label: 'Client Name' },
  { key: 'client_email', label: 'Client Email' },
  { key: 'client_phone', label: 'Client Phone' },
  { key: 'client_address', label: 'Client Address' },
  { key: 'source', label: 'Lead Source' },
  { key: 'estimated_precon_value', label: 'Est. Precon Value' },
  { key: 'estimated_construction_value', label: 'Est. Construction Value' },
  { key: 'notes', label: 'Notes' },
];

const DEFAULT_FIELDS = ['title', 'client', 'client_email', 'client_phone', 'source', 'estimated_precon_value', 'estimated_construction_value', 'notes'];

export default function LeadAlertConfigDialog({ open, onOpenChange }) {
  const [selectedFields, setSelectedFields] = useState(DEFAULT_FIELDS);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.CompanySettings.list().then(settings => {
      if (settings.length > 0) {
        setSettingsId(settings[0].id);
        setSelectedFields(settings[0].lead_alert_fields?.length > 0 ? settings[0].lead_alert_fields : DEFAULT_FIELDS);
      }
      setLoading(false);
    });
  }, [open]);

  const toggle = (key) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    if (settingsId) {
      await base44.entities.CompanySettings.update(settingsId, { lead_alert_fields: selectedFields });
    } else {
      await base44.entities.CompanySettings.create({ lead_alert_fields: selectedFields });
    }
    setSaving(false);
    toast.success('Lead alert settings saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Lead Alert Email Settings
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Choose which fields to include when a salesperson is notified about a new lead assignment.
            </p>
            <div className="space-y-2">
              {ALL_FIELDS.map(field => (
                <label
                  key={field.key}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedFields.includes(field.key)
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => toggle(field.key)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">{field.label}</span>
                </label>
              ))}
            </div>
            {selectedFields.length === 0 && (
              <p className="text-xs text-red-500">Select at least one field to include in the alert.</p>
            )}

            {/* Live Email Preview */}
            <LeadAlertEmailPreview selectedFields={selectedFields} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedFields.length === 0}
            className="bg-gradient-to-r from-amber-500 to-amber-600"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}