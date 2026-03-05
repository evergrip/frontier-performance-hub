import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, ChevronDown, ChevronUp, GripVertical,
  Users, Building2, DollarSign, TrendingUp, UserPlus
} from 'lucide-react';

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

export default function WizardProfitSharingStep({ config, setConfig, netProfitEstimate }) {
  const [expandedTier, setExpandedTier] = useState(null);

  const retentionAmount = Number(config.company_retention_amount) || 0;
  const distributable = Math.max(0, (netProfitEstimate || 0) - retentionAmount);

  // Calculate each tier's allocation
  // Process fixed and % of net profit tiers first, then split the remaining pool
  // proportionally among all "% of remainder" tiers so 20+50+30 = 100%.
  const tiers = config.distribution_tiers || [];
  const tierAllocations = new Array(tiers.length).fill(0);
  let remaining = distributable;
  const remainderIndices = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (tier.type === 'percentage_of_remainder') {
      remainderIndices.push(i);
    } else if (tier.type === 'fixed_amount') {
      const alloc = Math.min(Number(tier.value) || 0, remaining);
      tierAllocations[i] = alloc;
      remaining = Math.max(0, remaining - alloc);
    } else if (tier.type === 'percentage_of_net_profit') {
      let alloc = (netProfitEstimate || 0) * (Number(tier.value) || 0) / 100;
      alloc = Math.min(alloc, remaining);
      tierAllocations[i] = alloc;
      remaining = Math.max(0, remaining - alloc);
    }
  }

  const totalRemainderPct = remainderIndices.reduce((s, i) => s + (Number(tiers[i].value) || 0), 0);
  if (totalRemainderPct > 0 && remaining > 0) {
    const pool = remaining;
    for (const i of remainderIndices) {
      tierAllocations[i] = pool * (Number(tiers[i].value) || 0) / totalRemainderPct;
    }
    remaining = totalRemainderPct >= 100 ? 0 : pool * (1 - totalRemainderPct / 100);
  }

  const addTier = () => {
    const newId = genId();
    setConfig(prev => ({
      ...prev,
      distribution_tiers: [
        ...(prev.distribution_tiers || []),
        { id: newId, name: '', type: 'percentage_of_remainder', value: 0, recipients: [], notes: '' }
      ],
    }));
    setExpandedTier(newId);
  };

  const updateTier = (tierId, updates) => {
    setConfig(prev => ({
      ...prev,
      distribution_tiers: (prev.distribution_tiers || []).map(t =>
        t.id === tierId ? { ...t, ...updates } : t
      ),
    }));
  };

  const removeTier = (tierId) => {
    setConfig(prev => ({
      ...prev,
      distribution_tiers: (prev.distribution_tiers || []).filter(t => t.id !== tierId),
    }));
    if (expandedTier === tierId) setExpandedTier(null);
  };

  const addRecipient = (tierId) => {
    setConfig(prev => ({
      ...prev,
      distribution_tiers: (prev.distribution_tiers || []).map(t =>
        t.id === tierId
          ? { ...t, recipients: [...(t.recipients || []), { id: genId(), name: '', weight: 1, cap_amount: null, notes: '' }] }
          : t
      ),
    }));
  };

  const updateRecipient = (tierId, recipientId, updates) => {
    setConfig(prev => ({
      ...prev,
      distribution_tiers: (prev.distribution_tiers || []).map(t =>
        t.id === tierId
          ? { ...t, recipients: (t.recipients || []).map(r => r.id === recipientId ? { ...r, ...updates } : r) }
          : t
      ),
    }));
  };

  const removeRecipient = (tierId, recipientId) => {
    setConfig(prev => ({
      ...prev,
      distribution_tiers: (prev.distribution_tiers || []).map(t =>
        t.id === tierId
          ? { ...t, recipients: (t.recipients || []).filter(r => r.id !== recipientId) }
          : t
      ),
    }));
  };

  const moveTier = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= (config.distribution_tiers || []).length) return;
    setConfig(prev => {
      const tiers = [...(prev.distribution_tiers || [])];
      [tiers[idx], tiers[newIdx]] = [tiers[newIdx], tiers[idx]];
      return { ...prev, distribution_tiers: tiers };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          Performance-Based Profit Sharing
        </h2>
        <p className="text-sm text-slate-500">
          Define how net profit gets distributed. First, set a company retention amount, then add distribution tiers in priority order.
        </p>
      </div>

      {/* Estimated Net Profit Info */}
      {netProfitEstimate > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="text-sm">
            <span className="text-blue-700">Estimated Net Profit (from wizard data): </span>
            <span className="font-bold text-blue-900">{fmt(netProfitEstimate)}</span>
          </div>
        </div>
      )}

      {/* Company Retention */}
      <div className="bg-slate-50 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">Company Retention</h3>
        </div>
        <p className="text-sm text-slate-500">
          The fixed amount the company must keep before any profit sharing kicks in.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Retention Amount ($)</Label>
            <Input
              type="number"
              value={config.company_retention_amount || ''}
              onChange={e => setConfig(prev => ({ ...prev, company_retention_amount: e.target.value }))}
              placeholder="e.g., 450000"
            />
          </div>
          {netProfitEstimate > 0 && (
            <div className="flex items-end">
              <div className="bg-white rounded-lg border p-3 w-full">
                <p className="text-xs text-slate-500">Available for Distribution</p>
                <p className={`text-lg font-bold ${distributable > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {fmt(distributable)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Tiers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            Distribution Tiers
          </h3>
          <Button variant="outline" size="sm" onClick={addTier}>
            <Plus className="w-4 h-4 mr-1" /> Add Tier
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          Tiers are processed in order. Each tier draws from whatever profit remains after the tiers above it.
        </p>

        {(!config.distribution_tiers || config.distribution_tiers.length === 0) && (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No distribution tiers yet.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={addTier}>
              <Plus className="w-4 h-4 mr-1" /> Add your first tier
            </Button>
          </div>
        )}

        {(config.distribution_tiers || []).map((tier, idx) => {
          const isExpanded = expandedTier === tier.id;
          const allocation = tierAllocations[idx] || 0;
          const totalWeight = (tier.recipients || []).reduce((s, r) => s + (Number(r.weight) || 0), 0);

          return (
            <div key={tier.id} className="border rounded-xl overflow-hidden">
              {/* Tier Header */}
              <div
                className="flex items-center gap-2 p-4 bg-white cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpandedTier(isExpanded ? null : tier.id)}
              >
                <div className="flex flex-col gap-0.5">
                  <button onClick={e => { e.stopPropagation(); moveTier(idx, -1); }} disabled={idx === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); moveTier(idx, 1); }} disabled={idx === (config.distribution_tiers || []).length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900">{tier.name || 'Untitled Tier'}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs capitalize">{TYPE_LABELS[tier.type]}</Badge>
                    <span className="text-xs text-slate-500">
                      {tier.type === 'fixed_amount' ? fmt(tier.value) : `${tier.value || 0}%`}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{(tier.recipients || []).length} recipient{(tier.recipients || []).length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-600">{fmt(allocation)}</p>
                  <p className="text-xs text-slate-400">est. payout</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={e => { e.stopPropagation(); removeTier(tier.id); }}>
                  <Trash2 className="w-4 h-4 text-slate-400" />
                </Button>
              </div>

              {/* Tier Details */}
              {isExpanded && (
                <div className="border-t bg-slate-50 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Tier Name</Label>
                      <Input
                        value={tier.name}
                        onChange={e => updateTier(tier.id, { name: e.target.value })}
                        placeholder="e.g., Ownership, Staff Pool"
                      />
                    </div>
                    <div>
                      <Label>Calculation Type</Label>
                      <Select value={tier.type} onValueChange={v => updateTier(tier.id, { type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{tier.type === 'fixed_amount' ? 'Amount ($)' : 'Percentage (%)'}</Label>
                      <Input
                        type="number"
                        value={tier.value || ''}
                        onChange={e => updateTier(tier.id, { value: e.target.value })}
                        placeholder={tier.type === 'fixed_amount' ? 'e.g., 50000' : 'e.g., 40'}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={tier.notes || ''}
                      onChange={e => updateTier(tier.id, { notes: e.target.value })}
                      placeholder="Any conditions, vesting rules, etc."
                      rows={2}
                    />
                  </div>

                  {/* Recipients */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="mb-0">Recipients</Label>
                      <Button variant="ghost" size="sm" onClick={() => addRecipient(tier.id)}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Recipient
                      </Button>
                    </div>

                    {(tier.recipients || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No recipients — the entire tier allocation is unassigned.</p>
                    )}

                    {(tier.recipients || []).map(recipient => {
                      const recipientShare = totalWeight > 0 ? (Number(recipient.weight) || 0) / totalWeight : 0;
                      const recipientAmount = allocation * recipientShare;
                      const capped = recipient.cap_amount && recipientAmount > Number(recipient.cap_amount);

                      return (
                        <div key={recipient.id} className="flex items-center gap-2 bg-white rounded-lg border p-3">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div>
                              <Input
                                value={recipient.name}
                                onChange={e => updateRecipient(tier.id, recipient.id, { name: e.target.value })}
                                placeholder="Name / Role"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={recipient.weight || ''}
                                  onChange={e => updateRecipient(tier.id, recipient.id, { weight: Number(e.target.value) || 0 })}
                                  placeholder="Weight"
                                  className="h-8 text-sm"
                                />
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                  ({totalWeight > 0 ? (recipientShare * 100).toFixed(1) : 0}%)
                                </span>
                              </div>
                            </div>
                            <div>
                              <Input
                                type="number"
                                value={recipient.cap_amount || ''}
                                onChange={e => updateRecipient(tier.id, recipient.id, { cap_amount: e.target.value ? Number(e.target.value) : null })}
                                placeholder="Cap (optional)"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${capped ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {fmt(capped ? Number(recipient.cap_amount) : recipientAmount)}
                                {capped && <span className="text-xs ml-1">(capped)</span>}
                              </span>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRecipient(tier.id, recipient.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {totalWeight > 0 && (
                      <div className="text-xs text-slate-500 text-right pt-1">
                        Total weight: {totalWeight} · Tier allocation: {fmt(allocation)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Waterfall Summary */}
      {(config.distribution_tiers || []).length > 0 && netProfitEstimate > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Distribution Waterfall</h3>
          <WaterfallRow label="Estimated Net Profit" amount={netProfitEstimate} bold />
          <WaterfallRow label="Company Retention" amount={-retentionAmount} indent />
          <div className="border-t border-slate-300 my-1" />
          <WaterfallRow label="Available for Distribution" amount={distributable} bold accent />
          {(config.distribution_tiers || []).map((tier, idx) => (
            <WaterfallRow key={tier.id} label={`${idx + 1}. ${tier.name || 'Untitled'}`} amount={-(tierAllocations[idx] || 0)} indent />
          ))}
          <div className="border-t border-slate-300 my-1" />
          <WaterfallRow label="Undistributed Remainder" amount={remaining} bold />
        </div>
      )}

      {/* General Notes */}
      <div>
        <Label>Plan Notes (optional)</Label>
        <Textarea
          value={config.notes || ''}
          onChange={e => setConfig(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="General notes about the profit sharing plan, conditions, etc."
          rows={2}
        />
      </div>
    </div>
  );
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