import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, TrendingUp, DollarSign, Clock, ArrowUpCircle, History, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/common/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Commissions() {
  const [user, setUser] = useState(null);
  const [balloonDialogOpen, setBalloonDialogOpen] = useState(false);
  const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionPeriod, setTransactionPeriod] = useState('current_fiscal_year');
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

  const { data: commissionRule } = useQuery({
    queryKey: ['commissionRule', commissionBank?.commission_rule_id],
    queryFn: async () => {
      if (!commissionBank?.commission_rule_id) return null;
      return await base44.entities.CommissionRule.get(commissionBank.commission_rule_id);
    },
    enabled: !!commissionBank?.commission_rule_id,
  });

  const { data: companySettings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings && settings.length > 0 ? settings[0] : null;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['commissionTransactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.CommissionTransaction.filter({ user_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const getFiscalYearStart = (fiscalStartMonth = 1) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    if (currentMonth >= fiscalStartMonth) {
      return new Date(currentYear, fiscalStartMonth - 1, 1);
    } else {
      return new Date(currentYear - 1, fiscalStartMonth - 1, 1);
    }
  };

  const getFilteredTransactions = () => {
    const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
    const fiscalYearStart = getFiscalYearStart(fiscalStartMonth);
    const today = new Date();
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.created_date);
      
      switch (transactionPeriod) {
        case 'current_fiscal_year':
          return transactionDate >= fiscalYearStart;
        case 'last_30_days':
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return transactionDate >= thirtyDaysAgo;
        case 'last_90_days':
          const ninetyDaysAgo = new Date(today);
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          return transactionDate >= ninetyDaysAgo;
        case 'last_year':
          const oneYearAgo = new Date(today);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return transactionDate >= oneYearAgo;
        case 'all_time':
          return true;
        default:
          return transactionDate >= fiscalYearStart;
      }
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate YTD sales by type for current fiscal year
  const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
  const fiscalYearStart = getFiscalYearStart(fiscalStartMonth);
  
  const ytdPreconSales = transactions
    .filter(t => 
      t.transaction_type === 'sale_commission' && 
      t.sale_type === 'preconstruction' &&
      new Date(t.created_date) >= fiscalYearStart
    )
    .reduce((sum, t) => sum + (t.sale_amount || 0), 0);

  const ytdConstructionSales = transactions
    .filter(t => 
      t.transaction_type === 'sale_commission' && 
      t.sale_type === 'construction' &&
      new Date(t.created_date) >= fiscalYearStart
    )
    .reduce((sum, t) => sum + (t.sale_amount || 0), 0);

  // Get construction-specific commission rule
  const { data: allRules = [] } = useQuery({
    queryKey: ['allCommissionRules', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const userDetails = await base44.entities.User.filter({ id: user.id });
      if (!userDetails[0]?.commission_rule_ids) return [];
      return await base44.entities.CommissionRule.filter({ 
        id: { $in: userDetails[0].commission_rule_ids }
      });
    },
    enabled: !!user,
  });

  // Find the construction rule for tier calculation (ignore precon-only rules)
  const constructionRule = allRules.find(rule => 
    rule.sale_type === 'construction' || rule.sale_type === 'both'
  );

  // Find current tier based on construction sales ONLY
  const currentTier = constructionRule?.tiers?.find(tier => 
    ytdConstructionSales >= tier.min_volume && 
    (!tier.max_volume || ytdConstructionSales < tier.max_volume)
  );

  const sortedTiers = constructionRule?.tiers ? [...constructionRule.tiers].sort((a, b) => a.min_volume - b.min_volume) : [];
  const currentTierIndex = sortedTiers.findIndex(t => t.tier_name === currentTier?.tier_name);
  const nextTier = currentTierIndex >= 0 && currentTierIndex < sortedTiers.length - 1 
    ? sortedTiers[currentTierIndex + 1] 
    : null;

  const progressToNextTier = nextTier 
    ? (ytdConstructionSales - (currentTier?.min_volume || 0)) / 
      (nextTier.min_volume - (currentTier?.min_volume || 0)) * 100
    : 100;

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

  const getSaleName = (saleId) => {
    const sale = sales.find(s => s.id === saleId);
    return sale ? `${sale.title} (${sale.sale_type})` : 'Unknown Sale';
  };

  const openTransactionDetail = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailOpen(true);
  };

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
          title="Available for Payout"
          value={`$${(commissionBank?.available_balance || 0).toLocaleString()}`}
          icon={DollarSign}
          subtitle="Ready to request"
        />
        <StatCard
          title="Banked (Not Available)"
          value={`$${(commissionBank?.current_bank_balance || 0).toLocaleString()}`}
          icon={Wallet}
          subtitle="Awaiting phase completion"
        />
        <StatCard
          title="Total Earned"
          value={`$${(commissionBank?.total_earned || 0).toLocaleString()}`}
          icon={TrendingUp}
          subtitle="Lifetime earnings"
        />
        <StatCard
          title="Total Paid Out"
          value={`$${(commissionBank?.total_paid_out || 0).toLocaleString()}`}
          icon={Clock}
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
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{commissionBank.current_tier || 'Not Set'}</p>
                    {currentTier && (
                      <p className="text-sm text-slate-500">
                        Commission Rate: {currentTier.commission_rate}%
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">YTD Pre-Construction</p>
                      <p className="text-lg font-bold text-blue-600">
                        ${ytdPreconSales.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">YTD Construction</p>
                      <p className="text-lg font-bold text-emerald-600">
                        ${ytdConstructionSales.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Total YTD Sales Volume</p>
                    <p className="text-xl font-bold text-slate-900">
                      ${(commissionBank.ytd_sales_volume || 0).toLocaleString()}
                    </p>
                  </div>

                  {nextTier && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-medium text-slate-600">
                          Progress to {nextTier.tier_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          ${(commissionBank.ytd_sales_volume || 0).toLocaleString()} / ${nextTier.min_volume.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-amber-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progressToNextTier, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        ${(nextTier.min_volume - (commissionBank.ytd_sales_volume || 0)).toLocaleString()} until next tier ({nextTier.commission_rate}%)
                      </p>
                    </div>
                  )}
                  {!nextTier && currentTier && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        🎉 You've reached the highest tier!
                      </p>
                    </div>
                  )}
                </div>
                
                <Dialog open={balloonDialogOpen} onOpenChange={setBalloonDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 ml-4">
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
                        <p className="text-2xl font-bold text-emerald-600">
                          ${(commissionBank?.available_balance || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          Banked (not yet available): ${(commissionBank?.current_bank_balance || 0).toLocaleString()}
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
            <Select value={transactionPeriod} onValueChange={setTransactionPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_fiscal_year">Current Fiscal Year</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sale/Project</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow 
                  key={transaction.id} 
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => openTransactionDetail(transaction)}
                >
                  <TableCell>{format(new Date(transaction.created_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="capitalize">{transaction.transaction_type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-xs">
                    {transaction.sale_id ? getSaleName(transaction.sale_id) : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
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
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    No transactions in this period
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

      {/* Transaction Detail Dialog */}
      <Dialog open={transactionDetailOpen} onOpenChange={setTransactionDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commission Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Transaction Date</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {format(new Date(selectedTransaction.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">
                      {selectedTransaction.transaction_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ${selectedTransaction.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <Badge variant={selectedTransaction.status === 'banked' ? 'default' : 'secondary'}>
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedTransaction.sale_id && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Sale Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Sale:</span>
                      <span className="text-sm font-medium text-slate-900">
                        {getSaleName(selectedTransaction.sale_id)}
                      </span>
                    </div>
                    {selectedTransaction.sale_amount && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Sale Amount:</span>
                        <span className="text-sm font-medium text-slate-900">
                          ${selectedTransaction.sale_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.commission_rate && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Commission Rate:</span>
                        <span className="text-sm font-medium text-slate-900">
                          {selectedTransaction.commission_rate}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selectedTransaction.banked_amount || selectedTransaction.immediate_payout_amount) && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Commission Breakdown</h4>
                  <div className="space-y-2">
                    {selectedTransaction.banked_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Banked:</span>
                        <span className="text-sm font-medium text-slate-900">
                          ${selectedTransaction.banked_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.immediate_payout_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Immediate Payout:</span>
                        <span className="text-sm font-medium text-slate-900">
                          ${selectedTransaction.immediate_payout_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.banking_percentage && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Banking Percentage:</span>
                        <span className="text-sm font-medium text-slate-900">
                          {selectedTransaction.banking_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTransaction.notes && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-1">Notes</h4>
                      <p className="text-xs text-slate-700">{selectedTransaction.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setTransactionDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}