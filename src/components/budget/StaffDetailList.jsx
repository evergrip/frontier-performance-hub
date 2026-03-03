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

const EMPTY = { name: '', role: '', salary: '', benefits_cost: '', taxes_cost: '', department: '', employment_type: 'full_time', notes: '' };

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
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name || '', role: item.role || '', salary: item.salary ?? '', benefits_cost: item.benefits_cost ?? '', taxes_cost: item.taxes_cost ?? '', department: item.department || '', employment_type: item.employment_type || 'full_time', notes: item.notes || '' }); setShowDialog(true); };
  const openCreate = () => { setForm(EMPTY); setShowDialog(true); };

  const handleSave = () => {
    const data = { budget_id: budgetId, name: form.name, role: form.role, salary: Number(form.salary) || 0, benefits_cost: Number(form.benefits_cost) || 0, taxes_cost: Number(form.taxes_cost) || 0, department: form.department, employment_type: form.employment_type, notes: form.notes };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const totalCost = items.reduce((s, i) => s + (i.salary || 0) + (i.benefits_cost || 0) + (i.taxes_cost || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Staff Details</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Total annual cost: <strong>{fmt(totalCost)}</strong></p>
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
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="text-right">Benefits</TableHead>
                    <TableHead className="text-right">Taxes</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.role || '—'}</TableCell>
                      <TableCell>{item.department || '—'}</TableCell>
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
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Salary ($)</Label><Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
              <div><Label>Benefits ($)</Label><Input type="number" value={form.benefits_cost} onChange={e => setForm({...form, benefits_cost: e.target.value})} /></div>
              <div><Label>Taxes ($)</Label><Input type="number" value={form.taxes_cost} onChange={e => setForm({...form, taxes_cost: e.target.value})} /></div>
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