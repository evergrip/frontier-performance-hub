import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const defaultRule = {
  rule_name: '',
  description: '',
  status: 'draft',
  effective_fiscal_year: new Date().getFullYear(),
  payout_gate_type: 'annual_np_percent',
  payout_gate_value: 10,
  company_retention_percent: 20,
  distribution_percent: 80,
  pools: [
    { pool_name: 'Shareholders', allocation_percent: 50, eligible_roles: ['shareholders'], also_participates_in: [] },
    { pool_name: 'Leadership', allocation_percent: 25, eligible_roles: ['leadership'], also_participates_in: ['Full Staff'] },
    { pool_name: 'Full Staff', allocation_percent: 25, eligible_roles: ['all'], also_participates_in: [] },
  ],
  eligibility_rules: {
    must_be_employed_at_year_end: true,
    min_months_employed: 3,
    tenure_multiplier_enabled: true,
    tenure_multipliers: [
      { min_years: 0, max_years: 1, multiplier: 1 },
      { min_years: 1, max_years: 3, multiplier: 2 },
      { min_years: 3, max_years: 5, multiplier: 3 },
      { min_years: 5, max_years: 7, multiplier: 4 },
      { min_years: 7, max_years: null, multiplier: 5 },
    ],
  },
  tracking_interval: 'monthly',
};

export default function VarCompRuleFormDialog({ open, onOpenChange, editingRule }) {
  const [form, setForm] = useState(defaultRule);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingRule) {
      setForm({ ...defaultRule, ...editingRule });
    } else {
      setForm(defaultRule);
    }
  }, [editingRule, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VarCompRule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['varCompRules'] }); onOpenChange(false); toast.success('Rule created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VarCompRule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['varCompRules'] }); onOpenChange(false); toast.success('Rule updated'); },
  });

  const handleSave = () => {
    if (!form.rule_name) { toast.error('Rule name is required'); return; }
    if (editingRule) {
      const { id, created_date, updated_date, created_by, ...data } = form;
      updateMutation.mutate({ id: editingRule.id, data });
    } else {
      createMutation.mutate(form);
    }
  };

  const updatePool = (idx, key, value) => {
    const pools = [...form.pools];
    pools[idx] = { ...pools[idx], [key]: value };
    setForm({ ...form, pools });
  };

  const addPool = () => {
    setForm({ ...form, pools: [...form.pools, { pool_name: '', allocation_percent: 0, eligible_roles: ['all'], also_participates_in: [] }] });
  };

  const removePool = (idx) => {
    setForm({ ...form, pools: form.pools.filter((_, i) => i !== idx) });
  };

  const updateTenure = (idx, key, value) => {
    const tiers = [...(form.eligibility_rules?.tenure_multipliers || [])];
    tiers[idx] = { ...tiers[idx], [key]: value === '' ? null : Number(value) };
    setForm({ ...form, eligibility_rules: { ...form.eligibility_rules, tenure_multipliers: tiers } });
  };

  const addTenure = () => {
    const tiers = [...(form.eligibility_rules?.tenure_multipliers || [])];
    tiers.push({ min_years: 0, max_years: null, multiplier: 1 });
    setForm({ ...form, eligibility_rules: { ...form.eligibility_rules, tenure_multipliers: tiers } });
  };

  const removeTenure = (idx) => {
    const tiers = (form.eligibility_rules?.tenure_multipliers || []).filter((_, i) => i !== idx);
    setForm({ ...form, eligibility_rules: { ...form.eligibility_rules, tenure_multipliers: tiers } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRule ? 'Edit Rule Set' : 'New Rule Set'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rule Name *</Label>
              <Input value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} />
            </div>
            <div>
              <Label>Fiscal Year *</Label>
              <Input type="number" value={form.effective_fiscal_year} onChange={e => setForm({ ...form, effective_fiscal_year: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Gate & Distribution */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-4">
            <h3 className="font-semibold text-slate-900">Payout Gate & Distribution</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>NP% Gate</Label>
                <Input type="number" step="0.1" value={form.payout_gate_value} onChange={e => setForm({ ...form, payout_gate_value: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Min Net Profit $ Floor</Label>
                <Input type="number" value={form.min_net_profit_dollars || ''} onChange={e => setForm({ ...form, min_net_profit_dollars: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 500000" />
                <p className="text-xs text-slate-500 mt-1">Even if NP% gate is met, total net profit must exceed this dollar amount before sharing begins.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Retention %</Label>
                <Input type="number" step="0.1" value={form.company_retention_percent} onChange={e => setForm({ ...form, company_retention_percent: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Distribution %</Label>
                <Input type="number" step="0.1" value={form.distribution_percent} onChange={e => setForm({ ...form, distribution_percent: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          {/* Pools */}
          <div className="p-4 bg-blue-50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Distribution Pools</h3>
              <Button size="sm" variant="outline" onClick={addPool}><Plus className="w-3 h-3 mr-1" /> Add Pool</Button>
            </div>
            {form.pools?.map((pool, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <Input placeholder="Pool Name" value={pool.pool_name} onChange={e => updatePool(idx, 'pool_name', e.target.value)} className="flex-1" />
                  <Input type="number" placeholder="%" value={pool.allocation_percent} onChange={e => updatePool(idx, 'allocation_percent', Number(e.target.value))} className="w-20" />
                  <span className="text-sm text-slate-500">%</span>
                  <Button variant="ghost" size="icon" onClick={() => removePool(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Eligible Pool Tags (comma-separated, e.g. shareholders, leadership, full_staff, or "all")</Label>
                    <Input value={(pool.eligible_roles || []).join(', ')} onChange={e => updatePool(idx, 'eligible_roles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="text-xs" />
                    <p className="text-xs text-slate-400 mt-1">Users assigned to any of these pools in User Admin will be included. Use "all" to include everyone eligible.</p>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500">Pool allocations should sum to 100%. Current total: {form.pools?.reduce((s, p) => s + (p.allocation_percent || 0), 0)}%</p>
          </div>

          {/* Eligibility */}
          <div className="p-4 bg-emerald-50 rounded-lg space-y-4">
            <h3 className="font-semibold text-slate-900">Eligibility Rules</h3>
            <div className="flex items-center justify-between">
              <Label>Must be employed at year-end</Label>
              <Switch checked={form.eligibility_rules?.must_be_employed_at_year_end ?? true} onCheckedChange={v => setForm({ ...form, eligibility_rules: { ...form.eligibility_rules, must_be_employed_at_year_end: v } })} />
            </div>
            <div>
              <Label>Minimum months employed</Label>
              <Input type="number" value={form.eligibility_rules?.min_months_employed ?? 3} onChange={e => setForm({ ...form, eligibility_rules: { ...form.eligibility_rules, min_months_employed: Number(e.target.value) } })} className="w-32" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Tenure multiplier enabled</Label>
              <Switch checked={form.eligibility_rules?.tenure_multiplier_enabled ?? true} onCheckedChange={v => setForm({ ...form, eligibility_rules: { ...form.eligibility_rules, tenure_multiplier_enabled: v } })} />
            </div>
            {form.eligibility_rules?.tenure_multiplier_enabled && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Tenure Tiers</Label>
                  <Button size="sm" variant="outline" onClick={addTenure}><Plus className="w-3 h-3 mr-1" /> Add</Button>
                </div>
                {form.eligibility_rules?.tenure_multipliers?.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input type="number" value={t.min_years ?? ''} onChange={e => updateTenure(idx, 'min_years', e.target.value)} className="w-20" placeholder="Min yrs" />
                    <span className="text-xs text-slate-500">to</span>
                    <Input type="number" value={t.max_years ?? ''} onChange={e => updateTenure(idx, 'max_years', e.target.value)} className="w-20" placeholder="Max (∞)" />
                    <span className="text-xs text-slate-500">yrs =</span>
                    <Input type="number" step="0.1" value={t.multiplier} onChange={e => updateTenure(idx, 'multiplier', e.target.value)} className="w-20" placeholder="Mult" />
                    <span className="text-xs text-slate-500">x</span>
                    <Button variant="ghost" size="icon" onClick={() => removeTenure(idx)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tracking Interval */}
          <div>
            <Label>Tracking Interval</Label>
            <Select value={form.tracking_interval} onValueChange={v => setForm({ ...form, tracking_interval: v })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}