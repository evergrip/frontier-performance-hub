import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';

const PRESET_DATA = {
  staff: [
    { name: 'General Manager', role: 'General Manager', salary: 95000, benefits_cost: 5000, cost_category: 'overhead', employment_type: 'full_time', department: 'Management' },
    { name: 'Office Administrator', role: 'Office Administrator', salary: 50000, benefits_cost: 3000, cost_category: 'overhead', employment_type: 'full_time', department: 'Administration' },
    { name: 'Bookkeeper / Accountant', role: 'Bookkeeper', salary: 55000, benefits_cost: 3000, cost_category: 'overhead', employment_type: 'full_time', department: 'Finance' },
    { name: 'Project Manager', role: 'Project Manager', salary: 80000, benefits_cost: 5000, cost_category: 'cogs', employment_type: 'full_time', department: 'Operations' },
    { name: 'Salesperson', role: 'Sales Representative', salary: 60000, commission_amount: 30000, benefits_cost: 3000, cost_category: 'split', employment_type: 'full_time', department: 'Sales' },
    { name: 'Estimator', role: 'Estimator', salary: 70000, benefits_cost: 4000, cost_category: 'overhead', employment_type: 'full_time', department: 'Pre-Construction' },
    { name: 'Site Supervisor / Foreman', role: 'Site Supervisor', salary: 75000, benefits_cost: 4000, cost_category: 'cogs', employment_type: 'full_time', department: 'Operations' },
    { name: 'Labourer', role: 'Labourer', salary: 45000, benefits_cost: 2000, cost_category: 'cogs', employment_type: 'full_time', department: 'Operations' },
    { name: 'Marketing Coordinator', role: 'Marketing Coordinator', salary: 50000, benefits_cost: 3000, cost_category: 'overhead', employment_type: 'full_time', department: 'Marketing' },
    { name: 'Designer / Drafter', role: 'Designer', salary: 60000, benefits_cost: 3500, cost_category: 'overhead', employment_type: 'full_time', department: 'Design' },
  ],
  expenses: [
    { name: 'General Liability Insurance', category: 'insurance', amount: 1500, period: 'monthly', cost_type: 'overhead' },
    { name: 'Commercial Auto Insurance', category: 'insurance', amount: 800, period: 'monthly', cost_type: 'overhead' },
    { name: 'Workers Compensation Insurance', category: 'insurance', amount: 2000, period: 'monthly', cost_type: 'overhead' },
    { name: 'Professional Liability (E&O)', category: 'insurance', amount: 500, period: 'monthly', cost_type: 'overhead' },
    { name: 'Office Rent / Lease', category: 'office', amount: 3000, period: 'monthly', cost_type: 'overhead' },
    { name: 'Electricity', category: 'utilities', amount: 400, period: 'monthly', cost_type: 'overhead' },
    { name: 'Heating / Gas', category: 'utilities', amount: 300, period: 'monthly', cost_type: 'overhead' },
    { name: 'Water & Sewer', category: 'utilities', amount: 100, period: 'monthly', cost_type: 'overhead' },
    { name: 'Internet & Phone', category: 'utilities', amount: 250, period: 'monthly', cost_type: 'overhead' },
    { name: 'Accounting & Legal Fees', category: 'professional_services', amount: 2500, period: 'quarterly', cost_type: 'overhead' },
    { name: 'Software Subscriptions', category: 'subscriptions', amount: 500, period: 'monthly', cost_type: 'overhead' },
    { name: 'Office Supplies', category: 'supplies', amount: 200, period: 'monthly', cost_type: 'overhead' },
    { name: 'Marketing & Advertising', category: 'marketing', amount: 1000, period: 'monthly', cost_type: 'overhead' },
    { name: 'Website & Social Media', category: 'marketing', amount: 300, period: 'monthly', cost_type: 'overhead' },
    { name: 'Vehicle Fuel (Fleet)', category: 'other', amount: 1500, period: 'monthly', cost_type: 'overhead' },
    { name: 'Safety & Training', category: 'other', amount: 500, period: 'monthly', cost_type: 'overhead' },
    { name: 'Permits & Licensing', category: 'professional_services', amount: 5000, period: 'annual', cost_type: 'overhead' },
    { name: 'Bank Fees & Merchant Fees', category: 'other', amount: 150, period: 'monthly', cost_type: 'overhead' },
    { name: 'Waste Disposal', category: 'other', amount: 400, period: 'monthly', cost_type: 'overhead' },
    { name: 'Equipment Rental', category: 'other', amount: 2000, period: 'monthly', cost_type: 'cogs' },
  ],
  assets: [
    { name: 'Excavator', type: 'equipment', purchase_cost: 150000, useful_life_years: 10, salvage_value: 20000, monthly_maintenance_cost: 500 },
    { name: 'Skid Steer Loader', type: 'equipment', purchase_cost: 65000, useful_life_years: 8, salvage_value: 10000, monthly_maintenance_cost: 300 },
    { name: 'Dump Trailer', type: 'equipment', purchase_cost: 25000, useful_life_years: 10, salvage_value: 5000, monthly_maintenance_cost: 100 },
    { name: 'Scaffolding System', type: 'equipment', purchase_cost: 15000, useful_life_years: 10, salvage_value: 2000, monthly_maintenance_cost: 50 },
    { name: 'Office Computers & IT', type: 'equipment', purchase_cost: 15000, useful_life_years: 4, salvage_value: 1000, monthly_maintenance_cost: 100 },
    { name: 'Power Tools Package', type: 'tools', purchase_cost: 10000, useful_life_years: 5, salvage_value: 1000, monthly_maintenance_cost: 75 },
    { name: 'Survey / Laser Equipment', type: 'equipment', purchase_cost: 8000, useful_life_years: 7, salvage_value: 1000, monthly_maintenance_cost: 25 },
    { name: 'Job Site Trailer', type: 'equipment', purchase_cost: 30000, useful_life_years: 15, salvage_value: 5000, monthly_maintenance_cost: 100 },
    { name: 'Office Furniture', type: 'other', purchase_cost: 10000, useful_life_years: 10, salvage_value: 500, monthly_maintenance_cost: 0 },
  ],
  liabilities: [
    { name: 'Equipment Loan', type: 'loan', principal_amount: 150000, interest_rate: 6.5, monthly_payment: 2950 },
    { name: 'Business Line of Credit', type: 'line_of_credit', principal_amount: 100000, interest_rate: 8, monthly_payment: 1500 },
    { name: 'Vehicle Financing', type: 'loan', principal_amount: 60000, interest_rate: 5.5, monthly_payment: 1150 },
    { name: 'Office Lease', type: 'lease', principal_amount: 0, interest_rate: 0, monthly_payment: 3000 },
    { name: 'Equipment Lease', type: 'lease', principal_amount: 0, interest_rate: 0, monthly_payment: 1800 },
  ],
  vehicles: [
    { make: 'Ford', model: 'F-150', year: 2024, purchase_cost: 55000, useful_life_years: 7, salvage_value: 15000, monthly_insurance_cost: 250, monthly_fuel_cost: 400, monthly_maintenance_cost: 100 },
    { make: 'Ram', model: '2500 HD', year: 2024, purchase_cost: 65000, useful_life_years: 7, salvage_value: 18000, monthly_insurance_cost: 300, monthly_fuel_cost: 500, monthly_maintenance_cost: 125 },
    { make: 'Ford', model: 'Transit Van', year: 2023, purchase_cost: 45000, useful_life_years: 8, salvage_value: 10000, monthly_insurance_cost: 200, monthly_fuel_cost: 350, monthly_maintenance_cost: 100 },
    { make: 'Chevrolet', model: 'Silverado 1500', year: 2024, purchase_cost: 52000, useful_life_years: 7, salvage_value: 14000, monthly_insurance_cost: 250, monthly_fuel_cost: 380, monthly_maintenance_cost: 100 },
    { make: 'Toyota', model: 'Tacoma', year: 2024, purchase_cost: 40000, useful_life_years: 8, salvage_value: 12000, monthly_insurance_cost: 200, monthly_fuel_cost: 300, monthly_maintenance_cost: 75 },
  ],
};

const CATEGORY_LABELS = {
  staff: 'Staff',
  expenses: 'Expenses',
  assets: 'Assets',
  liabilities: 'Liabilities',
  vehicles: 'Vehicles',
};

const formatCurrency = (v) => `$${Number(v || 0).toLocaleString()}`;

function getDisplayInfo(category, item) {
  switch (category) {
    case 'staff':
      return { label: item.name, sub: item.role, detail: `${formatCurrency(item.salary)}/yr` };
    case 'expenses':
      return { label: item.name, sub: item.category, detail: `${formatCurrency(item.amount)}/${item.period === 'monthly' ? 'mo' : item.period === 'quarterly' ? 'qtr' : 'yr'}` };
    case 'assets':
      return { label: item.name, sub: item.type?.replace('_', ' '), detail: formatCurrency(item.purchase_cost) };
    case 'liabilities':
      return { label: item.name, sub: item.type?.replace('_', ' '), detail: `${formatCurrency(item.monthly_payment)}/mo` };
    case 'vehicles':
      return { label: `${item.year || ''} ${item.make} ${item.model}`.trim(), sub: '', detail: formatCurrency(item.purchase_cost) };
    default:
      return { label: item.name, sub: '', detail: '' };
  }
}

export default function BudgetPrefillDialog({ open, onOpenChange, category, budgetId, onBulkCreate, existingNames = [] }) {
  const [selected, setSelected] = useState(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const presets = PRESET_DATA[category] || [];

  const toggle = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === presets.length) setSelected(new Set());
    else setSelected(new Set(presets.map((_, i) => i)));
  };

  const handleAdd = async () => {
    setIsAdding(true);
    const items = [...selected].map(i => ({ ...presets[i], budget_id: budgetId }));
    await onBulkCreate(items);
    setIsAdding(false);
    setSelected(new Set());
    onOpenChange(false);
  };

  const existingNamesLower = existingNames.map(n => n?.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected(new Set()); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Prefill {CATEGORY_LABELS[category] || 'Items'}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">Select common items to add to your budget. You can edit the amounts after adding.</p>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            {selected.size === presets.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-slate-500">{selected.size} selected</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          {presets.map((item, idx) => {
            const { label, sub, detail } = getDisplayInfo(category, item);
            const nameKey = category === 'vehicles' ? `${item.make} ${item.model}` : item.name;
            const alreadyExists = existingNamesLower.includes(nameKey?.toLowerCase());
            return (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selected.has(idx) ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                } ${alreadyExists ? 'opacity-50' : ''}`}
              >
                <Checkbox
                  checked={selected.has(idx)}
                  onCheckedChange={() => toggle(idx)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{label}</span>
                    {sub && <Badge variant="outline" className="text-xs capitalize">{sub}</Badge>}
                    {alreadyExists && <Badge variant="secondary" className="text-xs">Already added</Badge>}
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600 shrink-0">{detail}</span>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0 || isAdding}>
            {isAdding && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Add {selected.size} Item{selected.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}