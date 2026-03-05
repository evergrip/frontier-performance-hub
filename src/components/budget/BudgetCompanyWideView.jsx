import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Receipt, Wrench, CreditCard, Car } from 'lucide-react';
import StaffDetailList from './StaffDetailList';
import ExpenseDetailList from './ExpenseDetailList';
import AssetDetailList from './AssetDetailList';
import LiabilityDetailList from './LiabilityDetailList';
import VehicleDetailList from './VehicleDetailList';

const CATEGORIES = [
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'assets', label: 'Assets', icon: Wrench },
  { key: 'liabilities', label: 'Liabilities', icon: CreditCard },
  { key: 'vehicles', label: 'Vehicles', icon: Car },
];

export default function BudgetCompanyWideView({ budgetId, departments, staffItems, expenseItems, assetItems, liabilityItems, vehicleItems, grossRevenue }) {
  const [activeTab, setActiveTab] = useState('staff');

  // Company-wide = items with no department or department not in the budget's department list
  const isCompanyWide = (item) => !item.department || !(departments || []).includes(item.department);

  const cwStaff = useMemo(() => staffItems.filter(isCompanyWide), [staffItems, departments]);
  const cwExpenses = useMemo(() => expenseItems.filter(isCompanyWide), [expenseItems, departments]);
  const cwAssets = useMemo(() => assetItems.filter(isCompanyWide), [assetItems, departments]);
  const cwLiabilities = useMemo(() => liabilityItems.filter(isCompanyWide), [liabilityItems, departments]);
  const cwVehicles = useMemo(() => vehicleItems.filter(isCompanyWide), [vehicleItems, departments]);

  const counts = {
    staff: cwStaff.length,
    expenses: cwExpenses.length,
    assets: cwAssets.length,
    liabilities: cwLiabilities.length,
    vehicles: cwVehicles.length,
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Shared staff, expenses, assets, liabilities, and vehicles not tied to a specific department.</p>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="text-xs gap-1 relative">
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              {counts[key] > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {counts[key]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="staff" className="mt-3">
          <StaffDetailList budgetId={budgetId} items={cwStaff} grossRevenue={grossRevenue} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-3">
          <ExpenseDetailList budgetId={budgetId} items={cwExpenses} grossRevenue={grossRevenue} />
        </TabsContent>
        <TabsContent value="assets" className="mt-3">
          <AssetDetailList budgetId={budgetId} items={cwAssets} grossRevenue={grossRevenue} />
        </TabsContent>
        <TabsContent value="liabilities" className="mt-3">
          <LiabilityDetailList budgetId={budgetId} items={cwLiabilities} grossRevenue={grossRevenue} />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-3">
          <VehicleDetailList budgetId={budgetId} items={cwVehicles} grossRevenue={grossRevenue} />
        </TabsContent>
      </Tabs>
    </div>
  );
}