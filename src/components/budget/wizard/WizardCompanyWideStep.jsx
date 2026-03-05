import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Receipt, Wrench, CreditCard, Car } from 'lucide-react';
import WizardPrefillStep from './WizardPrefillStep';

const CATEGORIES = [
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'assets', label: 'Assets', icon: Wrench },
  { key: 'liabilities', label: 'Liabilities', icon: CreditCard },
  { key: 'vehicles', label: 'Vehicles', icon: Car },
];

export default function WizardCompanyWideStep({ selections, setSelections }) {
  const [activeTab, setActiveTab] = useState('staff');

  const totalItems = CATEGORIES.reduce((sum, cat) => sum + (selections[cat.key]?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Company-Wide Items</h2>
        <p className="text-sm text-slate-500">
          Add shared staff, expenses, assets, liabilities, and vehicles not tied to a specific department.
          {totalItems > 0 && <span className="ml-1 font-medium text-amber-700">({totalItems} items selected)</span>}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const count = selections[key]?.length || 0;
            return (
              <TabsTrigger key={key} value={key} className="text-xs gap-1 relative">
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map(({ key }) => (
          <TabsContent key={key} value={key} className="mt-3">
            <WizardPrefillStep
              category={key}
              selectedItems={selections[key] || []}
              setSelectedItems={(updater) => {
                setSelections(prev => ({
                  ...prev,
                  [key]: typeof updater === 'function' ? updater(prev[key]) : updater,
                }));
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}