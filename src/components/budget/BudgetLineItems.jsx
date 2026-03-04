import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save } from 'lucide-react';

export default function BudgetLineItems({ budget, onSave, isSaving, grossRevenue = 0 }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(budget?.line_items || []);
  }, [budget]);

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), category: '', description: '', amount: 0, type: 'overhead', period: 'annual' }]);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({ line_items: items.map(i => ({ ...i, amount: Number(i.amount) || 0 })) });
  };

  const fmt = (v) => `$${Number(v || 0).toLocaleString()}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>General Line Items</CardTitle>
          {items.length > 0 && (() => {
            const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
            return <p className="text-sm text-slate-500 mt-1">Total: <strong>${Number(totalAmount).toLocaleString()}</strong>{grossRevenue > 0 && <span className="text-xs ml-1 text-slate-400">({(totalAmount / grossRevenue * 100).toFixed(1)}% of revenue)</span>}</p>;
          })()}
        </div>
        <div className="flex gap-2">
          <Button onClick={addItem} size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
          <Button onClick={handleSave} size="sm" disabled={isSaving}><Save className="w-4 h-4 mr-1" /> {isSaving ? 'Saving...' : 'Save'}</Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No line items. Click "Add Item" to start.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount ($)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell>
                      <Input value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)} placeholder="e.g., Office Rent" className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Details..." className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Select value={item.type} onValueChange={v => updateItem(idx, 'type', v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="cogs">COGS</SelectItem>
                          <SelectItem value="overhead">Overhead</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} className="h-8 text-right" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="w-3 h-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}