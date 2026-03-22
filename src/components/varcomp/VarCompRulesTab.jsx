import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Archive, Play } from 'lucide-react';
import { toast } from 'sonner';
import VarCompRuleFormDialog from './VarCompRuleFormDialog';
import VarCompSimulationDialog from './VarCompSimulationDialog';

export default function VarCompRulesTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [simulatingRule, setSimulatingRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['varCompRules'],
    queryFn: () => base44.entities.VarCompRule.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VarCompRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['varCompRules'] });
      toast.success('Rule updated');
    },
  });

  const handleActivate = async (rule) => {
    // Archive all other active rules for same fiscal year
    const activeRules = rules.filter(r => r.status === 'active' && r.effective_fiscal_year === rule.effective_fiscal_year && r.id !== rule.id);
    for (const ar of activeRules) {
      await base44.entities.VarCompRule.update(ar.id, { status: 'archived' });
    }
    updateMutation.mutate({ id: rule.id, data: { status: 'active' } });
  };

  const handleArchive = (rule) => {
    updateMutation.mutate({ id: rule.id, data: { status: 'archived' } });
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-amber-100 text-amber-700',
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingRule(null); setFormOpen(true); }} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Rule Set
        </Button>
      </div>

      {rules.length === 0 && (
        <Card><CardContent className="py-12 text-center text-slate-500">No rules defined yet. Create your first variable compensation rule set.</CardContent></Card>
      )}

      {rules.map(rule => (
        <Card key={rule.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
              <p className="text-sm text-slate-500">
                FY {rule.effective_fiscal_year} • Gate: {rule.payout_gate_value}% NP
                {rule.min_net_profit_dollars ? ` • Floor: $${rule.min_net_profit_dollars.toLocaleString()}` : ''}
                {' • '}{rule.payout_schedule === 'annual' ? 'Annual payouts' : `Quarterly payouts (${(rule.payout_quarters || [1,2,3,4]).map(q => `Q${q}`).join(', ')})`}
              </p>
            </div>
            <Badge className={statusColors[rule.status]}>{rule.status}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <span className="text-slate-500">Company Retention:</span>
                <span className="font-medium ml-1">{rule.company_retention_percent}%</span>
              </div>
              <div>
                <span className="text-slate-500">Distribution:</span>
                <span className="font-medium ml-1">{rule.distribution_percent}%</span>
              </div>
              <div>
                <span className="text-slate-500">Pools:</span>
                <span className="font-medium ml-1">{rule.pools?.length || 0}</span>
              </div>
            </div>
            {rule.pools?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {rule.pools.map((p, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">{p.pool_name}: {p.allocation_percent}%</span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditingRule(rule); setFormOpen(true); }}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" onClick={() => setSimulatingRule(rule)}><Play className="w-3 h-3 mr-1" /> Simulate</Button>
              {rule.status === 'draft' && <Button variant="outline" size="sm" className="text-emerald-600" onClick={() => handleActivate(rule)}>Activate</Button>}
              {rule.status !== 'archived' && <Button variant="outline" size="sm" className="text-amber-600" onClick={() => handleArchive(rule)}><Archive className="w-3 h-3 mr-1" /> Archive</Button>}
            </div>
          </CardContent>
        </Card>
      ))}

      <VarCompRuleFormDialog open={formOpen} onOpenChange={setFormOpen} editingRule={editingRule} />
      <VarCompSimulationDialog open={!!simulatingRule} onOpenChange={(v) => !v && setSimulatingRule(null)} rule={simulatingRule} />
    </div>
  );
}