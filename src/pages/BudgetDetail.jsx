import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, DollarSign, Users, Wrench, CreditCard, Car, History, Receipt } from 'lucide-react';
import { toast } from 'sonner';

import BudgetSummaryForm from '../components/budget/BudgetSummaryForm';
import BudgetPLProjection from '../components/budget/BudgetPLProjection';
import StaffDetailList from '../components/budget/StaffDetailList';
import AssetDetailList from '../components/budget/AssetDetailList';
import LiabilityDetailList from '../components/budget/LiabilityDetailList';
import VehicleDetailList from '../components/budget/VehicleDetailList';
import BudgetLineItems from '../components/budget/BudgetLineItems';
import ExpenseDetailList from '../components/budget/ExpenseDetailList';
import BudgetVersionHistory from '../components/budget/BudgetVersionHistory';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function BudgetDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const budgetId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: budget, isLoading } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => base44.entities.Budget.filter({ id: budgetId }).then(r => r[0]),
    enabled: !!budgetId,
  });

  const { data: staffItems = [] } = useQuery({
    queryKey: ['staff', budgetId],
    queryFn: () => base44.entities.StaffDetail.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });

  const { data: assetItems = [] } = useQuery({
    queryKey: ['assets', budgetId],
    queryFn: () => base44.entities.AssetDetail.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });

  const { data: liabilityItems = [] } = useQuery({
    queryKey: ['liabilities', budgetId],
    queryFn: () => base44.entities.LiabilityDetail.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });

  const { data: vehicleItems = [] } = useQuery({
    queryKey: ['vehicles', budgetId],
    queryFn: () => base44.entities.VehicleDetail.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });

  const { data: expenseItems = [] } = useQuery({
    queryKey: ['expenses', budgetId],
    queryFn: () => base44.entities.ExpenseDetail.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });

  const createVersionSnapshot = (changeSummary) => {
    const snapshot = {
      name: budget.name,
      status: budget.status,
      net_profit_target_amount: budget.net_profit_target_amount,
      net_profit_target_percentage: budget.net_profit_target_percentage,
      gross_revenue_projection: budget.gross_revenue_projection,
      cost_of_goods_sold_projection: budget.cost_of_goods_sold_projection,
      total_overhead_projection: budget.total_overhead_projection,
      line_items: budget.line_items || [],
    };
    const currentVersion = budget.current_version || 1;
    const newVersion = currentVersion + 1;
    const versionEntry = {
      version: currentVersion,
      timestamp: new Date().toISOString(),
      changed_by: currentUser?.email || 'unknown',
      changed_by_name: currentUser?.full_name || 'Unknown',
      change_summary: changeSummary || 'Budget updated',
      snapshot,
    };
    const existingHistory = budget.version_history || [];
    return { newVersion, history: [...existingHistory, versionEntry] };
  };

  const updateBudgetMutation = useMutation({
    mutationFn: (data) => {
      const { _skipVersioning, _changeSummary, ...updateData } = data;
      if (_skipVersioning) {
        return base44.entities.Budget.update(budgetId, updateData);
      }
      const { newVersion, history } = createVersionSnapshot(_changeSummary || 'Budget updated');
      return base44.entities.Budget.update(budgetId, {
        ...updateData,
        current_version: newVersion,
        version_history: history,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget updated');
    },
  });

  const handleRevert = (versionEntry) => {
    if (!versionEntry?.snapshot) return;
    const { newVersion, history } = createVersionSnapshot(`Reverted to v${versionEntry.version}`);
    const revertData = {
      ...versionEntry.snapshot,
      current_version: newVersion,
      version_history: history,
    };
    base44.entities.Budget.update(budgetId, revertData).then(() => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(`Reverted to version ${versionEntry.version}`);
    });
  };

  const totals = useMemo(() => {
    const staffBaseCost = (s) => (s.salary || 0) + (s.benefits_cost || 0) + (s.taxes_cost || 0);
    let staffOverheadCost = 0;
    let staffCogsCost = 0;
    staffItems.forEach(s => {
      const cat = s.cost_category || 'overhead';
      if (cat === 'overhead') {
        staffOverheadCost += staffBaseCost(s);
      } else if (cat === 'cogs') {
        staffCogsCost += staffBaseCost(s) + (s.commission_amount || 0);
      } else if (cat === 'split') {
        // Split: salary+benefits+taxes → overhead, commission → COGS
        staffOverheadCost += staffBaseCost(s);
        staffCogsCost += (s.commission_amount || 0);
      }
    });
    const totalStaffCost = staffOverheadCost + staffCogsCost;

    const totalAssetCost = assetItems.reduce((sum, a) => sum + (a.monthly_maintenance_cost || 0) * 12, 0);
    const totalAssetDepreciation = assetItems.reduce((sum, a) => {
      if (!a.useful_life_years || a.useful_life_years <= 0) return sum;
      return sum + ((a.purchase_cost || 0) - (a.salvage_value || 0)) / a.useful_life_years;
    }, 0);
    const totalLiabilityCost = liabilityItems.reduce((sum, l) => sum + (l.monthly_payment || 0) * 12, 0);
    const totalVehicleCost = vehicleItems.reduce((sum, v) => sum + ((v.monthly_insurance_cost || 0) + (v.monthly_fuel_cost || 0) + (v.monthly_maintenance_cost || 0)) * 12, 0);
    const totalVehicleDepreciation = vehicleItems.reduce((sum, v) => {
      if (!v.useful_life_years || v.useful_life_years <= 0) return sum;
      return sum + ((v.purchase_cost || 0) - (v.salvage_value || 0)) / v.useful_life_years;
    }, 0);

    const lineItemOverhead = (budget?.line_items || []).filter(i => i.type === 'overhead').reduce((sum, i) => sum + (i.amount || 0), 0);
    const lineItemCogs = (budget?.line_items || []).filter(i => i.type === 'cogs').reduce((sum, i) => sum + (i.amount || 0), 0);

    const annualize = (amount, period) => {
      const a = Number(amount) || 0;
      if (period === 'monthly') return a * 12;
      if (period === 'quarterly') return a * 4;
      return a;
    };
    const expenseOverhead = expenseItems.filter(e => (e.cost_type || 'overhead') === 'overhead').reduce((s, e) => s + annualize(e.amount, e.period), 0);
    const expenseCogs = expenseItems.filter(e => e.cost_type === 'cogs').reduce((s, e) => s + annualize(e.amount, e.period), 0);

    const totalOverhead = staffOverheadCost + totalAssetCost + totalAssetDepreciation + totalLiabilityCost + totalVehicleCost + totalVehicleDepreciation + lineItemOverhead + expenseOverhead;
    const totalCogs = (budget?.cost_of_goods_sold_projection || 0) + lineItemCogs + staffCogsCost + expenseCogs;
    const grossRevenue = budget?.gross_revenue_projection || 0;
    const grossProfit = grossRevenue - totalCogs;
    const netProfit = grossProfit - totalOverhead;
    const netProfitPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return { totalStaffCost, staffOverheadCost, staffCogsCost, totalAssetCost, totalAssetDepreciation, totalLiabilityCost, totalVehicleCost, totalVehicleDepreciation, lineItemOverhead, lineItemCogs, expenseOverhead, expenseCogs, totalOverhead, totalCogs, grossRevenue, grossProfit, netProfit, netProfitPct };
  }, [budget, staffItems, assetItems, liabilityItems, vehicleItems, expenseItems]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>;
  }

  if (!budget) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Budget not found.</p>
        <Link to={createPageUrl('Budgets')}><Button variant="outline" className="mt-4">Back to Budgets</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={createPageUrl('Budgets')}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{budget.name}</h1>
            <Badge className={STATUS_COLORS[budget.status]}>{budget.status}</Badge>
          </div>
          <p className="text-sm text-slate-500">FY {budget.fiscal_year}</p>
        </div>
        <div className="flex gap-2">
          {budget.status === 'draft' && (
            <Button variant="outline" onClick={() => updateBudgetMutation.mutate({ status: 'active' })}>
              Activate
            </Button>
          )}
          {budget.status === 'active' && (
            <Button variant="outline" onClick={() => updateBudgetMutation.mutate({ status: 'archived' })}>
              Archive
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="pl">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="pl"><DollarSign className="w-4 h-4 mr-1" /> P/L Projection</TabsTrigger>
          <TabsTrigger value="summary"><Save className="w-4 h-4 mr-1" /> Summary & Targets</TabsTrigger>
          <TabsTrigger value="staff"><Users className="w-4 h-4 mr-1" /> Staff ({staffItems.length})</TabsTrigger>
          <TabsTrigger value="assets"><Wrench className="w-4 h-4 mr-1" /> Assets ({assetItems.length})</TabsTrigger>
          <TabsTrigger value="liabilities"><CreditCard className="w-4 h-4 mr-1" /> Liabilities ({liabilityItems.length})</TabsTrigger>
          <TabsTrigger value="vehicles"><Car className="w-4 h-4 mr-1" /> Vehicles ({vehicleItems.length})</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt className="w-4 h-4 mr-1" /> Expenses ({expenseItems.length})</TabsTrigger>
          <TabsTrigger value="line_items">Line Items</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <BudgetPLProjection budget={budget} totals={totals} onSetRevenue={(rev) => updateBudgetMutation.mutate({ gross_revenue_projection: rev, _changeSummary: 'Set gross revenue to required amount' })} />
        </TabsContent>

        <TabsContent value="summary">
          <BudgetSummaryForm budget={budget} onSave={(data) => updateBudgetMutation.mutate({ ...data, _changeSummary: 'Summary & targets updated' })} isSaving={updateBudgetMutation.isPending} />
        </TabsContent>

        <TabsContent value="staff">
          <StaffDetailList budgetId={budgetId} items={staffItems} grossRevenue={totals.grossRevenue} />
        </TabsContent>

        <TabsContent value="assets">
          <AssetDetailList budgetId={budgetId} items={assetItems} grossRevenue={totals.grossRevenue} />
        </TabsContent>

        <TabsContent value="liabilities">
          <LiabilityDetailList budgetId={budgetId} items={liabilityItems} grossRevenue={totals.grossRevenue} />
        </TabsContent>

        <TabsContent value="vehicles">
          <VehicleDetailList budgetId={budgetId} items={vehicleItems} grossRevenue={totals.grossRevenue} />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseDetailList budgetId={budgetId} items={expenseItems} grossRevenue={totals.grossRevenue} />
        </TabsContent>

        <TabsContent value="line_items">
          <BudgetLineItems budget={budget} onSave={(data) => updateBudgetMutation.mutate({ ...data, _changeSummary: 'Line items updated' })} isSaving={updateBudgetMutation.isPending} grossRevenue={totals.grossRevenue} />
        </TabsContent>

        <TabsContent value="history">
          <BudgetVersionHistory budget={budget} onRevert={handleRevert} />
        </TabsContent>
      </Tabs>
    </div>
  );
}