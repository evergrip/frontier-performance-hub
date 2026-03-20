import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function NetProfitEntryTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ period_type: 'monthly', fiscal_year: new Date().getFullYear(), period_number: 1, total_revenue: 0, total_expenses: 0, net_profit_dollars: 0, net_profit_percent: 0, notes: '' });
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['netProfitEntries'],
    queryFn: () => base44.entities.NetProfitEntry.list('-fiscal_year'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NetProfitEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['netProfitEntries'] }); setFormOpen(false); toast.success('Entry saved'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NetProfitEntry.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['netProfitEntries'] }); setFormOpen(false); toast.success('Entry updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NetProfitEntry.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['netProfitEntries'] }); toast.success('Entry deleted'); },
  });

  const handleOpen = (entry) => {
    if (entry) {
      setEditing(entry);
      setForm({ ...entry });
    } else {
      setEditing(null);
      setForm({ period_type: 'monthly', fiscal_year: filterYear, period_number: 1, total_revenue: 0, total_expenses: 0, net_profit_dollars: 0, net_profit_percent: 0, notes: '' });
    }
    setFormOpen(true);
  };

  const handleSave = () => {
    const label = form.period_type === 'monthly' ? `${MONTHS[form.period_number - 1]} ${form.fiscal_year}` : form.period_type === 'quarterly' ? `Q${form.period_number} ${form.fiscal_year}` : `FY ${form.fiscal_year}`;
    const data = { ...form, period_label: label };
    if (editing) {
      const { id, created_date, updated_date, created_by, ...cleanData } = data;
      updateMutation.mutate({ id: editing.id, data: cleanData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRevenueExpenseChange = (field, value) => {
    const updated = { ...form, [field]: Number(value) };
    const rev = field === 'total_revenue' ? Number(value) : updated.total_revenue;
    const exp = field === 'total_expenses' ? Number(value) : updated.total_expenses;
    updated.net_profit_dollars = rev - exp;
    updated.net_profit_percent = rev > 0 ? Math.round(((rev - exp) / rev) * 10000) / 100 : 0;
    setForm(updated);
  };

  const filtered = entries.filter(e => e.fiscal_year === filterYear);
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label>Fiscal Year</Label>
          <Input type="number" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="w-28" />
        </div>
        <Button onClick={() => handleOpen(null)} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white"><Plus className="w-4 h-4 mr-2" /> New Entry</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>NP% Entries — FY {filterYear}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">NP%</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">No entries for FY {filterYear}</TableCell></TableRow>}
                {filtered.sort((a, b) => a.period_number - b.period_number).map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.period_label}</TableCell>
                    <TableCell className="text-right">{fmt(entry.total_revenue)}</TableCell>
                    <TableCell className="text-right">{fmt(entry.total_expenses)}</TableCell>
                    <TableCell className="text-right">{fmt(entry.net_profit_dollars)}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.net_profit_percent?.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(entry)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Entry' : 'New NP% Entry'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.period_type} onValueChange={v => setForm({ ...form, period_type: v, period_number: v === 'annual' ? 0 : 1 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fiscal Year</Label>
                <Input type="number" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: Number(e.target.value) })} />
              </div>
              {form.period_type !== 'annual' && (
                <div>
                  <Label>{form.period_type === 'monthly' ? 'Month' : 'Quarter'}</Label>
                  <Select value={String(form.period_number)} onValueChange={v => setForm({ ...form, period_number: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {form.period_type === 'monthly' ? MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>) : [1, 2, 3, 4].map(q => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Revenue ($)</Label>
                <Input type="number" value={form.total_revenue} onChange={e => handleRevenueExpenseChange('total_revenue', e.target.value)} />
              </div>
              <div>
                <Label>Total Expenses ($)</Label>
                <Input type="number" value={form.total_expenses} onChange={e => handleRevenueExpenseChange('total_expenses', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Net Profit ($)</Label>
                <Input value={fmt(form.net_profit_dollars)} disabled className="bg-slate-50" />
              </div>
              <div>
                <Label>Net Profit %</Label>
                <Input value={`${form.net_profit_percent?.toFixed(1)}%`} disabled className="bg-slate-50 font-semibold" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}