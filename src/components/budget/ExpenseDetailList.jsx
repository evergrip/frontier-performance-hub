import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', category: 'other', amount: '', period: 'monthly', cost_type: 'overhead', notes: '' };

const CATEGORY_LABELS = {
  insurance: 'Insurance',
  utilities: 'Utilities',
  office: 'Office',
  subscriptions: 'Subscriptions',
  professional_services: 'Professional Services',
  marketing: 'Marketing',
  travel: 'Travel',
  supplies: 'Supplies',
  other: 'Other',
};

const annualize = (amount, period) => {
  const a = Number(amount) || 0;
  if (period === 'monthly') return a * 12;
  if (period === 'quarterly') return a * 4;
  return a;
};

export default function ExpenseDetailList({ budgetId, items, grossRevenue = 0 }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.ExpenseDetail.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', budgetId] }); close(); toast.success('Expense added'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.ExpenseDetail.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', budgetId] }); close(); toast.success('Expense updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.ExpenseDetail.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', budgetId] }); toast.success('Expense removed'); },
  });

  const close = () => { setShowDialog(false); setEditing(null); setForm(EMPTY); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name || '', category: item.category || 'other', amount: item.amount ?? '', period: item.period || 'monthly', cost_type: item.cost_type || 'overhead', notes: item.notes || '' });
    setShowDialog(true);
  };
  const openCreate = () => { setForm(EMPTY); setShowDialog(true); };

  const handleSave = () => {
    const data = { budget_id: budgetId, name: form.name, category: form.category, amount: Number(form.amount) || 0, period: form.period, cost_type: form.cost_type, notes: form.notes };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';

  const totalAnnual = items.reduce((s, i) => s + annualize(i.amount, i.period), 0);
  const overheadTotal = items.filter(i => (i.cost_type || 'overhead') === 'overhead').reduce((s, i) => s + annualize(i.amount, i.period), 0);
  const cogsTotal = items.filter(i => i.cost_type === 'cogs').reduce((s, i) => s + annualize(i.amount, i.period), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Expenses</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Annual Total: <strong>{fmt(totalAnnual)}</strong>{grossRevenue > 0 && <span className="text-xs ml-1 text-slate-400">({(totalAnnual / grossRevenue * 100).toFixed(1)}% of revenue)</span>}
              <span className="text-xs ml-2">
                (<span className="text-amber-600">Overhead: {fmt(overheadTotal)}</span> | <span className="text-blue-600">COGS: {fmt(cogsTotal)}</span>)
              </span>
            </p>
          </div>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Expense</Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No expenses added yet. Add items like insurance, heat, internet, etc.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Annual Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{CATEGORY_LABELS[item.category] || item.category}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          (item.cost_type || 'overhead') === 'overhead' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {(item.cost_type || 'overhead') === 'overhead' ? 'Overhead' : 'COGS'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{fmt(item.amount)}</TableCell>
                      <TableCell className="capitalize">{item.period}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(annualize(item.amount, item.period))}</TableCell>
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

      <Dialog open={showDialog} onOpenChange={close}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Building Insurance" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cost Type</Label>
                <Select value={form.cost_type} onValueChange={v => setForm({ ...form, cost_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="cogs">Cost of Goods Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div>
                <Label>Period</Label>
                <Select value={form.period} onValueChange={v => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {Number(form.amount) > 0 && (
              <div className="bg-slate-50 border rounded-lg p-3 text-sm">
                <span className="text-slate-500">Annual cost: </span>
                <span className="font-semibold">{fmt(annualize(form.amount, form.period))}</span>
              </div>
            )}
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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