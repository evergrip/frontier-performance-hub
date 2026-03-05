import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X, Database, Sparkles, Loader2, Trash2 } from 'lucide-react';
import CustomItemForm from './CustomItemForm';

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

const ENTITY_MAP = {
  staff: 'StaffDetail',
  expenses: 'ExpenseDetail',
  assets: 'AssetDetail',
  liabilities: 'LiabilityDetail',
  vehicles: 'VehicleDetail',
};

const STRIP_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'budget_id'];

const CATEGORY_CONFIG = {
  staff: {
    title: 'Staff Members',
    description: 'Select from templates or import from an existing budget.',
    getLabel: i => i.name,
    getSub: i => i.department,
    getDetail: i => `$${(i.salary||0).toLocaleString()}/yr`,
    editableField: 'salary',
  },
  expenses: {
    title: 'Operating Expenses',
    description: 'Select from templates or import from an existing budget.',
    getLabel: i => i.name,
    getSub: i => i.category?.replace('_', ' '),
    getDetail: i => `$${(i.amount||0).toLocaleString()}/${i.period === 'monthly' ? 'mo' : i.period === 'quarterly' ? 'qtr' : 'yr'}`,
    editableField: 'amount',
  },
  assets: {
    title: 'Assets & Equipment',
    description: 'Select from templates or import from an existing budget.',
    getLabel: i => i.name,
    getSub: i => i.type?.replace('_', ' '),
    getDetail: i => `$${(i.purchase_cost||0).toLocaleString()}`,
    editableField: 'purchase_cost',
  },
  liabilities: {
    title: 'Liabilities & Debt',
    description: 'Select from templates or import from an existing budget.',
    getLabel: i => i.name,
    getSub: i => i.type?.replace('_', ' '),
    getDetail: i => `$${(i.monthly_payment||0).toLocaleString()}/mo`,
    editableField: 'monthly_payment',
  },
  vehicles: {
    title: 'Vehicles',
    description: 'Select from templates or import from an existing budget.',
    getLabel: i => `${i.year || ''} ${i.make} ${i.model}`.trim(),
    getSub: () => '',
    getDetail: i => `$${(i.purchase_cost||0).toLocaleString()}`,
    editableField: 'purchase_cost',
  },
};

export default function WizardPrefillStep({ category, selectedItems, setSelectedItems }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [source, setSource] = useState('templates');
  const [budgets, setBudgets] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [existingItems, setExistingItems] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const config = CATEGORY_CONFIG[category];
  const items = source === 'templates' ? (PRESET_DATA[category] || []) : existingItems;

  // Load budgets list once when switching to "existing" source
  useEffect(() => {
    if (source === 'existing' && budgets.length === 0) {
      setLoadingBudgets(true);
      base44.entities.Budget.list('-created_date').then(b => {
        setBudgets(b);
        setLoadingBudgets(false);
      });
    }
  }, [source]);

  // Load items when a budget is selected
  useEffect(() => {
    if (source === 'existing' && selectedBudgetId) {
      setLoadingItems(true);
      const entityName = ENTITY_MAP[category];
      base44.entities[entityName].filter({ budget_id: selectedBudgetId }).then(data => {
        const cleaned = data.map(item => {
          const copy = { ...item };
          STRIP_FIELDS.forEach(f => delete copy[f]);
          return copy;
        });
        setExistingItems(cleaned);
        setLoadingItems(false);
      });
    }
  }, [source, selectedBudgetId, category]);

  // Reset selections when source changes
  useEffect(() => {
    setSelectedItems([]);
    setEditingIdx(null);
    setExistingItems([]);
    setSelectedBudgetId('');
  }, [source]);

  const toggle = (idx) => {
    setSelectedItems(prev => {
      const existing = prev.find(s => s._presetIdx === idx);
      if (existing) return prev.filter(s => s._presetIdx !== idx);
      return [...prev, { ...items[idx], _presetIdx: idx }];
    });
  };

  const selectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((p, i) => ({ ...p, _presetIdx: i })));
    }
  };

  const startEdit = (idx) => {
    const item = selectedItems.find(s => s._presetIdx === idx);
    if (item) {
      setEditingIdx(idx);
      setEditValue(item[config.editableField] || '');
    }
  };

  const saveEdit = () => {
    setSelectedItems(prev => prev.map(s =>
      s._presetIdx === editingIdx ? { ...s, [config.editableField]: Number(editValue) || 0 } : s
    ));
    setEditingIdx(null);
  };

  const isSelected = (idx) => selectedItems.some(s => s._presetIdx === idx);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">{config.title}</h2>
        <p className="text-sm text-slate-500">{config.description}</p>
      </div>

      {/* Source Toggle */}
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setSource('templates')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium flex-1 justify-center transition ${
            source === 'templates' ? 'bg-white shadow text-amber-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Templates
        </button>
        <button
          onClick={() => setSource('existing')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium flex-1 justify-center transition ${
            source === 'existing' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" /> From Existing Budget
        </button>
      </div>

      {/* Budget picker when in existing mode */}
      {source === 'existing' && (
        <div>
          {loadingBudgets ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading budgets...
            </div>
          ) : budgets.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No existing budgets found.</p>
          ) : (
            <Select value={selectedBudgetId} onValueChange={setSelectedBudgetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a budget to import from..." />
              </SelectTrigger>
              <SelectContent>
                {budgets.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} (FY {b.fiscal_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Loading items indicator */}
      {source === 'existing' && loadingItems && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading items...
        </div>
      )}

      {/* Empty state for existing budget with no items */}
      {source === 'existing' && selectedBudgetId && !loadingItems && items.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          No {category} items found in this budget.
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && !(source === 'existing' && loadingItems) && (
        <>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-slate-500">{selectedItems.length} of {items.length} selected</span>
          </div>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {items.map((item, idx) => {
              const selected = isSelected(idx);
              const selectedItem = selectedItems.find(s => s._presetIdx === idx);
              const displayItem = selectedItem || item;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selected ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Checkbox checked={selected} onCheckedChange={() => toggle(idx)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{config.getLabel(displayItem)}</span>
                      {config.getSub(displayItem) && (
                        <Badge variant="outline" className="text-xs capitalize">{config.getSub(displayItem)}</Badge>
                      )}
                      {source === 'existing' && (
                        <Badge className="text-xs bg-blue-50 text-blue-600 border-blue-200">imported</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingIdx === idx ? (
                      <>
                        <Input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-28 h-8 text-sm"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIdx(null); }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}><Check className="w-3.5 h-3.5 text-emerald-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIdx(null)}><X className="w-3.5 h-3.5 text-slate-400" /></Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-600">{config.getDetail(displayItem)}</span>
                        {selected && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(idx)}>
                            <Pencil className="w-3 h-3 text-slate-400" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Custom items already added */}
      {selectedItems.filter(s => s._source === 'custom').length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Custom Items</p>
          <div className="space-y-1.5">
            {selectedItems.filter(s => s._source === 'custom').map((item, i) => (
              <div key={`custom-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{config.getLabel(item)}</span>
                    {config.getSub(item) && (
                      <Badge variant="outline" className="text-xs capitalize">{config.getSub(item)}</Badge>
                    )}
                    <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300">custom</Badge>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600 shrink-0">{config.getDetail(item)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                  setSelectedItems(prev => prev.filter(s => !(s._source === 'custom' && s._customIdx === item._customIdx)));
                }}>
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom item form */}
      <CustomItemForm
        category={category}
        onAdd={(newItem) => {
          const customIdx = Date.now() + Math.random();
          setSelectedItems(prev => [...prev, { ...newItem, _source: 'custom', _customIdx: customIdx }]);
        }}
      />
    </div>
  );
}