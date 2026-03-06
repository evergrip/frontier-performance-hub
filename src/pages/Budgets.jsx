import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Copy, Trash2, DollarSign, TrendingUp, FileText, Sparkles, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';

const WIZARD_DRAFT_KEY = 'budget_wizard_draft';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function Budgets() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [duplicateFrom, setDuplicateFrom] = useState(null);
  const [wizardDraft, setWizardDraft] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check for in-progress wizard draft
  useState(() => {
    try {
      const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
      if (raw) setWizardDraft(JSON.parse(raw));
    } catch {}
  });

  const discardDraft = () => {
    localStorage.removeItem(WIZARD_DRAFT_KEY);
    setWizardDraft(null);
    toast.info('Draft discarded');
  };

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Budget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget deleted');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ sourceBudget, newFiscalYear }) => {
      const newBudget = await base44.entities.Budget.create({
        name: `${newFiscalYear} Annual Budget (Copy)`,
        fiscal_year: newFiscalYear,
        status: 'draft',
        description: sourceBudget.description,
        net_profit_target_amount: sourceBudget.net_profit_target_amount,
        net_profit_target_percentage: sourceBudget.net_profit_target_percentage,
        gross_revenue_projection: sourceBudget.gross_revenue_projection,
        cost_of_goods_sold_projection: sourceBudget.cost_of_goods_sold_projection,
        total_overhead_projection: sourceBudget.total_overhead_projection,
        line_items: sourceBudget.line_items || [],
      });

      // Duplicate linked detail entities
      const [staffList, assetList, liabilityList, vehicleList] = await Promise.all([
        base44.entities.StaffDetail.filter({ budget_id: sourceBudget.id }),
        base44.entities.AssetDetail.filter({ budget_id: sourceBudget.id }),
        base44.entities.LiabilityDetail.filter({ budget_id: sourceBudget.id }),
        base44.entities.VehicleDetail.filter({ budget_id: sourceBudget.id }),
      ]);

      const copyItems = (items, entity) => {
        if (!items.length) return Promise.resolve();
        return entity.bulkCreate(items.map(item => {
          const { id, created_date, updated_date, created_by, ...rest } = item;
          return { ...rest, budget_id: newBudget.id };
        }));
      };

      await Promise.all([
        copyItems(staffList, base44.entities.StaffDetail),
        copyItems(assetList, base44.entities.AssetDetail),
        copyItems(liabilityList, base44.entities.LiabilityDetail),
        copyItems(vehicleList, base44.entities.VehicleDetail),
      ]);

      return newBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDuplicateFrom(null);
      toast.success('Budget duplicated successfully');
    },
  });

  const filtered = budgets.filter(b => {
    const matchesSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budgets</h1>
          <p className="text-sm text-slate-500 mt-1">Annual P/L projection budgets</p>
        </div>
        <Button onClick={() => {
          if (wizardDraft) {
            localStorage.removeItem(WIZARD_DRAFT_KEY);
          }
          navigate(createPageUrl('BudgetWizard'));
        }} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Budget
        </Button>
      </div>

      {wizardDraft && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">
                    {wizardDraft.form?.name || 'Untitled Budget'} — Wizard In Progress
                  </h3>
                  <p className="text-xs text-slate-500">
                    FY {wizardDraft.form?.fiscal_year || '—'} · Step {(wizardDraft.currentStep || 0) + 1}
                    {wizardDraft.form?.departments?.length > 0 && ` · ${wizardDraft.form.departments.length} dept(s)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600" onClick={discardDraft}>
                  <X className="w-4 h-4 mr-1" /> Discard
                </Button>
                <Button size="sm" onClick={() => navigate(createPageUrl('BudgetWizard'))} className="bg-amber-500 hover:bg-amber-600 text-white">
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search budgets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No budgets found</h3>
          <p className="text-slate-500 text-sm mb-4">Create your first annual budget to get started.</p>
          <Button onClick={() => navigate(createPageUrl('BudgetWizard'))} variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Create Budget
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(budget => (
            <Link key={budget.id} to={createPageUrl(`BudgetDetail?id=${budget.id}`)}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">{budget.name}</h3>
                        <Badge className={STATUS_COLORS[budget.status]}>{budget.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">FY {budget.fiscal_year}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-slate-400">Revenue</p>
                        <p className="font-semibold text-slate-900">{fmt(budget.gross_revenue_projection)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400">Net Profit Target</p>
                        <p className="font-semibold text-emerald-600">{fmt(budget.net_profit_target_amount)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.preventDefault(); setDuplicateFrom(budget); }}>
                          <Copy className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.preventDefault(); if (confirm('Delete this budget?')) deleteMutation.mutate(budget.id); }}>
                          <Trash2 className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicateFrom} onOpenChange={() => setDuplicateFrom(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Duplicate Budget</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500 mb-4">Create a copy of <strong>{duplicateFrom?.name}</strong> for a new fiscal year. All staff, assets, liabilities, vehicles, and line items will be copied.</p>
          <div>
            <Label>New Fiscal Year</Label>
            <Input type="number" defaultValue={(duplicateFrom?.fiscal_year || new Date().getFullYear()) + 1} id="dup-year" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateFrom(null)}>Cancel</Button>
            <Button onClick={() => {
              const year = parseInt(document.getElementById('dup-year').value);
              duplicateMutation.mutate({ sourceBudget: duplicateFrom, newFiscalYear: year });
            }} disabled={duplicateMutation.isPending}>
              {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}