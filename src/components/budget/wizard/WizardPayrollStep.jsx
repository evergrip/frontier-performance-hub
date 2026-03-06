import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Shield, Globe } from 'lucide-react';
import { REGION_PRESETS } from '../PayrollObligationsEditor';

export default function WizardPayrollStep({ config, setConfig }) {
  const applyPreset = (presetKey) => {
    const preset = REGION_PRESETS[presetKey];
    if (!preset) return;
    const customs = (config.obligations || []).filter(o => !o.is_preset);
    setConfig({
      ...config,
      region: preset.label,
      obligations: [...preset.obligations.map(o => ({ ...o })), ...customs],
    });
  };

  const updateObligation = (idx, field, value) => {
    const arr = [...(config.obligations || [])];
    arr[idx] = { ...arr[idx], [field]: value };
    setConfig({ ...config, obligations: arr });
  };

  const addCustom = () => {
    setConfig({
      ...config,
      obligations: [...(config.obligations || []), { id: `custom_${Date.now()}`, name: '', rate: 0, applies_to: 'salary', annual_cap: 0, is_preset: false }],
    });
  };

  const removeObligation = (idx) => {
    const arr = [...(config.obligations || [])];
    arr.splice(idx, 1);
    setConfig({ ...config, obligations: arr });
  };

  const totalRate = (config.obligations || []).reduce((s, o) => s + (Number(o.rate) || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-600" /> Employer Payroll Obligations
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure statutory employer payroll deductions and contributions. These will be automatically calculated for every staff member.
        </p>
      </div>

      {/* Region Preset */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label className="text-xs text-slate-500">Region / Country Preset</Label>
          <Select value="" onValueChange={applyPreset}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={config.region || 'Select a region preset...'} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REGION_PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {config.region && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pb-2">
            <Globe className="w-3.5 h-3.5" /> {config.region}
          </div>
        )}
      </div>

      {/* Obligations List */}
      {(config.obligations || []).length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-6 border border-dashed rounded-lg">
          No obligations configured yet. Select a region preset above or add custom items.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_70px_130px_80px_36px] gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">
            <span>Name</span>
            <span>Rate %</span>
            <span>Applies To</span>
            <span>Cap $/yr</span>
            <span></span>
          </div>
          {(config.obligations || []).map((o, idx) => (
            <div key={o.id || idx} className="grid grid-cols-[1fr_70px_130px_80px_36px] gap-2 items-center">
              <Input value={o.name} onChange={e => updateObligation(idx, 'name', e.target.value)} className="h-8 text-xs" placeholder="e.g. CPP" />
              <Input type="number" value={o.rate ?? ''} onChange={e => updateObligation(idx, 'rate', e.target.value)} className="h-8 text-xs" step="0.01" placeholder="0" />
              <Select value={o.applies_to || 'salary'} onValueChange={v => updateObligation(idx, 'applies_to', v)}>
                <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary only</SelectItem>
                  <SelectItem value="salary_and_commission">Salary + Commission</SelectItem>
                  <SelectItem value="total_compensation">Total Comp</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" value={o.annual_cap || ''} onChange={e => updateObligation(idx, 'annual_cap', e.target.value)} className="h-8 text-xs" placeholder="No cap" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeObligation(idx)}>
                <Trash2 className="w-3 h-3 text-slate-400" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={addCustom}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Obligation
        </Button>
        {totalRate > 0 && (
          <span className="text-sm text-slate-600 font-medium">
            Combined rate: <strong>{totalRate.toFixed(2)}%</strong>
          </span>
        )}
      </div>
    </div>
  );
}