import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Pencil, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getChecks } from './FileAuditChecklist';

/**
 * Renders the audit checklist with inline fix buttons for failing items.
 * After a fix is saved, it re-runs checks to update the UI.
 */
export default function AuditItemFixer({ sale, lead, client, users, commissionTransactions, mode, onDataUpdated }) {
  const [fixingItem, setFixingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Local editable state for quick fixes
  const [fixValues, setFixValues] = useState({});

  const checks = getChecks({ sale, lead, client, users, commissionTransactions, mode });
  const failCount = checks.filter(c => !c.pass).length;
  const allPass = failCount === 0;

  // Determine which checks can be fixed inline
  const getFixConfig = (check) => {
    switch (check.label) {
      case 'Client contact name':
        return client ? { entity: 'Client', id: client.id, field: 'contact_name', type: 'text', placeholder: 'Enter contact name' } : null;
      case 'Client email or phone':
        return client ? { entity: 'Client', id: client.id, fields: [
          { key: 'email', type: 'email', placeholder: 'Email address' },
          { key: 'phone', type: 'tel', placeholder: 'Phone number' },
        ]} : null;
      case 'Lead source recorded':
        return lead ? { entity: 'Lead', id: lead.id, field: 'source', type: 'select', options: [
          { value: 'referral', label: 'Referral' },
          { value: 'website', label: 'Website' },
          { value: 'cold_call', label: 'Cold Call' },
          { value: 'networking', label: 'Networking' },
          { value: 'advertisement', label: 'Advertisement' },
          { value: 'other', label: 'Other' },
        ]} : null;
      case 'Sale assigned to someone':
        return sale ? { entity: 'Sale', id: sale.id, field: 'assigned_to', type: 'user_select' } : null;
      case 'Sale contract value set':
        return sale ? { entity: 'Sale', id: sale.id, field: 'contract_value', type: 'number', placeholder: 'Contract value' } : null;
      case 'Sale contributors defined':
        return sale ? { entity: 'Sale', id: sale.id, field: 'sale_contributors', type: 'contributor_add' } : null;
      default:
        return null;
    }
  };

  const handleSave = async (check) => {
    const config = getFixConfig(check);
    if (!config) return;

    setSaving(true);

    const entityMap = {
      Client: base44.entities.Client,
      Lead: base44.entities.Lead,
      Sale: base44.entities.Sale,
    };

    const entityApi = entityMap[config.entity];

    if (config.fields) {
      // Multi-field fix (e.g. email or phone)
      const updateData = {};
      config.fields.forEach(f => {
        if (fixValues[f.key]) updateData[f.key] = fixValues[f.key];
      });
      if (Object.keys(updateData).length === 0) {
        toast.error('Please fill in at least one field');
        setSaving(false);
        return;
      }
      await entityApi.update(config.id, updateData);
    } else if (config.type === 'contributor_add') {
      // Add a contributor
      const userId = fixValues.contributor_user_id;
      const split = parseFloat(fixValues.contributor_split) || 100;
      if (!userId) {
        toast.error('Please select a team member');
        setSaving(false);
        return;
      }
      const existing = sale.sale_contributors || [];
      await entityApi.update(config.id, {
        sale_contributors: [...existing, { user_id: userId, role: 'salesperson', commission_split: split }]
      });
    } else if (config.type === 'number') {
      const val = parseFloat(fixValues[config.field]);
      if (!val || val <= 0) {
        toast.error('Please enter a valid number');
        setSaving(false);
        return;
      }
      await entityApi.update(config.id, { [config.field]: val });
    } else {
      const val = fixValues[config.field];
      if (!val) {
        toast.error('Please enter a value');
        setSaving(false);
        return;
      }
      await entityApi.update(config.id, { [config.field]: val });
    }

    setSaving(false);
    setFixingItem(null);
    setFixValues({});
    toast.success('Updated successfully');
    onDataUpdated?.();
  };

  const renderFixUI = (check) => {
    const config = getFixConfig(check);
    if (!config) return null;

    if (config.fields) {
      return (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
          <p className="text-xs font-medium text-slate-600">Fix: provide at least one</p>
          {config.fields.map(f => (
            <div key={f.key}>
              <Label className="text-xs capitalize">{f.key}</Label>
              <Input
                type={f.type}
                value={fixValues[f.key] || ''}
                onChange={(e) => setFixValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="h-8 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFixingItem(null); setFixValues({}); }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={() => handleSave(check)}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </div>
        </div>
      );
    }

    if (config.type === 'select') {
      return (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
          <Select value={fixValues[config.field] || ''} onValueChange={(v) => setFixValues(prev => ({ ...prev, [config.field]: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {config.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFixingItem(null); setFixValues({}); }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={() => handleSave(check)}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </div>
        </div>
      );
    }

    if (config.type === 'user_select') {
      return (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
          <Select value={fixValues[config.field] || ''} onValueChange={(v) => setFixValues(prev => ({ ...prev, [config.field]: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select team member..." /></SelectTrigger>
            <SelectContent>
              {(users || []).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFixingItem(null); setFixValues({}); }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={() => handleSave(check)}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </div>
        </div>
      );
    }

    if (config.type === 'contributor_add') {
      const selectedUser = (users || []).find(u => u.id === fixValues.contributor_user_id);
      return (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
          <p className="text-xs font-medium text-slate-600">Add a sale contributor</p>
          <select
            className="flex h-8 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={fixValues.contributor_user_id || ''}
            onChange={(e) => setFixValues(prev => ({ ...prev, contributor_user_id: e.target.value }))}
          >
            <option value="">Select team member...</option>
            {(users || []).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          {selectedUser && <p className="text-xs text-emerald-600">Selected: {selectedUser.full_name}</p>}
          <div>
            <Label className="text-xs">Commission Split %</Label>
            <Input
              type="number"
              value={fixValues.contributor_split || '100'}
              onChange={(e) => setFixValues(prev => ({ ...prev, contributor_split: e.target.value }))}
              className="h-8 text-sm"
              min="0" max="100"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFixingItem(null); setFixValues({}); }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" disabled={saving || !fixValues.contributor_user_id} onClick={() => handleSave(check)}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </div>
        </div>
      );
    }

    // Default: text/number/email input
    return (
      <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
        <Input
          type={config.type}
          value={fixValues[config.field] || ''}
          onChange={(e) => setFixValues(prev => ({ ...prev, [config.field]: e.target.value }))}
          placeholder={config.placeholder}
          className="h-8 text-sm"
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFixingItem(null); setFixValues({}); }}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={() => handleSave(check)}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${allPass ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        {allPass ? (
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${allPass ? 'text-emerald-800' : 'text-amber-800'}`}>
            {allPass ? 'File Audit Passed' : `${failCount} item${failCount > 1 ? 's' : ''} need attention`}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {allPass ? 'All required data is complete.' : 'Resolve these before closing to ensure reporting accuracy.'}
          </p>
        </div>
        <Button
          variant="ghost" size="sm" className="h-7 w-7 p-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {checks.map((check, idx) => {
            const fixConfig = getFixConfig(check);
            const canFix = !check.pass && fixConfig;
            const isFixing = fixingItem === check.label;

            return (
              <div key={idx}>
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  {check.pass ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  )}
                  <span className={`font-medium ${check.pass ? 'text-slate-700' : 'text-red-700'}`}>{check.label}</span>
                  <span className="text-slate-400 ml-auto truncate max-w-[140px]">{check.detail}</span>
                  {canFix && !isFixing && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 ml-1 shrink-0"
                      onClick={() => { setFixingItem(check.label); setFixValues({}); }}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Fix
                    </Button>
                  )}
                </div>
                {isFixing && renderFixUI(check)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { getChecks };