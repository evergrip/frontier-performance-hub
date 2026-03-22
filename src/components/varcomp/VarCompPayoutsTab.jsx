import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function VarCompPayoutsTab() {
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['varCompPayouts'],
    queryFn: () => base44.entities.VarCompPayout.list('-created_date'),
  });

  const filtered = payouts.filter(p => p.fiscal_year === filterYear);
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  const statusColors = {
    projected: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <Label>Fiscal Year</Label>
        <Input type="number" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="w-28" />
      </div>

      <Card>
        <CardHeader><CardTitle>Payouts — FY {filterYear}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead>Employee</TableHead>
                   <TableHead>Quarter</TableHead>
                   <TableHead>Pool</TableHead>
                   <TableHead className="text-right">Base Share</TableHead>
                   <TableHead className="text-right">Multiplier</TableHead>
                   <TableHead className="text-right">Final Payout</TableHead>
                   <TableHead>Status</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">No payouts for FY {filterYear}. Use the quarterly gate evaluation or simulation tool to generate payouts.</TableCell></TableRow>}
                {filtered.sort((a, b) => (a.quarter || 0) - (b.quarter || 0)).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.user_name}</TableCell>
                    <TableCell>{p.quarter ? `Q${p.quarter}` : 'Annual'}</TableCell>
                    <TableCell>{p.pool_name}</TableCell>
                    <TableCell className="text-right">{fmt(p.base_share_amount)}</TableCell>
                    <TableCell className="text-right">{p.tenure_multiplier}x</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(p.final_payout_amount)}</TableCell>
                    <TableCell><Badge className={statusColors[p.status]}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}