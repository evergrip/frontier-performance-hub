import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, DollarSign, Users, Wrench, CreditCard, Car } from 'lucide-react';
import { toast } from 'sonner';

import BudgetSummaryForm from '@/components/budget/BudgetSummaryForm';
import BudgetPLProjection from '@/components/budget/BudgetPLProjection';
import StaffDetailList from '@/components/budget/StaffDetailList';
import AssetDetailList from '@/components/budget/AssetDetailList';
import LiabilityDetailList from '@/components/budget/LiabilityDetailList';
import VehicleDetailList from '@/components/budget/VehicleDetailList';
import BudgetLineItems from '@/components/budget/BudgetLineItems';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function BudgetDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const budgetId = urlParams.get('id');
  const queryClient = useQueryClient();

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

  const updateBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.update(budgetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget updated');
    },
  });

  const totals = useMemo(() => {
    const totalStaffCost = staffItems.reduce((sum, s) => sum + (s.salary || 0) + (s.benefits_cost || 0) + (s.taxes_cost || 0), 0);
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

    const totalOverhead = totalStaffCost + totalAssetCost + totalAssetDepreciation + totalLiabilityCost + totalVehicleCost + totalVehicleDepreciation + lineItemOverhead;
    const totalCogs = (budget?.cost_of_goods_sold_projection || 0) + lineItemCogs;
    const grossRevenue = budget?.gross_revenue_projection || 0;
    const grossProfit = grossRevenue - totalCogs;
    const netProfit = grossProfit - totalOverhead;
    const netProfitPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return { totalStaffCost, totalAssetCost, totalAssetDepreciation, totalLiabilityCost, totalVehicleCost, totalVehicleDepreciation, lineItemOverhead, totalOverhead, totalCogs, grossRevenue, grossProfit, netProfit, netProfitPct };
  }, [budget, staffItems, assetItems, liabilityItems, vehicleItems]);

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
          <TabsTrigger value="line_items">Line Items</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <BudgetPLProjection budget={budget} totals={totals} />
        </TabsContent>

        <TabsContent value="summary">
          <BudgetSummaryForm budget={budget} onSave={(data) => updateBudgetMutation.mutate(data)} isSaving={updateBudgetMutation.isPending} />
        </TabsContent>

        <TabsContent value="staff">
          <StaffDetailList budgetId={budgetId} items={staffItems} />
        </TabsContent>

        <TabsContent value="assets">
          <AssetDetailList budgetId={budgetId} items={assetItems} />
        </TabsContent>

        <TabsContent value="liabilities">
          <LiabilityDetailList budgetId={budgetId} items={liabilityItems} />
        </TabsContent>

        <TabsContent value="vehicles">
          <VehicleDetailList budgetId={budgetId} items={vehicleItems} />
        </TabsContent>

        <TabsContent value="line_items">
          <BudgetLineItems budget={budget} onSave={(data) => updateBudgetMutation.mutate(data)} isSaving={updateBudgetMutation.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}