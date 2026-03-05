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

const makeEmpty = (dept = '') => ({ name: '', role: '', salary: '', commission_amount: '', benefits_cost: '', taxes_cost: '', department: dept, employment_type: 'full_time', cost_category: 'overhead', notes: '' });

// Canadian employer withholding rates (approximate)
const EMPLOYER_RATES = {
  cpp: 0.0595,   // CPP employer portion ~5.95%
  ei: 0.0232,    // EI employer portion ~2.32% (1.4x employee rate)
  wsib: 0.015,   // WSIB ~1.5% (varies by industry)
  eht: 0.0195,   // Employer Health Tax ~1.95%
};
const TOTAL_EMPLOYER_RATE = Object.values(EMPLOYER_RATES).reduce((s, r) => s + r, 0);

const calcEmployerWithholdings = (salary) => {
  const s = Number(salary) || 0;
  return {
    cpp: Math.round(s * EMPLOYER_RATES.cpp * 100) / 100,
    ei: Math.round(s * EMPLOYER_RATES.ei * 100) / 100,
    wsib: Math.round(s * EMPLOYER_RATES.wsib * 100) / 100,
    eht: Math.round(s * EMPLOYER_RATES.eht * 100) / 100,
    total: Math.round(s * TOTAL_EMPLOYER_RATE * 100) / 100,
  };
};

export default function StaffDetailList({ budgetId, items, grossRevenue = 0, defaultDepartment = '' }) {
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
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name || '', role: item.role || '', salary: item.salary ?? '', commission_amount: item.commission_amount ?? '', benefits_cost: item.benefits_cost ?? '', taxes_cost: item.taxes_cost ?? '', department: item.department || '', employment_type: item.employment_type || 'full_time', cost_category: item.cost_category || 'overhead', notes: item.notes || '' }); setShowDialog(true); };
  const openCreate = () => { setForm(makeEmpty(defaultDepartment)); setShowDialog(true); };

  const totalCompForWithholdings = (Number(form.salary) || 0) + (form.cost_category === 'split' ? (Number(form.commission_amount) || 0) : 0);
  const withholdings = calcEmployerWithholdings(totalCompForWithholdings);

  const handleSave = () => {
    const data = { budget_id: budgetId, name: form.name, role: form.role, salary: Number(form.salary) || 0, commission_amount: form.cost_category === 'split' ? (Number(form.commission_amount) || 0) : 0, benefits_cost: Number(form.benefits_cost) || 0, taxes_cost: withholdings.total, department: form.department || '', employment_type: form.employment_type, cost_category: form.cost_category, notes: form.notes };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const getItemTotal = (i) => (i.salary || 0) + (i.commission_amount || 0) + (i.benefits_cost || 0) + (i.taxes_cost || 0);
  const totalCost = items.reduce((s, i) => s + getItemTotal(i), 0);
  
  // Calculate overhead vs COGS portions
  const overheadCost = items.reduce((s, i) => {
    const cat = i.cost_category || 'overhead';
    if (cat === 'overhead') return s + getItemTotal(i);
    if (cat === 'split') return s + (i.salary || 0) + (i.benefits_cost || 0) + (i.taxes_cost || 0); // salary+benefits+taxes → overhead
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
                      <TableCell className="text-right">{fmt(item.salary)}</TableCell>
                      <TableCell className="text-right">{item.cost_category === 'split' && item.commission_amount ? fmt(item.commission_amount) : '—'}</TableCell>
                      <TableCell className="text-right">{fmt(item.benefits_cost)}</TableCell>
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
            <div className={`grid gap-3 ${form.cost_category === 'split' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div><Label>Salary ($)</Label><Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
              {form.cost_category === 'split' && (
                <div><Label>Commission ($)</Label><Input type="number" value={form.commission_amount} onChange={e => setForm({...form, commission_amount: e.target.value})} placeholder="Projected annual" /></div>
              )}
              <div><Label>Benefits ($)</Label><Input type="number" value={form.benefits_cost} onChange={e => setForm({...form, benefits_cost: e.target.value})} /></div>
            </div>
            {form.cost_category === 'split' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                <strong>Split allocation:</strong> Salary + Benefits + Withholdings → Overhead | Commission → COGS
              </div>
            )}
            {Number(form.salary) > 0 && (
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