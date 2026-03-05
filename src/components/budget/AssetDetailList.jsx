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
import { Plus, Pencil, Trash2, Wrench, Package } from 'lucide-react';
import { toast } from 'sonner';
import BudgetPrefillDialog from './BudgetPrefillDialog';

const makeEmpty = (dept = '') => ({ name: '', type: 'equipment', purchase_cost: '', depreciation_method: 'straight_line', useful_life_years: '', salvage_value: '', monthly_maintenance_cost: '', department: dept, notes: '' });

export default function AssetDetailList({ budgetId, items, grossRevenue = 0, defaultDepartment = '' }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(makeEmpty(defaultDepartment));
  const [showPrefill, setShowPrefill] = useState(false);
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.AssetDetail.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets', budgetId] }); close(); toast.success('Asset added'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.AssetDetail.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets', budgetId] }); close(); toast.success('Asset updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.AssetDetail.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets', budgetId] }); toast.success('Asset removed'); },
  });

  const close = () => { setShowDialog(false); setEditing(null); setForm(makeEmpty(defaultDepartment)); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name || '', type: item.type || 'equipment', purchase_cost: item.purchase_cost ?? '', depreciation_method: item.depreciation_method || 'straight_line', useful_life_years: item.useful_life_years ?? '', salvage_value: item.salvage_value ?? '', monthly_maintenance_cost: item.monthly_maintenance_cost ?? '', department: item.department || '', notes: item.notes || '' }); setShowDialog(true); };

  const handleSave = () => {
    const data = { budget_id: budgetId, name: form.name, type: form.type, purchase_cost: Number(form.purchase_cost) || 0, depreciation_method: form.depreciation_method, useful_life_years: Number(form.useful_life_years) || 0, salvage_value: Number(form.salvage_value) || 0, monthly_maintenance_cost: Number(form.monthly_maintenance_cost) || 0, department: form.department || '', notes: form.notes };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const annualDepreciation = (a) => a.useful_life_years > 0 ? ((a.purchase_cost || 0) - (a.salvage_value || 0)) / a.useful_life_years : 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5" /> Assets</CardTitle>
            {items.length > 0 && (() => {
              const totalAnnual = items.reduce((s, a) => s + (a.monthly_maintenance_cost || 0) * 12 + (a.useful_life_years > 0 ? ((a.purchase_cost || 0) - (a.salvage_value || 0)) / a.useful_life_years : 0), 0);
              return <p className="text-sm text-slate-500 mt-1">Annual Total: <strong>{fmt(totalAnnual)}</strong>{grossRevenue > 0 && <span className="text-xs ml-1 text-slate-400">({(totalAnnual / grossRevenue * 100).toFixed(1)}% of revenue)</span>}</p>;
            })()}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowPrefill(true)} size="sm" variant="outline"><Package className="w-4 h-4 mr-1" /> Prefill</Button>
            <Button onClick={() => { setForm(makeEmpty(defaultDepartment)); setShowDialog(true); }} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Asset</Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No assets added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Purchase Cost</TableHead>
                    <TableHead className="text-right">Annual Depreciation</TableHead>
                    <TableHead className="text-right">Monthly Maintenance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{item.type?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">{fmt(item.purchase_cost)}</TableCell>
                      <TableCell className="text-right">{fmt(annualDepreciation(item))}</TableCell>
                      <TableCell className="text-right">{fmt(item.monthly_maintenance_cost)}</TableCell>
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
        category="assets"
        budgetId={budgetId}
        existingNames={items.map(i => i.name)}
        onBulkCreate={async (newItems) => {
          await base44.entities.AssetDetail.bulkCreate(newItems);
          qc.invalidateQueries({ queryKey: ['assets', budgetId] });
          toast.success(`${newItems.length} assets added`);
        }}
      />

      <Dialog open={showDialog} onOpenChange={close}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Asset' : 'Add Asset'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="software_license">Software License</SelectItem>
                    <SelectItem value="tools">Tools</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Useful Life (years)</Label><Input type="number" value={form.useful_life_years} onChange={e => setForm({...form, useful_life_years: e.target.value})} /></div>
              <div><Label>Salvage Value ($)</Label><Input type="number" value={form.salvage_value} onChange={e => setForm({...form, salvage_value: e.target.value})} /></div>
              <div><Label>Monthly Maintenance ($)</Label><Input type="number" value={form.monthly_maintenance_cost} onChange={e => setForm({...form, monthly_maintenance_cost: e.target.value})} /></div>
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