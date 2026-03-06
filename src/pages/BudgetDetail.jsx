import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, DollarSign, Building2, Globe, TrendingUp, History, Receipt, Shield } from 'lucide-react';
import { toast } from 'sonner';

import BudgetSummaryForm from '../components/budget/BudgetSummaryForm';
import BudgetPLProjection from '../components/budget/BudgetPLProjection';
import BudgetDepartmentView from '../components/budget/BudgetDepartmentView';
import BudgetCompanyWideView from '../components/budget/BudgetCompanyWideView';
import BudgetProfitSharingView from '../components/budget/BudgetProfitSharingView';
import BudgetLineItems from '../components/budget/BudgetLineItems';
import BudgetVersionHistory from '../components/budget/BudgetVersionHistory';
import PayrollObligationsEditor from '../components/budget/PayrollObligationsEditor';

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

  const { data: profitSharingPlans = [] } = useQuery({
    queryKey: ['profitSharing', budgetId],
    queryFn: () => base44.entities.ProfitSharingPlan.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });
  const profitSharingPlan = profitSharingPlans[0] || null;

  const { data: payrollObligationsPlans = [] } = useQuery({
    queryKey: ['payrollObligations', budgetId],
    queryFn: () => base44.entities.PayrollObligations.filter({ budget_id: budgetId }),
    enabled: !!budgetId,
  });
  const payrollObligations = payrollObligationsPlans[0] || null;

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
    const staffBenefitsTotal = (s) => {
      const benefits = s.benefits || [];
      if (benefits.length > 0) return benefits.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      return (s.benefits_cost || 0) + (s.hsa_cost || 0) + (s.rrsp_match_cost || 0);
    };
    const staffBaseCost = (s) => (s.salary || 0) + staffBenefitsTotal(s) + (s.taxes_cost || 0);
    let staffOverheadCost = 0;
    let staffCogsCost = 0;
    staffItems.forEach(s => {
      const cat = s.cost_category || 'overhead';
      if (cat === 'overhead') {
        staffOverheadCost += staffBaseCost(s);
      } else if (cat === 'cogs') {
        staffCogsCost += staffBaseCost(s) + (s.commission_amount || 0);
      } else if (cat === 'split') {
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

    const grossRevenue = budget?.gross_revenue_projection || 0;

    const annualize = (amount, period) => {
      const a = Number(amount) || 0;
      if (period === 'monthly') return a * 12;
      if (period === 'quarterly') return a * 4;
      return a;
    };
    const getExpenseAnnual = (e) => {
      if (e.amount_mode === 'percent_of_revenue') return (Number(e.percent_of_revenue) || 0) / 100 * grossRevenue;
      return annualize(e.amount, e.period);
    };
    const expenseOverhead = expenseItems.filter(e => (e.cost_type || 'overhead') === 'overhead').reduce((s, e) => s + getExpenseAnnual(e), 0);
    const expenseCogs = expenseItems.filter(e => e.cost_type === 'cogs').reduce((s, e) => s + getExpenseAnnual(e), 0);

    const totalOverhead = staffOverheadCost + totalAssetCost + totalAssetDepreciation + totalLiabilityCost + totalVehicleCost + totalVehicleDepreciation + lineItemOverhead + expenseOverhead;
    const totalCogs = (budget?.cost_of_goods_sold_projection || 0) + lineItemCogs + staffCogsCost + expenseCogs;
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

  const departments = budget.departments || [];

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
          <TabsTrigger value="basics"><Save className="w-4 h-4 mr-1" /> Basics</TabsTrigger>
          {departments.map(dept => (
            <TabsTrigger key={dept} value={`dept_${dept}`}>
              <Building2 className="w-4 h-4 mr-1" /> {dept}
            </TabsTrigger>
          ))}
          <TabsTrigger value="company_wide"><Globe className="w-4 h-4 mr-1" /> Company-Wide</TabsTrigger>
          <TabsTrigger value="payroll"><Shield className="w-4 h-4 mr-1" /> Payroll Obligations</TabsTrigger>
          <TabsTrigger value="profit_sharing"><TrendingUp className="w-4 h-4 mr-1" /> Profit Sharing</TabsTrigger>
          <TabsTrigger value="line_items"><Receipt className="w-4 h-4 mr-1" /> Line Items</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <BudgetPLProjection budget={budget} totals={totals} profitSharingPlan={profitSharingPlan} onSetRevenue={(rev) => updateBudgetMutation.mutate({ gross_revenue_projection: rev, _changeSummary: 'Set gross revenue to required amount' })} />
        </TabsContent>

        <TabsContent value="basics">
          <BudgetSummaryForm budget={budget} onSave={(data) => updateBudgetMutation.mutate({ ...data, _changeSummary: 'Summary & targets updated' })} isSaving={updateBudgetMutation.isPending} />
        </TabsContent>

        {departments.map(dept => (
          <TabsContent key={dept} value={`dept_${dept}`}>
            <BudgetDepartmentView
              budgetId={budgetId}
              department={dept}
              staffItems={staffItems}
              expenseItems={expenseItems}
              assetItems={assetItems}
              liabilityItems={liabilityItems}
              vehicleItems={vehicleItems}
              grossRevenue={totals.grossRevenue}
              payrollObligations={payrollObligations}
            />
          </TabsContent>
        ))}

        <TabsContent value="company_wide">
          <BudgetCompanyWideView
            budgetId={budgetId}
            departments={departments}
            staffItems={staffItems}
            expenseItems={expenseItems}
            assetItems={assetItems}
            liabilityItems={liabilityItems}
            vehicleItems={vehicleItems}
            grossRevenue={totals.grossRevenue}
            payrollObligations={payrollObligations}
          />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollObligationsEditor budgetId={budgetId} />
        </TabsContent>

        <TabsContent value="profit_sharing">
          <BudgetProfitSharingView budgetId={budgetId} netProfit={totals.netProfit} />
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