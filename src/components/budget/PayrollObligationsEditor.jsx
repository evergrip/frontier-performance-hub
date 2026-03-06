import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Shield, Globe, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const REGION_PRESETS = {
  'canada_on': {
    label: 'Canada — Ontario',
    obligations: [
      { id: 'cpp', name: 'CPP (Canada Pension Plan)', rate: 5.95, applies_to: 'salary', annual_cap: 3867, is_preset: true },
      { id: 'ei', name: 'EI (Employment Insurance)', rate: 2.32, applies_to: 'salary', annual_cap: 1370, is_preset: true },
      { id: 'wsib', name: 'WSIB (Workplace Safety)', rate: 1.5, applies_to: 'salary', annual_cap: 0, is_preset: true },
      { id: 'eht', name: 'EHT (Employer Health Tax)', rate: 1.95, applies_to: 'salary', annual_cap: 0, is_preset: true },
    ],
  },
  'canada_bc': {
    label: 'Canada — British Columbia',
    obligations: [
      { id: 'cpp', name: 'CPP (Canada Pension Plan)', rate: 5.95, applies_to: 'salary', annual_cap: 3867, is_preset: true },
      { id: 'ei', name: 'EI (Employment Insurance)', rate: 2.32, applies_to: 'salary', annual_cap: 1370, is_preset: true },
      { id: 'worksafe', name: 'WorkSafeBC', rate: 1.55, applies_to: 'salary', annual_cap: 0, is_preset: true },
      { id: 'eht_bc', name: 'Employer Health Tax (BC)', rate: 1.95, applies_to: 'salary', annual_cap: 0, is_preset: true },
    ],
  },
  'canada_ab': {
    label: 'Canada — Alberta',
    obligations: [
      { id: 'cpp', name: 'CPP (Canada Pension Plan)', rate: 5.95, applies_to: 'salary', annual_cap: 3867, is_preset: true },
      { id: 'ei', name: 'EI (Employment Insurance)', rate: 2.32, applies_to: 'salary', annual_cap: 1370, is_preset: true },
      { id: 'wcb', name: 'WCB (Workers Compensation)', rate: 1.32, applies_to: 'salary', annual_cap: 0, is_preset: true },
    ],
  },
  'canada_ns': {
    label: 'Canada — Nova Scotia',
    obligations: [
      { id: 'cpp', name: 'CPP (Canada Pension Plan)', rate: 5.95, applies_to: 'salary', annual_cap: 3867, is_preset: true },
      { id: 'ei', name: 'EI (Employment Insurance)', rate: 2.32, applies_to: 'salary', annual_cap: 1370, is_preset: true },
      { id: 'wcb_ns', name: 'WCB (Workers Comp - NS)', rate: 2.65, applies_to: 'salary', annual_cap: 0, is_preset: true },
    ],
  },
  'usa_general': {
    label: 'USA — General',
    obligations: [
      { id: 'ss', name: 'Social Security (OASDI)', rate: 6.2, applies_to: 'salary', annual_cap: 10453, is_preset: true },
      { id: 'medicare', name: 'Medicare', rate: 1.45, applies_to: 'total_compensation', annual_cap: 0, is_preset: true },
      { id: 'futa', name: 'FUTA (Federal Unemployment)', rate: 0.6, applies_to: 'salary', annual_cap: 42, is_preset: true },
      { id: 'suta', name: 'SUTA (State Unemployment)', rate: 2.7, applies_to: 'salary', annual_cap: 0, is_preset: true },
    ],
  },
};

const APPLIES_TO_LABELS = {
  salary: 'Salary only',
  salary_and_commission: 'Salary + Commission',
  total_compensation: 'Total Compensation',
};

export default function PayrollObligationsEditor({ budgetId }) {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ['payrollObligations', budgetId],
    queryFn: () => base44.entities.PayrollObligations.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });

  const plan = plans[0] || null;
  const [form, setForm] = useState({ region: '', obligations: [], notes: '' });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (plan) {
      setForm({
        region: plan.region || '',
        obligations: (plan.obligations || []).map(o => ({ ...o })),
        notes: plan.notes || '',
      });
      setDirty(false);
    }
  }, [plan]);

  const saveMut = useMutation({
    mutationFn: async (data) => {
      if (plan) {
        return base44.entities.PayrollObligations.update(plan.id, data);
      }
      return base44.entities.PayrollObligations.create({ ...data, budget_id: budgetId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payrollObligations', budgetId] });
      qc.invalidateQueries({ queryKey: ['staff', budgetId] });
      setDirty(false);
      toast.success('Payroll obligations saved');
    },
  });

  const applyPreset = (presetKey) => {
    const preset = REGION_PRESETS[presetKey];
    if (!preset) return;
    // Keep any custom (non-preset) obligations the user already added
    const customs = form.obligations.filter(o => !o.is_preset);
    setForm({
      ...form,
      region: preset.label,
      obligations: [...preset.obligations.map(o => ({ ...o })), ...customs],
    });
    setDirty(true);
  };

  const updateObligation = (idx, field, value) => {
    const arr = [...form.obligations];
    arr[idx] = { ...arr[idx], [field]: value };
    setForm({ ...form, obligations: arr });
    setDirty(true);
  };

  const addCustom = () => {
    setForm({
      ...form,
      obligations: [...form.obligations, { id: `custom_${Date.now()}`, name: '', rate: 0, applies_to: 'salary', annual_cap: 0, is_preset: false }],
    });
    setDirty(true);
  };

  const removeObligation = (idx) => {
    const arr = [...form.obligations];
    arr.splice(idx, 1);
    setForm({ ...form, obligations: arr });
    setDirty(true);
  };

  const totalRate = form.obligations.reduce((s, o) => s + (Number(o.rate) || 0), 0);

  const handleSave = () => {
    saveMut.mutate({
      region: form.region,
      obligations: form.obligations.filter(o => o.name && Number(o.rate) >= 0),
      notes: form.notes,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Employer Payroll Obligations</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Statutory deductions & contributions applied to all staff.
            {totalRate > 0 && <span className="font-medium text-slate-700 ml-1">Combined rate: {totalRate.toFixed(2)}%</span>}
          </p>
        </div>
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={saveMut.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Region Preset Selector */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-slate-500">Region / Country Preset</Label>
            <Select value="" onValueChange={applyPreset}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={form.region || 'Select a region preset...'} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REGION_PRESETS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.region && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pb-2">
              <Globe className="w-3.5 h-3.5" /> {form.region}
            </div>
          )}
        </div>

        {/* Obligations Table */}
        {form.obligations.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-6">No obligations configured. Select a region preset or add custom items.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_140px_90px_40px] gap-2 text-[11px] text-slate-500 font-semibold uppercase tracking-wider px-1">
              <span>Obligation Name</span>
              <span>Rate %</span>
              <span>Applies To</span>
              <span>Annual Cap</span>
              <span></span>
            </div>
            {form.obligations.map((o, idx) => (
              <div key={o.id || idx} className="grid grid-cols-[1fr_80px_140px_90px_40px] gap-2 items-center">
                <Input
                  value={o.name}
                  onChange={e => updateObligation(idx, 'name', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="e.g. CPP"
                />
                <Input
                  type="number"
                  value={o.rate ?? ''}
                  onChange={e => updateObligation(idx, 'rate', e.target.value)}
                  className="h-8 text-sm"
                  step="0.01"
                  placeholder="0"
                />
                <Select value={o.applies_to || 'salary'} onValueChange={v => updateObligation(idx, 'applies_to', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salary only</SelectItem>
                    <SelectItem value="salary_and_commission">Salary + Commission</SelectItem>
                    <SelectItem value="total_compensation">Total Comp</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={o.annual_cap || ''}
                  onChange={e => updateObligation(idx, 'annual_cap', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="No cap"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeObligation(idx)}>
                  <Trash2 className="w-3 h-3 text-slate-400" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" size="sm" onClick={addCustom}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Obligation
          </Button>
          {form.obligations.length > 0 && (
            <span className="text-sm text-slate-600 font-medium">
              Total combined rate: <strong>{totalRate.toFixed(2)}%</strong>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { REGION_PRESETS };