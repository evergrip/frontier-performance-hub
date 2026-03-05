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

export default function BudgetDepartmentView({ budgetId, department, staffItems, expenseItems, assetItems, liabilityItems, vehicleItems, grossRevenue }) {
  const [activeTab, setActiveTab] = useState('staff');

  const deptStaff = useMemo(() => staffItems.filter(s => s.department === department), [staffItems, department]);
  const deptExpenses = useMemo(() => expenseItems.filter(e => e.department === department), [expenseItems, department]);
  const deptAssets = useMemo(() => assetItems.filter(a => a.department === department), [assetItems, department]);
  const deptLiabilities = useMemo(() => liabilityItems.filter(l => l.department === department), [liabilityItems, department]);
  const deptVehicles = useMemo(() => vehicleItems.filter(v => v.department === department), [vehicleItems, department]);

  const counts = {
    staff: deptStaff.length,
    expenses: deptExpenses.length,
    assets: deptAssets.length,
    liabilities: deptLiabilities.length,
    vehicles: deptVehicles.length,
  };

  return (
    <div className="space-y-4">
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
          <StaffDetailList budgetId={budgetId} items={deptStaff} grossRevenue={grossRevenue} defaultDepartment={department} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-3">
          <ExpenseDetailList budgetId={budgetId} items={deptExpenses} grossRevenue={grossRevenue} defaultDepartment={department} />
        </TabsContent>
        <TabsContent value="assets" className="mt-3">
          <AssetDetailList budgetId={budgetId} items={deptAssets} grossRevenue={grossRevenue} defaultDepartment={department} />
        </TabsContent>
        <TabsContent value="liabilities" className="mt-3">
          <LiabilityDetailList budgetId={budgetId} items={deptLiabilities} grossRevenue={grossRevenue} defaultDepartment={department} />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-3">
          <VehicleDetailList budgetId={budgetId} items={deptVehicles} grossRevenue={grossRevenue} defaultDepartment={department} />
        </TabsContent>
      </Tabs>
    </div>
  );
}