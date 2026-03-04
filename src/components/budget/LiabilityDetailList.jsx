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
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', type: 'loan', principal_amount: '', interest_rate: '', monthly_payment: '', notes: '' };

export default function LiabilityDetailList({ budgetId, items, grossRevenue = 0 }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.LiabilityDetail.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['liabilities', budgetId] }); close(); toast.success('Liability added'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.LiabilityDetail.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['liabilities', budgetId] }); close(); toast.success('Liability updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.LiabilityDetail.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['liabilities', budgetId] }); toast.success('Liability removed'); },
  });

  const close = () => { setShowDialog(false); setEditing(null); setForm(EMPTY); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name || '', type: item.type || 'loan', principal_amount: item.principal_amount ?? '', interest_rate: item.interest_rate ?? '', monthly_payment: item.monthly_payment ?? '', notes: item.notes || '' }); setShowDialog(true); };

  const handleSave = () => {
    const data = { budget_id: budgetId, name: form.name, type: form.type, principal_amount: Number(form.principal_amount) || 0, interest_rate: Number(form.interest_rate) || 0, monthly_payment: Number(form.monthly_payment) || 0, notes: form.notes };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const totalAnnual = items.reduce((s, i) => s + (i.monthly_payment || 0) * 12, 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Liabilities</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Total annual payments: <strong>{fmt(totalAnnual)}</strong>{grossRevenue > 0 && <span className="text-xs ml-1 text-slate-400">({(totalAnnual / grossRevenue * 100).toFixed(1)}% of revenue)</span>}</p>
          </div>
          <Button onClick={() => { setForm(EMPTY); setShowDialog(true); }} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Liability</Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No liabilities added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest Rate</TableHead>
                    <TableHead className="text-right">Monthly Payment</TableHead>
                    <TableHead className="text-right">Annual Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{item.type?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">{fmt(item.principal_amount)}</TableCell>
                      <TableCell className="text-right">{item.interest_rate != null ? `${item.interest_rate}%` : '—'}</TableCell>
                      <TableCell className="text-right">{fmt(item.monthly_payment)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt((item.monthly_payment || 0) * 12)}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Liability' : 'Add Liability'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="line_of_credit">Line of Credit</SelectItem>
                    <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Principal ($)</Label><Input type="number" value={form.principal_amount} onChange={e => setForm({...form, principal_amount: e.target.value})} /></div>
              <div><Label>Interest Rate (%)</Label><Input type="number" value={form.interest_rate} onChange={e => setForm({...form, interest_rate: e.target.value})} /></div>
              <div><Label>Monthly Payment ($)</Label><Input type="number" value={form.monthly_payment} onChange={e => setForm({...form, monthly_payment: e.target.value})} /></div>
            </div>
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