import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Users, Package } from 'lucide-react';
import { toast } from 'sonner';
import BudgetPrefillDialog from './BudgetPrefillDialog';

const makeEmpty = (dept = '') => ({ name: '', role: '', pay_type: 'salary', salary: '', hourly_rate: '', hours_per_week: '40', commission_amount: '', benefits: [], taxes_cost: '', department: dept, employment_type: 'full_time', cost_category: 'overhead', payroll_obligation_overrides: [], notes: '' });

// Migrate legacy fields to benefits array
const migrateBenefits = (item) => {
  if (item.benefits && item.benefits.length > 0) return item.benefits;
  const arr = [];
  if (item.benefits_cost) arr.push({ name: 'Benefits / Insurance', amount: item.benefits_cost });
  if (item.hsa_cost) arr.push({ name: 'Health Spending (HSA)', amount: item.hsa_cost });
  if (item.rrsp_match_cost) arr.push({ name: 'RRSP Match', amount: item.rrsp_match_cost });
  return arr;
};

const resolveBenefitAmount = (benefit, annualIncome) => {
  if (benefit.mode === 'percent_of_income') {
    return Math.round((Number(benefit.percent_value) || 0) / 100 * annualIncome * 100) / 100;
  }
  return Number(benefit.amount) || 0;
};

const getBenefitsTotal = (item) => {
  const benefits = item.benefits || [];
  const income = (item.salary || 0) + (item.commission_amount || 0);
  if (benefits.length > 0) return benefits.reduce((s, b) => s + resolveBenefitAmount(b, income), 0);
  return (item.benefits_cost || 0) + (item.hsa_cost || 0) + (item.rrsp_match_cost || 0);
};

// Calculate withholdings based on budget payroll obligations with per-staff overrides
const calcWithholdingsFromObligations = (obligations, salary, commission, costCategory, overrides) => {
  if (!obligations || obligations.length === 0) return { items: [], total: 0 };
  const staffOverrides = overrides || [];
  const items = obligations.map(o => {
    const override = staffOverrides.find(ov => ov.obligation_id === o.id);
    if (override?.exempt) return { id: o.id, name: o.name, rate: 0, amount: 0, exempt: true };
    const rate = Number(override?.rate ?? o.rate) || 0;
    const cap = Number(override?.annual_cap ?? o.annual_cap) || 0;
    const appliesTo = o.applies_to || 'salary';
    let base = Number(salary) || 0;
    if (appliesTo === 'salary_and_commission') base += Number(commission) || 0;
    if (appliesTo === 'total_compensation') base += Number(commission) || 0;
    let amount = Math.round(base * (rate / 100) * 100) / 100;
    if (cap > 0) amount = Math.min(amount, cap);
    return { id: o.id, name: o.name, rate, amount };
  });
  return { items, total: items.reduce((s, i) => s + i.amount, 0) };
};

export default function StaffDetailList({ budgetId, items, grossRevenue = 0, defaultDepartment = '', payrollObligations = null }) {
  const budgetObligations = payrollObligations?.obligations || [];
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(makeEmpty(defaultDepartment));
  const [showPrefill, setShowPrefill] = useState(false);
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.StaffDetail.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff', budgetId] }); close(); toast.success('Staff added'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.StaffDetail.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff', budgetId] }); close(); toast.success('Staff updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.StaffDetail.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff', budgetId] }); toast.success('Staff removed'); },
  });

  const close = () => { setShowDialog(false); setEditing(null); setForm(makeEmpty(defaultDepartment)); };
  const openEdit = (item) => {
    const migratedBenefits = migrateBenefits(item).map(b => ({
      name: b.name || '',
      mode: b.mode || 'fixed',
      amount: b.amount ?? '',
      percent_value: b.percent_value ?? '',
    }));
    setEditing(item);
    setForm({ name: item.name || '', role: item.role || '', pay_type: item.pay_type || 'salary', salary: item.salary ?? '', hourly_rate: item.hourly_rate ?? '', hours_per_week: item.hours_per_week ?? '40', commission_amount: item.commission_amount ?? '', benefits: migratedBenefits, taxes_cost: item.taxes_cost ?? '', department: item.department || '', employment_type: item.employment_type || 'full_time', cost_category: item.cost_category || 'overhead', payroll_obligation_overrides: item.payroll_obligation_overrides || [], notes: item.notes || '' });
    setShowDialog(true);
  };
  const openCreate = () => { setForm(makeEmpty(defaultDepartment)); setShowDialog(true); };

  const computedAnnualSalary = form.pay_type === 'hourly'
    ? (Number(form.hourly_rate) || 0) * (Number(form.hours_per_week) || 0) * 52
    : (Number(form.salary) || 0);
  const formCommission = form.cost_category === 'split' ? (Number(form.commission_amount) || 0) : 0;
  const withholdings = calcWithholdingsFromObligations(budgetObligations, computedAnnualSalary, formCommission, form.cost_category, form.payroll_obligation_overrides);

  const formAnnualIncome = computedAnnualSalary + formCommission;
  const formBenefitsTotal = (form.benefits || []).reduce((s, b) => s + resolveBenefitAmount(b, formAnnualIncome), 0);

  const handleSave = () => {
    const cleanBenefits = (form.benefits || [])
      .filter(b => b.name && ((b.mode === 'percent_of_income' && Number(b.percent_value) > 0) || (b.mode !== 'percent_of_income' && Number(b.amount) > 0)))
      .map(b => {
        const income = computedAnnualSalary + (form.cost_category === 'split' ? (Number(form.commission_amount) || 0) : 0);
        if (b.mode === 'percent_of_income') {
          return { name: b.name, mode: 'percent_of_income', percent_value: Number(b.percent_value), amount: resolveBenefitAmount(b, income) };
        }
        return { name: b.name, mode: 'fixed', amount: Number(b.amount) };
      });
    const data = {
      budget_id: budgetId, name: form.name, role: form.role,
      pay_type: form.pay_type || 'salary',
      salary: computedAnnualSalary,
      hourly_rate: form.pay_type === 'hourly' ? (Number(form.hourly_rate) || 0) : null,
      hours_per_week: form.pay_type === 'hourly' ? (Number(form.hours_per_week) || 0) : null,
      commission_amount: form.cost_category === 'split' ? (Number(form.commission_amount) || 0) : 0,
      benefits: cleanBenefits,
      benefits_cost: cleanBenefits.reduce((s, b) => s + b.amount, 0),
      hsa_cost: 0,
      rrsp_match_cost: 0,
      taxes_cost: withholdings.total,
      payroll_obligation_overrides: (form.payroll_obligation_overrides || []).filter(o => o.obligation_id),
      department: form.department || '', employment_type: form.employment_type,
      cost_category: form.cost_category, notes: form.notes,
    };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const getItemTotal = (i) => (i.salary || 0) + (i.commission_amount || 0) + getBenefitsTotal(i) + (i.taxes_cost || 0);
  const totalCost = items.reduce((s, i) => s + getItemTotal(i), 0);
  
  // Calculate overhead vs COGS portions
  const overheadCost = items.reduce((s, i) => {
    const cat = i.cost_category || 'overhead';
    if (cat === 'overhead') return s + getItemTotal(i);
    if (cat === 'split') return s + (i.salary || 0) + getBenefitsTotal(i) + (i.taxes_cost || 0); // salary+benefits+taxes → overhead
    return s;
  }, 0);
  const cogsCost = items.reduce((s, i) => {
    const cat = i.cost_category || 'overhead';
    if (cat === 'cogs') return s + getItemTotal(i);
    if (cat === 'split') return s + (i.commission_amount || 0); // commission → COGS
    return s;
  }, 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Staff Details</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Total: <strong>{fmt(totalCost)}</strong>{grossRevenue > 0 && <span className="text-xs ml-1 text-slate-400">({(totalCost / grossRevenue * 100).toFixed(1)}% of revenue)</span>} <span className="text-xs ml-2">(<span className="text-amber-600">Overhead: {fmt(overheadCost)}</span> | <span className="text-blue-600">COGS: {fmt(cogsCost)}</span>)</span></p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowPrefill(true)} size="sm" variant="outline"><Package className="w-4 h-4 mr-1" /> Prefill</Button>
            <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Staff</Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No staff members added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Benefits</TableHead>
                    <TableHead className="text-right">Withholdings</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.role || '—'}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          (item.cost_category || 'overhead') === 'overhead' ? 'bg-amber-100 text-amber-700' : 
                          item.cost_category === 'split' ? 'bg-purple-100 text-purple-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {(item.cost_category || 'overhead') === 'overhead' ? 'Overhead' : item.cost_category === 'split' ? 'Split' : 'COGS'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.pay_type === 'hourly' ? (
                          <span title={`$${item.hourly_rate}/hr × ${item.hours_per_week}hrs × 52wks`}>
                            {fmt(item.salary)}
                            <span className="block text-[10px] text-slate-400">${item.hourly_rate}/hr</span>
                          </span>
                        ) : fmt(item.salary)}
                      </TableCell>
                      <TableCell className="text-right">{item.cost_category === 'split' && item.commission_amount ? fmt(item.commission_amount) : '—'}</TableCell>
                      <TableCell className="text-right">
                        {fmt(getBenefitsTotal(item))}
                        {(item.benefits || []).length > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            {item.benefits.map(b => {
                              const income = (item.salary || 0) + (item.commission_amount || 0);
                              if (b.mode === 'percent_of_income') return `${b.name}: ${b.percent_value}% ($${resolveBenefitAmount(b, income).toLocaleString()})`;
                              return `${b.name}: ${fmt(b.amount)}`;
                            }).join(' · ')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{fmt(item.taxes_cost)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(getItemTotal(item))}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('Remove?')) deleteMut.mutate(item.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetPrefillDialog
        open={showPrefill}
        onOpenChange={setShowPrefill}
        category="staff"
        budgetId={budgetId}
        existingNames={items.map(i => i.name)}
        onBulkCreate={async (newItems) => {
          await base44.entities.StaffDetail.bulkCreate(newItems);
          qc.invalidateQueries({ queryKey: ['staff', budgetId] });
          toast.success(`${newItems.length} staff members added`);
        }}
      />

      <Dialog open={showDialog} onOpenChange={close}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Staff' : 'Add Staff'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Role</Label><Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.employment_type} onValueChange={v => setForm({...form, employment_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cost Category</Label>
              <Select value={form.cost_category} onValueChange={v => setForm({...form, cost_category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="overhead">Overhead</SelectItem>
                  <SelectItem value="cogs">Cost of Goods Sold</SelectItem>
                  <SelectItem value="split">Split — Salary → Overhead, Commission → COGS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pay Type</Label>
              <Select value={form.pay_type || 'salary'} onValueChange={v => setForm({...form, pay_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Annual Salary</SelectItem>
                  <SelectItem value="hourly">Hourly Wage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.pay_type === 'hourly' ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Hourly Rate ($)</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} placeholder="e.g. 25" /></div>
                <div><Label>Hours / Week</Label><Input type="number" value={form.hours_per_week} onChange={e => setForm({...form, hours_per_week: e.target.value})} placeholder="e.g. 40" /></div>
              </div>
            ) : (
              <div><Label>Annual Salary ($)</Label><Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
            )}
            {form.pay_type === 'hourly' && computedAnnualSalary > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                Annualized: <strong>${computedAnnualSalary.toLocaleString()}</strong> ({form.hourly_rate}/hr × {form.hours_per_week} hrs × 52 wks)
              </div>
            )}
            {form.cost_category === 'split' && (
              <div><Label>Commission ($)</Label><Input type="number" value={form.commission_amount} onChange={e => setForm({...form, commission_amount: e.target.value})} placeholder="Projected annual" /></div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Benefits {formBenefitsTotal > 0 && <span className="text-slate-400 font-normal ml-1">(Total: {fmt(formBenefitsTotal)})</span>}</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({...form, benefits: [...(form.benefits || []), { name: '', mode: 'fixed', amount: '', percent_value: '' }]})}>
                  <Plus className="w-3 h-3 mr-1" /> Add Benefit
                </Button>
              </div>
              {(form.benefits || []).length === 0 && (
                <p className="text-xs text-slate-400 py-2 text-center">No benefits added yet. Click "Add Benefit" to create one.</p>
              )}
              {(form.benefits || []).map((b, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs text-slate-500">Name</Label>}
                      <Input value={b.name} onChange={e => { const arr = [...form.benefits]; arr[idx] = {...arr[idx], name: e.target.value}; setForm({...form, benefits: arr}); }} placeholder="e.g. Dental Plan, HSA, RRSP Match" />
                    </div>
                    <div className="w-32">
                      {idx === 0 && <Label className="text-xs text-slate-500">Type</Label>}
                      <Select value={b.mode || 'fixed'} onValueChange={v => { const arr = [...form.benefits]; arr[idx] = {...arr[idx], mode: v}; setForm({...form, benefits: arr}); }}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed $</SelectItem>
                          <SelectItem value="percent_of_income">% of Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      {idx === 0 && <Label className="text-xs text-slate-500">{b.mode === 'percent_of_income' ? '%' : 'Annual ($)'}</Label>}
                      {b.mode === 'percent_of_income' ? (
                        <Input type="number" value={b.percent_value ?? ''} onChange={e => { const arr = [...form.benefits]; arr[idx] = {...arr[idx], percent_value: e.target.value}; setForm({...form, benefits: arr}); }} placeholder="e.g. 5" />
                      ) : (
                        <Input type="number" value={b.amount ?? ''} onChange={e => { const arr = [...form.benefits]; arr[idx] = {...arr[idx], amount: e.target.value}; setForm({...form, benefits: arr}); }} placeholder="0" />
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { const arr = [...form.benefits]; arr.splice(idx, 1); setForm({...form, benefits: arr}); }}>
                      <Trash2 className="w-3 h-3 text-slate-400" />
                    </Button>
                  </div>
                  {b.mode === 'percent_of_income' && Number(b.percent_value) > 0 && formAnnualIncome > 0 && (
                    <p className="text-[10px] text-slate-400 ml-1">= ${resolveBenefitAmount(b, formAnnualIncome).toLocaleString()}/yr ({b.percent_value}% of ${formAnnualIncome.toLocaleString()})</p>
                  )}
                </div>
              ))}
            </div>
            {form.cost_category === 'split' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                <strong>Split allocation:</strong> Salary + Benefits + Withholdings → Overhead | Commission → COGS
              </div>
            )}
            {computedAnnualSalary > 0 && (
              <div className="bg-slate-50 border rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-700 mb-2">Employer Withholdings (auto-calculated)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">CPP ({(EMPLOYER_RATES.cpp * 100).toFixed(2)}%)</span>
                  <span className="text-right font-medium">${withholdings.cpp.toLocaleString()}</span>
                  <span className="text-slate-500">EI ({(EMPLOYER_RATES.ei * 100).toFixed(2)}%)</span>
                  <span className="text-right font-medium">${withholdings.ei.toLocaleString()}</span>
                  <span className="text-slate-500">WSIB ({(EMPLOYER_RATES.wsib * 100).toFixed(2)}%)</span>
                  <span className="text-right font-medium">${withholdings.wsib.toLocaleString()}</span>
                  <span className="text-slate-500">EHT ({(EMPLOYER_RATES.eht * 100).toFixed(2)}%)</span>
                  <span className="text-right font-medium">${withholdings.eht.toLocaleString()}</span>
                </div>
                <div className="border-t pt-1.5 mt-1.5 flex justify-between text-sm font-semibold">
                  <span>Total Withholdings</span>
                  <span>${withholdings.total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createMut.isPending || updateMut.isPending}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}