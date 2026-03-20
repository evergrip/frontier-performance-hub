import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VarCompRulesTab from '@/components/varcomp/VarCompRulesTab';
import NetProfitEntryTab from '@/components/varcomp/NetProfitEntryTab';
import VarCompPayoutsTab from '@/components/varcomp/VarCompPayoutsTab';

export default function VarCompAdmin() {
  const [activeTab, setActiveTab] = useState('rules');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Variable Compensation</h1>
        <p className="text-slate-500 mt-1">Manage profit sharing rules, enter NP% data, and review payouts</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="np_entry">NP% Entry</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <VarCompRulesTab />
        </TabsContent>
        <TabsContent value="np_entry">
          <NetProfitEntryTab />
        </TabsContent>
        <TabsContent value="payouts">
          <VarCompPayoutsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}