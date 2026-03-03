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
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', role: '', salary: '', benefits_cost: '', taxes_cost: '', department: '', employment_type: 'full_time', cost_category: 'overhead', notes: '' };

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

export default function StaffDetailList({ budgetId, items }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
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

  const close = () => { setShowDialog(false); setEditing(null); setForm(EMPTY); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name || '', role: item.role || '', salary: item.salary ?? '', benefits_cost: item.benefits_cost ?? '', taxes_cost: item.taxes_cost ?? '', department: item.department || '', employment_type: item.employment_type || 'full_time', cost_category: item.cost_category || 'overhead', notes: item.notes || '' }); setShowDialog(true); };
  const openCreate = () => { setForm(EMPTY); setShowDialog(true); };

  const withholdings = calcEmployerWithholdings(form.salary);

  const handleSave = () => {
    const data = { budget_id: budgetId, name: form.name, role: form.role, salary: Number(form.salary) || 0, benefits_cost: Number(form.benefits_cost) || 0, taxes_cost: withholdings.total, department: form.department, employment_type: form.employment_type, cost_category: form.cost_category, notes: form.notes };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const totalCost = items.reduce((s, i) => s + (i.salary || 0) + (i.benefits_cost || 0) + (i.taxes_cost || 0), 0);
  const overheadCost = items.filter(i => (i.cost_category || 'overhead') === 'overhead').reduce((s, i) => s + (i.salary || 0) + (i.benefits_cost || 0) + (i.taxes_cost || 0), 0);
  const cogsCost = items.filter(i => i.cost_category === 'cogs').reduce((s, i) => s + (i.salary || 0) + (i.benefits_cost || 0) + (i.taxes_cost || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Staff Details</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Total: <strong>{fmt(totalCost)}</strong> <span className="text-xs ml-2">(<span className="text-amber-600">Overhead: {fmt(overheadCost)}</span> | <span className="text-blue-600">COGS: {fmt(cogsCost)}</span>)</span></p>
          </div>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Staff</Button>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(item.cost_category || 'overhead') === 'overhead' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {(item.cost_category || 'overhead') === 'overhead' ? 'Overhead' : 'COGS'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{fmt(item.salary)}</TableCell>
                      <TableCell className="text-right">{fmt(item.benefits_cost)}</TableCell>
                      <TableCell className="text-right">{fmt(item.taxes_cost)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt((item.salary || 0) + (item.benefits_cost || 0) + (item.taxes_cost || 0))}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Staff' : 'Add Staff'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Role</Label><Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <Label>Cost Category</Label>
                <Select value={form.cost_category} onValueChange={v => setForm({...form, cost_category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="cogs">Cost of Goods Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Salary ($)</Label><Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
              <div><Label>Benefits ($)</Label><Input type="number" value={form.benefits_cost} onChange={e => setForm({...form, benefits_cost: e.target.value})} /></div>
            </div>
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