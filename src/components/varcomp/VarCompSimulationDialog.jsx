import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import SimUserEditor from './SimUserEditor';

export default function VarCompSimulationDialog({ open, onOpenChange, rule }) {
  const [revenue, setRevenue] = useState(5000000);
  const [npPercent, setNpPercent] = useState(15);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simUsers, setSimUsers] = useState([]);
  const [loadingReal, setLoadingReal] = useState(false);

  const loadRealUsers = async () => {
    setLoadingReal(true);
    const users = await base44.entities.User.list();
    setSimUsers(users.map(u => ({
      _simId: u.id,
      full_name: u.full_name,
      hire_date: u.hire_date || '',
      profit_sharing_pools: u.profit_sharing_pools || [],
      profit_sharing_eligible: u.profit_sharing_eligible || false,
    })));
    setLoadingReal(false);
  };

  const runSimulation = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('simulateProfitShare', {
      rule,
      seeded_np_percent: npPercent,
      seeded_revenue: revenue,
      simulated_users: simUsers,
    });
    setResult(response.data);
    setLoading(false);
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Simulate: {rule.rule_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seed inputs */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold mb-3">Seed Data</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Annual Revenue ($)</Label>
                <Input type="number" value={revenue} onChange={e => setRevenue(Number(e.target.value))} />
              </div>
              <div>
                <Label>Annual Net Profit %</Label>
                <Input type="number" step="0.1" value={npPercent} onChange={e => setNpPercent(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Sim Users */}
          <SimUserEditor
            simUsers={simUsers}
            setSimUsers={setSimUsers}
            onLoadReal={loadRealUsers}
            loadingReal={loadingReal}
          />

          <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white" onClick={runSimulation} disabled={loading}>
            <Play className="w-4 h-4 mr-2" /> {loading ? 'Running...' : 'Run Simulation'}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <Card className={result.gate_met ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="py-4 flex items-center gap-3">
                  {result.gate_met ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                  <div>
                    <p className="font-medium">{result.gate_met ? 'Payout Gate Met' : 'Payout Gate NOT Met'}</p>
                    <p className="text-sm text-slate-600">NP% {result.seeded_np_percent}% vs Gate {result.gate_value}%</p>
                  </div>
                </CardContent>
              </Card>

              {result.gate_met && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="py-3 text-center">
                      <p className="text-xs text-slate-500">Excess NP%</p>
                      <p className="text-lg font-bold">{result.excess_percent}%</p>
                    </CardContent></Card>
                    <Card><CardContent className="py-3 text-center">
                      <p className="text-xs text-slate-500">Excess Dollars</p>
                      <p className="text-lg font-bold">{fmt(result.excess_dollars)}</p>
                    </CardContent></Card>
                    <Card><CardContent className="py-3 text-center">
                      <p className="text-xs text-slate-500">Company Retains</p>
                      <p className="text-lg font-bold text-amber-600">{fmt(result.company_retention)}</p>
                    </CardContent></Card>
                    <Card><CardContent className="py-3 text-center">
                      <p className="text-xs text-slate-500">Distributable</p>
                      <p className="text-lg font-bold text-emerald-600">{fmt(result.distributable_amount)}</p>
                    </CardContent></Card>
                  </div>

                  {result.pool_breakdowns?.map((pool, idx) => (
                    <Card key={idx}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">{pool.pool_name}</h4>
                          <div className="text-sm text-slate-500">{pool.allocation_percent}% = {fmt(pool.pool_amount)} • {pool.eligible_count} people • {fmt(pool.base_share_per_person)}/person base</div>
                        </div>
                        {pool.payouts?.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead className="text-right">Tenure</TableHead>
                                <TableHead className="text-right">Multiplier</TableHead>
                                <TableHead className="text-right">Base Share</TableHead>
                                <TableHead className="text-right">Final Payout</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pool.payouts.map((p, pi) => (
                                <TableRow key={pi}>
                                  <TableCell className="font-medium">{p.user_name}</TableCell>
                                  <TableCell className="text-right">{p.tenure_years} yrs</TableCell>
                                  <TableCell className="text-right">{p.multiplier}x</TableCell>
                                  <TableCell className="text-right">{fmt(p.base_share)}</TableCell>
                                  <TableCell className="text-right font-semibold">{fmt(p.final_amount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-slate-400">No eligible employees in this pool</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="py-4 text-center">
                      <p className="text-sm text-slate-600">Total Employee Payouts</p>
                      <p className="text-2xl font-bold text-blue-700">{fmt(result.total_payout)}</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}