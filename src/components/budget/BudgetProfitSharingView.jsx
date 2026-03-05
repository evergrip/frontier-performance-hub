import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronUp, TrendingUp, Building2, Users, DollarSign, UserPlus, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_OPTIONS = [
  { value: 'percentage_of_remainder', label: '% of Remaining Profit' },
  { value: 'fixed_amount', label: 'Fixed Dollar Amount' },
  { value: 'percentage_of_net_profit', label: '% of Total Net Profit' },
];

const TYPE_LABELS = {
  percentage_of_remainder: '% of remainder',
  fixed_amount: 'fixed',
  percentage_of_net_profit: '% of net profit',
};

const genId = () => Math.random().toString(36).slice(2, 9);
const fmt = (v) => `$${Number(v || 0).toLocaleString()}`;

function computeTierAllocations(tiers, distributable, netProfit) {
  // First pass: handle fixed_amount and percentage_of_net_profit tiers, 
  // collect percentage_of_remainder tiers to split the remaining pool proportionally.
  const allocations = new Array(tiers.length).fill(0);
  let remaining = distributable;
  const remainderTierIndices = [];

  // Process non-remainder tiers first in order
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (tier.type === 'percentage_of_remainder') {
      remainderTierIndices.push(i);
    } else if (tier.type === 'fixed_amount') {
      const alloc = Math.min(Number(tier.value) || 0, remaining);
      allocations[i] = alloc;
      remaining = Math.max(0, remaining - alloc);
    } else if (tier.type === 'percentage_of_net_profit') {
      let alloc = (netProfit || 0) * (Number(tier.value) || 0) / 100;
      alloc = Math.min(alloc, remaining);
      allocations[i] = alloc;
      remaining = Math.max(0, remaining - alloc);
    }
  }

  // Now distribute the remaining pool proportionally among all percentage_of_remainder tiers
  const totalRemainderPct = remainderTierIndices.reduce((s, i) => s + (Number(tiers[i].value) || 0), 0);
  if (totalRemainderPct > 0 && remaining > 0) {
    for (const i of remainderTierIndices) {
      const pct = Number(tiers[i].value) || 0;
      allocations[i] = remaining * pct / totalRemainderPct;
    }
  }

  return allocations;
}

function WaterfallRow({ label, amount, bold, indent, accent }) {
  const isNeg = amount < 0;
  return (
    <div className={`flex items-center justify-between text-sm ${indent ? 'pl-4' : ''}`}>
      <span className={`${bold ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : 'font-medium'} ${accent ? 'text-emerald-700' : isNeg ? 'text-red-600' : 'text-slate-900'}`}>
        {isNeg ? `(${fmt(Math.abs(amount))})` : fmt(amount)}
      </span>
    </div>
  );
}

export default function BudgetProfitSharingView({ budgetId, netProfit }) {
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['profitSharing', budgetId],
    queryFn: () => base44.entities.ProfitSharingPlan.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });

  const plan = plans[0] || null;
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState(null);
  const [expandedTier, setExpandedTier] = useState(null);

  const startEdit = () => {
    setConfig(plan ? {
      company_retention_amount: plan.company_retention_amount || '',
      distribution_tiers: plan.distribution_tiers || [],
      notes: plan.notes || '',
    } : {
      company_retention_amount: '',
      distribution_tiers: [],
      notes: '',
    });
    setEditing(true);
  };

  const saveMut = useMutation({
    mutationFn: async (data) => {
      if (plan) {
        return base44.entities.ProfitSharingPlan.update(plan.id, data);
      } else {
        return base44.entities.ProfitSharingPlan.create({ ...data, budget_id: budgetId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profitSharing', budgetId] });
      setEditing(false);
      toast.success('Profit sharing plan saved');
    },
  });

  const handleSave = () => {
    saveMut.mutate({
      company_retention_amount: Number(config.company_retention_amount) || 0,
      distribution_tiers: (config.distribution_tiers || []).map(t => ({
        ...t,
        value: Number(t.value) || 0,
        recipients: (t.recipients || []).map(r => ({
          ...r,
          weight: Number(r.weight) || 0,
          cap_amount: r.cap_amount ? Number(r.cap_amount) : null,
        })),
      })),
      notes: config.notes || '',
    });
  };

  // Calculations
  const retentionAmount = plan ? (plan.company_retention_amount || 0) : 0;
  const distributable = Math.max(0, (netProfit || 0) - retentionAmount);
  const tiers = plan?.distribution_tiers || [];

  const tierAllocations = computeTierAllocations(tiers, distributable, netProfit);

  if (isLoading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" /></div>;

  // Edit mode - reuse wizard-style UI
  if (editing && config) {
    const editRetention = Number(config.company_retention_amount) || 0;
    const editDistributable = Math.max(0, (netProfit || 0) - editRetention);
    const editAllocations = computeTierAllocations(config.distribution_tiers || [], editDistributable, netProfit);

    const addTier = () => {
      const newId = genId();
      setConfig(prev => ({ ...prev, distribution_tiers: [...(prev.distribution_tiers || []), { id: newId, name: '', type: 'percentage_of_remainder', value: 0, recipients: [], notes: '' }] }));
      setExpandedTier(newId);
    };

    const updateTier = (tierId, updates) => setConfig(prev => ({ ...prev, distribution_tiers: (prev.distribution_tiers || []).map(t => t.id === tierId ? { ...t, ...updates } : t) }));
    const removeTier = (tierId) => { setConfig(prev => ({ ...prev, distribution_tiers: (prev.distribution_tiers || []).filter(t => t.id !== tierId) })); if (expandedTier === tierId) setExpandedTier(null); };
    const addRecipient = (tierId) => setConfig(prev => ({ ...prev, distribution_tiers: (prev.distribution_tiers || []).map(t => t.id === tierId ? { ...t, recipients: [...(t.recipients || []), { id: genId(), name: '', weight: 1, cap_amount: null, notes: '' }] } : t) }));
    const updateRecipient = (tierId, rid, updates) => setConfig(prev => ({ ...prev, distribution_tiers: (prev.distribution_tiers || []).map(t => t.id === tierId ? { ...t, recipients: (t.recipients || []).map(r => r.id === rid ? { ...r, ...updates } : r) } : t) }));
    const removeRecipient = (tierId, rid) => setConfig(prev => ({ ...prev, distribution_tiers: (prev.distribution_tiers || []).map(t => t.id === tierId ? { ...t, recipients: (t.recipients || []).filter(r => r.id !== rid) } : t) }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-500" /> Profit Sharing Plan</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-1" /> Save</Button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-slate-600" /><h3 className="font-semibold text-slate-800">Company Retention</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Retention Amount ($)</Label><Input type="number" value={config.company_retention_amount || ''} onChange={e => setConfig(prev => ({ ...prev, company_retention_amount: e.target.value }))} /></div>
            <div className="flex items-end"><div className="bg-white rounded-lg border p-3 w-full"><p className="text-xs text-slate-500">Available for Distribution</p><p className={`text-lg font-bold ${editDistributable > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{fmt(editDistributable)}</p></div></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-slate-600" /> Distribution Tiers</h3>
            <Button variant="outline" size="sm" onClick={addTier}><Plus className="w-4 h-4 mr-1" /> Add Tier</Button>
          </div>

          {(config.distribution_tiers || []).map((tier, idx) => {
            const isExp = expandedTier === tier.id;
            const alloc = editAllocations[idx] || 0;
            const totalWeight = (tier.recipients || []).reduce((s, r) => s + (Number(r.weight) || 0), 0);

            return (
              <div key={tier.id} className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 p-4 bg-white cursor-pointer hover:bg-slate-50" onClick={() => setExpandedTier(isExp ? null : tier.id)}>
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900">{tier.name || 'Untitled Tier'}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[tier.type]}</Badge>
                      <span className="text-xs text-slate-500">{tier.type === 'fixed_amount' ? fmt(tier.value) : `${tier.value || 0}%`}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{fmt(alloc)}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); removeTier(tier.id); }}><Trash2 className="w-4 h-4 text-slate-400" /></Button>
                </div>
                {isExp && (
                  <div className="border-t bg-slate-50 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div><Label>Tier Name</Label><Input value={tier.name} onChange={e => updateTier(tier.id, { name: e.target.value })} /></div>
                      <div><Label>Calculation Type</Label><Select value={tier.type} onValueChange={v => updateTier(tier.id, { type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>{tier.type === 'fixed_amount' ? 'Amount ($)' : 'Percentage (%)'}</Label><Input type="number" value={tier.value || ''} onChange={e => updateTier(tier.id, { value: e.target.value })} /></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><Label className="mb-0">Recipients</Label><Button variant="ghost" size="sm" onClick={() => addRecipient(tier.id)}><UserPlus className="w-3.5 h-3.5 mr-1" /> Add</Button></div>
                      {(tier.recipients || []).map(r => {
                        const share = totalWeight > 0 ? (Number(r.weight) || 0) / totalWeight : 0;
                        const amt = alloc * share;
                        return (
                          <div key={r.id} className="flex items-center gap-2 bg-white rounded-lg border p-3">
                            <div className="flex-1 grid grid-cols-4 gap-2">
                              <Input value={r.name} onChange={e => updateRecipient(tier.id, r.id, { name: e.target.value })} placeholder="Name" className="h-8 text-sm" />
                              <div className="flex items-center gap-1"><Input type="number" value={r.weight || ''} onChange={e => updateRecipient(tier.id, r.id, { weight: Number(e.target.value) || 0 })} className="h-8 text-sm" /><span className="text-xs text-slate-400">({(share * 100).toFixed(1)}%)</span></div>
                              <Input type="number" value={r.cap_amount || ''} onChange={e => updateRecipient(tier.id, r.id, { cap_amount: e.target.value ? Number(e.target.value) : null })} placeholder="Cap" className="h-8 text-sm" />
                              <div className="flex items-center justify-between"><span className="text-sm font-medium text-emerald-600">{fmt(amt)}</span><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRecipient(tier.id, r.id)}><Trash2 className="w-3.5 h-3.5 text-slate-400" /></Button></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Distribution Waterfall */}
        {(config.distribution_tiers || []).length > 0 && netProfit > 0 && (() => {
          const totalAllocated = editAllocations.reduce((s, a) => s + a, 0);
          const editTiers = config.distribution_tiers || [];
          const totalRemPct = editTiers.filter(t => t.type === 'percentage_of_remainder').reduce((s, t) => s + (Number(t.value) || 0), 0);
          const unallocated = editDistributable - totalAllocated;
          return (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Distribution Waterfall</h3>
              <WaterfallRow label="Net Profit" amount={netProfit} bold />
              <WaterfallRow label="Company Retention" amount={-editRetention} indent />
              <div className="border-t border-slate-300 my-1" />
              <WaterfallRow label="Available for Distribution" amount={editDistributable} bold accent />
              {editTiers.map((tier, idx) => (
                <WaterfallRow key={tier.id} label={`${idx + 1}. ${tier.name || 'Untitled'}`} amount={-(editAllocations[idx] || 0)} indent />
              ))}
              <div className="border-t border-slate-300 my-1" />
              <WaterfallRow label="Undistributed Remainder" amount={unallocated < 0.01 ? 0 : unallocated} bold />
            </div>
          );
        })()}

        <div><Label>Plan Notes</Label><Textarea value={config.notes || ''} onChange={e => setConfig(prev => ({ ...prev, notes: e.target.value }))} rows={2} /></div>
      </div>
    );
  }

  // Read-only view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-500" /> Profit Sharing Plan</h2>
        <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
      </div>

      {!plan ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No profit sharing plan configured yet.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={startEdit}><Plus className="w-4 h-4 mr-1" /> Set Up Plan</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-50"><CardContent className="p-4"><p className="text-xs text-slate-500">Net Profit</p><p className="text-lg font-bold text-slate-900">{fmt(netProfit)}</p></CardContent></Card>
            <Card className="bg-amber-50"><CardContent className="p-4"><p className="text-xs text-slate-500">Company Retention</p><p className="text-lg font-bold text-amber-700">{fmt(retentionAmount)}</p></CardContent></Card>
            <Card className="bg-emerald-50"><CardContent className="p-4"><p className="text-xs text-slate-500">Distributable</p><p className="text-lg font-bold text-emerald-700">{fmt(distributable)}</p></CardContent></Card>
          </div>

          {tiers.length > 0 && (
            <div className="space-y-2">
              {tiers.map((tier, idx) => {
                const alloc = tierAllocations[idx] || 0;
                return (
                  <div key={tier.id || idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                        <div>
                          <span className="font-medium text-slate-900">{tier.name || 'Untitled'}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">{TYPE_LABELS[tier.type]}</Badge>
                            <span className="text-xs text-slate-500">{tier.type === 'fixed_amount' ? fmt(tier.value) : `${tier.value || 0}%`}</span>
                            <span className="text-xs text-slate-400">• {(tier.recipients || []).length} recipient{(tier.recipients || []).length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{fmt(alloc)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {plan.notes && <p className="text-sm text-slate-500 italic">{plan.notes}</p>}
        </>
      )}
    </div>
  );
}