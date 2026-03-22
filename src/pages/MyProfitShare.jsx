import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import MyQuarterlyScorecard from '../components/varcomp/MyQuarterlyScorecard';

export default function MyProfitShare() {
  const [user, setUser] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['myProfitSharePayouts', user?.id],
    queryFn: () => base44.entities.VarCompPayout.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const filtered = payouts.filter(p => p.fiscal_year === filterYear);
  const totalEarned = filtered.reduce((s, p) => s + (p.final_payout_amount || 0), 0);
  const totalPaid = filtered.filter(p => p.status === 'paid').reduce((s, p) => s + (p.final_payout_amount || 0), 0);
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  const statusColors = {
    projected: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-slate-100 text-slate-700',
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Profit Share</h1>
        <p className="text-slate-500 mt-1">Your variable compensation payouts</p>
      </div>

      <div className="flex items-center gap-3">
        <Label>Fiscal Year</Label>
        <Input type="number" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="w-28" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Earned</p>
              <p className="text-2xl font-bold">{fmt(totalEarned)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid Out</p>
              <p className="text-2xl font-bold">{fmt(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold">{fmt(totalEarned - totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly scorecard */}
      <MyQuarterlyScorecard userId={user?.id} filterYear={filterYear} />

      {/* Payouts table */}
      <Card>
        <CardHeader><CardTitle>Payout History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead className="text-right">Base Share</TableHead>
                  <TableHead className="text-right">Tenure</TableHead>
                  <TableHead className="text-right">Multiplier</TableHead>
                  <TableHead className="text-right">Final Payout</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">No payouts for FY {filterYear}</TableCell></TableRow>}
                {filtered.sort((a, b) => (a.quarter || 0) - (b.quarter || 0)).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.quarter ? `Q${p.quarter}` : 'Annual'}</TableCell>
                    <TableCell>{p.pool_name}</TableCell>
                    <TableCell className="text-right">{fmt(p.base_share_amount)}</TableCell>
                    <TableCell className="text-right">{p.tenure_years} yrs</TableCell>
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

      {!user.profit_sharing_eligible && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-center text-amber-700">
            You are currently not marked as eligible for profit sharing. Contact your administrator for details.
          </CardContent>
        </Card>
      )}
    </div>
  );
}