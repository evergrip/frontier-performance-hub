import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, TrendingUp, DollarSign, Clock, ArrowUpCircle, History } from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/common/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Commissions() {
  const [user, setUser] = useState(null);
  const [balloonDialogOpen, setBalloonDialogOpen] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: commissionBank, isLoading: bankLoading } = useQuery({
    queryKey: ['commissionBank', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const banks = await base44.entities.CommissionBank.filter({ user_id: user.id });
      return banks && banks.length > 0 ? banks[0] : null;
    },
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['commissionTransactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.CommissionTransaction.filter({ user_id: user.id });
    },
    enabled: !!user,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['commissionPayouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.CommissionPayout.filter({ user_id: user.id });
    },
    enabled: !!user,
  });

  const requestBalloonMutation = useMutation({
    mutationFn: async ({ amount, notes }) => {
      const response = await base44.functions.invoke('processBalloonPayment', {
        user_id: user.id,
        requested_amount: parseFloat(amount),
        notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionPayouts'] });
      toast.success('Balloon payment request submitted for approval');
      setBalloonDialogOpen(false);
      setRequestedAmount('');
      setNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to request balloon payment');
    },
  });

  const handleBalloonRequest = () => {
    if (!requestedAmount || parseFloat(requestedAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    requestBalloonMutation.mutate({ amount: requestedAmount, notes });
  };

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const approvedPayouts = payouts.filter(p => p.status === 'approved' || p.status === 'paid');

  if (bankLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading commission data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Commissions</h1>
          <p className="text-slate-500 mt-1">Track your earnings and manage payouts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Commission Bank"
          value={`$${(commissionBank?.current_bank_balance || 0).toLocaleString()}`}
          icon={Wallet}
          subtitle="Available balance"
        />
        <StatCard
          title="Total Earned"
          value={`$${(commissionBank?.total_earned || 0).toLocaleString()}`}
          icon={TrendingUp}
          subtitle="Lifetime earnings"
        />
        <StatCard
          title="Quarterly Payout"
          value={`$${(commissionBank?.quarterly_payout_amount || 0).toLocaleString()}`}
          icon={Clock}
          subtitle="Per pay period"
        />
        <StatCard
          title="Total Paid Out"
          value={`$${(commissionBank?.total_paid_out || 0).toLocaleString()}`}
          icon={DollarSign}
          subtitle="All time"
        />
      </div>

      {/* Commission Tier Info */}
      {commissionBank && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-amber-500" />
              Current Performance Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{commissionBank.current_tier || 'Not Set'}</p>
                <p className="text-sm text-slate-500 mt-1">
                  YTD Sales Volume: ${(commissionBank.ytd_sales_volume || 0).toLocaleString()}
                </p>
              </div>
              <Dialog open={balloonDialogOpen} onOpenChange={setBalloonDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                    Request Balloon Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Balloon Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Available Balance</Label>
                      <p className="text-2xl font-bold text-slate-900">
                        ${(commissionBank?.current_bank_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Requested Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={requestedAmount}
                        onChange={(e) => setRequestedAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Reason (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Enter reason for balloon payment request..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleBalloonRequest}
                      disabled={requestBalloonMutation.isPending}
                      className="w-full bg-amber-500 hover:bg-amber-600"
                    >
                      {requestBalloonMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      {pendingPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg bg-amber-50">
                  <div>
                    <p className="font-medium text-slate-900">${payout.amount.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">
                      Requested {format(new Date(payout.request_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    Pending Approval
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(new Date(transaction.created_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="capitalize">{transaction.transaction_type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    {transaction.phase_name && `Phase: ${transaction.phase_name}`}
                    {transaction.tier_at_time && ` (${transaction.tier_at_time})`}
                  </TableCell>
                  <TableCell className="font-medium">${transaction.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.status === 'banked' ? 'default' : 'secondary'}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    No transactions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout History */}
      {approvedPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{format(new Date(payout.payout_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="capitalize">{payout.payout_type.replace('_', ' ')}</TableCell>
                    <TableCell className="font-medium">${payout.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                        {payout.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}