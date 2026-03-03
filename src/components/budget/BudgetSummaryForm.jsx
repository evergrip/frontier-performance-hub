import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export default function BudgetSummaryForm({ budget, onSave, isSaving }) {
  const [form, setForm] = useState({
    name: '',
    fiscal_year: '',
    description: '',
    net_profit_target_amount: '',
    net_profit_target_percentage: '',
    gross_revenue_projection: '',
    cost_of_goods_sold_projection: '',
  });

  useEffect(() => {
    if (budget) {
      setForm({
        name: budget.name || '',
        fiscal_year: budget.fiscal_year || '',
        description: budget.description || '',
        net_profit_target_amount: budget.net_profit_target_amount ?? '',
        net_profit_target_percentage: budget.net_profit_target_percentage ?? '',
        gross_revenue_projection: budget.gross_revenue_projection ?? '',
        cost_of_goods_sold_projection: budget.cost_of_goods_sold_projection ?? '',
      });
    }
  }, [budget]);

  const handleSave = () => {
    onSave({
      name: form.name,
      fiscal_year: Number(form.fiscal_year),
      description: form.description,
      net_profit_target_amount: form.net_profit_target_amount ? Number(form.net_profit_target_amount) : null,
      net_profit_target_percentage: form.net_profit_target_percentage ? Number(form.net_profit_target_percentage) : null,
      gross_revenue_projection: form.gross_revenue_projection ? Number(form.gross_revenue_projection) : null,
      cost_of_goods_sold_projection: form.cost_of_goods_sold_projection ? Number(form.cost_of_goods_sold_projection) : null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Summary & Targets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Budget Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Fiscal Year</Label>
            <Input type="number" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Gross Revenue Projection ($)</Label>
            <Input type="number" value={form.gross_revenue_projection} onChange={e => setForm({ ...form, gross_revenue_projection: e.target.value })} />
          </div>
          <div>
            <Label>COGS Projection ($)</Label>
            <Input type="number" value={form.cost_of_goods_sold_projection} onChange={e => setForm({ ...form, cost_of_goods_sold_projection: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Net Profit Target ($)</Label>
            <Input type="number" value={form.net_profit_target_amount} onChange={e => setForm({ ...form, net_profit_target_amount: e.target.value })} />
          </div>
          <div>
            <Label>Net Profit Target (%)</Label>
            <Input type="number" value={form.net_profit_target_percentage} onChange={e => setForm({ ...form, net_profit_target_percentage: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}