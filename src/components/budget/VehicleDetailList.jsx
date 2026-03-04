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
import { Plus, Pencil, Trash2, Car } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { make: '', model: '', year: '', purchase_cost: '', depreciation_method: 'straight_line', useful_life_years: '', salvage_value: '', monthly_insurance_cost: '', monthly_fuel_cost: '', monthly_maintenance_cost: '', notes: '' };

export default function VehicleDetailList({ budgetId, items, grossRevenue = 0 }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.VehicleDetail.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles', budgetId] }); close(); toast.success('Vehicle added'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.VehicleDetail.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles', budgetId] }); close(); toast.success('Vehicle updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.VehicleDetail.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles', budgetId] }); toast.success('Vehicle removed'); },
  });

  const close = () => { setShowDialog(false); setEditing(null); setForm(EMPTY); };
  const openEdit = (item) => { setEditing(item); setForm({ make: item.make || '', model: item.model || '', year: item.year ?? '', purchase_cost: item.purchase_cost ?? '', depreciation_method: item.depreciation_method || 'straight_line', useful_life_years: item.useful_life_years ?? '', salvage_value: item.salvage_value ?? '', monthly_insurance_cost: item.monthly_insurance_cost ?? '', monthly_fuel_cost: item.monthly_fuel_cost ?? '', monthly_maintenance_cost: item.monthly_maintenance_cost ?? '', notes: item.notes || '' }); setShowDialog(true); };

  const handleSave = () => {
    const data = { budget_id: budgetId, make: form.make, model: form.model, year: Number(form.year) || null, purchase_cost: Number(form.purchase_cost) || 0, depreciation_method: form.depreciation_method, useful_life_years: Number(form.useful_life_years) || 0, salvage_value: Number(form.salvage_value) || 0, monthly_insurance_cost: Number(form.monthly_insurance_cost) || 0, monthly_fuel_cost: Number(form.monthly_fuel_cost) || 0, monthly_maintenance_cost: Number(form.monthly_maintenance_cost) || 0, notes: form.notes };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const monthlyTotal = (v) => (v.monthly_insurance_cost || 0) + (v.monthly_fuel_cost || 0) + (v.monthly_maintenance_cost || 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> Vehicles</CardTitle>
            {items.length > 0 && (() => {
              const totalAnnual = items.reduce((s, v) => s + ((v.monthly_insurance_cost || 0) + (v.monthly_fuel_cost || 0) + (v.monthly_maintenance_cost || 0)) * 12 + (v.useful_life_years > 0 ? ((v.purchase_cost || 0) - (v.salvage_value || 0)) / v.useful_life_years : 0), 0);
              return <p className="text-sm text-slate-500 mt-1">Annual Total: <strong>${Number(totalAnnual).toLocaleString()}</strong>{grossRevenue > 0 && <span className="text-xs ml-1 text-slate-400">({(totalAnnual / grossRevenue * 100).toFixed(1)}% of revenue)</span>}</p>;
            })()}
          </div>
          <Button onClick={() => { setForm(EMPTY); setShowDialog(true); }} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Vehicle</Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No vehicles added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Purchase Cost</TableHead>
                    <TableHead className="text-right">Monthly Operating</TableHead>
                    <TableHead className="text-right">Annual Operating</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.year ? `${item.year} ` : ''}{item.make} {item.model}</TableCell>
                      <TableCell className="text-right">{fmt(item.purchase_cost)}</TableCell>
                      <TableCell className="text-right">{fmt(monthlyTotal(item))}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(monthlyTotal(item) * 12)}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Make</Label><Input value={form.make} onChange={e => setForm({...form, make: e.target.value})} /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={e => setForm({...form, model: e.target.value})} /></div>
              <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Purchase Cost ($)</Label><Input type="number" value={form.purchase_cost} onChange={e => setForm({...form, purchase_cost: e.target.value})} /></div>
              <div>
                <Label>Depreciation Method</Label>
                <Select value={form.depreciation_method} onValueChange={v => setForm({...form, depreciation_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight Line</SelectItem>
                    <SelectItem value="declining_balance">Declining Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Useful Life (years)</Label><Input type="number" value={form.useful_life_years} onChange={e => setForm({...form, useful_life_years: e.target.value})} /></div>
              <div><Label>Salvage Value ($)</Label><Input type="number" value={form.salvage_value} onChange={e => setForm({...form, salvage_value: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Monthly Insurance ($)</Label><Input type="number" value={form.monthly_insurance_cost} onChange={e => setForm({...form, monthly_insurance_cost: e.target.value})} /></div>
              <div><Label>Monthly Fuel ($)</Label><Input type="number" value={form.monthly_fuel_cost} onChange={e => setForm({...form, monthly_fuel_cost: e.target.value})} /></div>
              <div><Label>Monthly Maintenance ($)</Label><Input type="number" value={form.monthly_maintenance_cost} onChange={e => setForm({...form, monthly_maintenance_cost: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.make || !form.model || createMut.isPending || updateMut.isPending}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}