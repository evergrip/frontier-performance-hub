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
import { Wallet, TrendingUp, DollarSign, Clock, ArrowUpCircle, History, AlertCircle, Edit2, Users, Plus, FileText } from 'lucide-react';
import CommissionChangeLogDialog from '@/components/commissions/CommissionChangeLogDialog';
import AddCommissionTransactionForm from '@/components/commissions/AddCommissionTransactionForm';
import ExportCSVButton from '@/components/commissions/ExportCSVButton';
import { toast } from 'sonner';
import StatCard from '@/components/common/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getFiscalYearDates } from '../components/utils/fiscalYear';

export default function Commissions() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('current_user');
  const [balloonDialogOpen, setBalloonDialogOpen] = useState(false);
  const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);
  const [editTransactionOpen, setEditTransactionOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editNote, setEditNote] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionPeriod, setTransactionPeriod] = useState('current_fiscal_year');
  const [changeLogOpen, setChangeLogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser?.role === 'admin');
    };
    loadUser();
  }, []);

  // Fetch all users for admin view
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  // Determine which user's data to display
  const displayUserId = selectedUserId === 'current_user' ? user?.id : (selectedUserId === 'all' ? null : selectedUserId);
  const displayUser = selectedUserId === 'current_user' ? user : allUsers.find(u => u.id === selectedUserId);
  const isCompanyWide = selectedUserId === 'all';

  const { data: commissionBank, isLoading: bankLoading } = useQuery({
    queryKey: ['commissionBank', displayUserId, isCompanyWide],
    queryFn: async () => {
      if (isCompanyWide) {
        // Fetch all commission banks for company-wide view
        const allBanks = await base44.entities.CommissionBank.list();
        // Aggregate totals
        return {
          total_earned: allBanks.reduce((sum, b) => sum + (b.total_earned || 0), 0),
          current_bank_balance: allBanks.reduce((sum, b) => sum + (b.current_bank_balance || 0), 0),
          available_balance: allBanks.reduce((sum, b) => sum + (b.available_balance || 0), 0),
          total_paid_out: allBanks.reduce((sum, b) => sum + (b.total_paid_out || 0), 0),
          ytd_sales_volume: allBanks.reduce((sum, b) => sum + (b.ytd_sales_volume || 0), 0),
          ytd_construction_volume: allBanks.reduce((sum, b) => sum + (b.ytd_construction_volume || 0), 0),
          ytd_preconstruction_volume: allBanks.reduce((sum, b) => sum + (b.ytd_preconstruction_volume || 0), 0),
          isAggregate: true
        };
      }
      if (!displayUserId) return null;
      const banks = await base44.entities.CommissionBank.filter({ user_id: displayUserId });
      return banks && banks.length > 0 ? banks[0] : null;
    },
    enabled: isCompanyWide || !!displayUserId,
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
    queryKey: ['commissionTransactions', displayUserId, isCompanyWide],
    queryFn: async () => {
      if (isCompanyWide) {
        // Fetch all transactions for company-wide view
        return await base44.entities.CommissionTransaction.list('-created_date');
      }
      if (!displayUserId) return [];
      return await base44.entities.CommissionTransaction.filter({ user_id: displayUserId }, '-created_date');
    },
    enabled: isCompanyWide || !!displayUserId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: [],
  });

  const getFilteredTransactions = () => {
    const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    // Determine the current fiscal year (year in which it ends)
    const currentFiscalYear = fiscalStartMonth === 1 ? currentYear : (currentMonth >= fiscalStartMonth ? currentYear + 1 : currentYear);
    const { startDate: fiscalYearStart } = getFiscalYearDates(currentFiscalYear, fiscalStartMonth);
    
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

  // Calculate the commission anniversary window based on the user's commission_start_date
  const commissionStartDateStr = displayUser?.commission_start_date;
  const commissionYearStart = (() => {
    if (!commissionStartDateStr) {
      // Fallback to fiscal year if no commission_start_date
      const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
      const now = new Date();
      const cm = now.getMonth() + 1;
      const cy = now.getFullYear();
      const cfy = fiscalStartMonth === 1 ? cy : (cm >= fiscalStartMonth ? cy + 1 : cy);
      return getFiscalYearDates(cfy, fiscalStartMonth).startDate;
    }
    const start = new Date(commissionStartDateStr);
    const now = new Date();
    // Find the most recent anniversary date
    const anniversaryThisYear = new Date(now.getFullYear(), start.getMonth(), start.getDate());
    if (anniversaryThisYear <= now) {
      return anniversaryThisYear;
    } else {
      return new Date(now.getFullYear() - 1, start.getMonth(), start.getDate());
    }
  })();
  
  const ytdPreconSales = transactions
    .filter(t => 
      t.transaction_type === 'sale_commission' && 
      t.sale_type === 'preconstruction' &&
      new Date(t.created_date) >= commissionYearStart &&
      (!displayUserId || t.user_id === displayUserId)
    )
    .reduce((sum, t) => sum + (t.sale_amount || 0), 0);

  const ytdConstructionSales = transactions
    .filter(t => 
      t.transaction_type === 'sale_commission' && 
      t.sale_type === 'construction' &&
      new Date(t.created_date) >= commissionYearStart &&
      (!displayUserId || t.user_id === displayUserId)
    )
    .reduce((sum, t) => sum + (t.sale_amount || 0), 0);

  // Get construction-specific commission rule
  const { data: allRules = [] } = useQuery({
    queryKey: ['allCommissionRules', displayUserId],
    queryFn: async () => {
      if (!displayUserId) return [];
      const userDetails = await base44.entities.User.filter({ id: displayUserId });
      if (!userDetails[0]?.commission_rule_ids) return [];
      return await base44.entities.CommissionRule.filter({ 
        id: { $in: userDetails[0].commission_rule_ids }
      });
    },
    enabled: !!displayUserId,
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
    ? ((ytdConstructionSales - (currentTier?.min_volume || 0)) / 
      (nextTier.min_volume - (currentTier?.min_volume || 0)) * 100)
    : (currentTier ? 100 : 0);

  // Clamp progress: if ytdConstructionSales is below current tier min (e.g. after reset), show 0
  const clampedProgress = Math.max(0, Math.min(progressToNextTier, 100));

  const { data: payouts = [] } = useQuery({
    queryKey: ['commissionPayouts', displayUserId, isCompanyWide],
    queryFn: async () => {
      if (isCompanyWide) {
        // Fetch all payouts for company-wide view
        return await base44.entities.CommissionPayout.list();
      }
      if (!displayUserId) return [];
      return await base44.entities.CommissionPayout.filter({ user_id: displayUserId });
    },
    enabled: isCompanyWide || !!displayUserId,
  });

  const requestBalloonMutation = useMutation({
    mutationFn: async ({ amount, notes }) => {
      const payload = {
        requested_amount: parseFloat(amount),
        notes
      };
      // If admin is viewing another user, pass their user_id
      if (isAdmin && displayUserId && displayUserId !== user?.id) {
        payload.user_id = displayUserId;
      }
      const response = await base44.functions.invoke('processBalloonPayment', payload);
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

  const getSaleName = (saleId, transactionSaleType) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return 'Unknown Sale';
    const displayType = transactionSaleType || sale.sale_type;
    return `${sale.title} (${displayType})`;
  };

  const openTransactionDetail = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailOpen(true);
  };

  const openEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setEditFormData({
      amount: transaction.amount,
      sale_amount: transaction.sale_amount || 0,
      user_id: transaction.user_id,
      status: transaction.status,
      created_date: transaction.created_date ? format(new Date(transaction.created_date), 'yyyy-MM-dd') : '',
    });
    setEditNote('');
    setEditTransactionOpen(true);
  };

  const editTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, updates, note }) => {
      const response = await base44.functions.invoke('editCommissionTransaction', {
        transaction_id: transactionId,
        updates,
        note,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['commissionBank'] });
      toast.success('Transaction updated and commission banks recalculated');
      setEditTransactionOpen(false);
      setEditNote('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update transaction');
    },
  });

  const handleEditTransaction = () => {
    if (!editNote.trim()) {
      toast.error('Please provide a note explaining the changes');
      return;
    }

    const updates = {};
    if (editFormData.amount !== selectedTransaction.amount) {
      updates.amount = parseFloat(editFormData.amount);
    }
    if (editFormData.sale_amount !== selectedTransaction.sale_amount) {
      updates.sale_amount = parseFloat(editFormData.sale_amount);
    }
    if (editFormData.user_id !== selectedTransaction.user_id) {
      updates.user_id = editFormData.user_id;
    }
    if (editFormData.status !== selectedTransaction.status) {
      updates.status = editFormData.status;
    }
    if (editFormData.created_date && editFormData.created_date !== format(new Date(selectedTransaction.created_date), 'yyyy-MM-dd')) {
      updates.created_date = new Date(editFormData.created_date).toISOString();
    }

    if (Object.keys(updates).length === 0) {
      toast.error('No changes detected');
      return;
    }

    editTransactionMutation.mutate({
      transactionId: selectedTransaction.id,
      updates,
      note: editNote,
    });
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
      <div className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isAdmin ? 'Commission Management' : 'My Commissions'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isAdmin ? 'View and manage all commission data' : 'Track your earnings and manage payouts'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <AddCommissionTransactionForm allUsers={allUsers} />
              <Users className="w-5 h-5 text-slate-400" />
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_user">My Commissions</SelectItem>
                  <SelectItem value="all">Company-Wide</SelectItem>
                  {allUsers
                    .filter(u => u.commission_rule_ids?.length > 0)
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => setChangeLogOpen(true)} className="gap-2">
          <FileText className="w-4 h-4" /> View Change Log
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Available for Payout"
          value={`$${Math.round(commissionBank?.available_balance || 0).toLocaleString()}`}
          icon={DollarSign}
          subtitle="Ready to request"
        />
        <StatCard
          title="Banked (Not Available)"
          value={`$${Math.round(commissionBank?.current_bank_balance || 0).toLocaleString()}`}
          icon={Wallet}
          subtitle="Awaiting phase completion"
        />
        <StatCard
          title="Total Earned"
          value={`$${Math.round(commissionBank?.total_earned || 0).toLocaleString()}`}
          icon={TrendingUp}
          subtitle="Lifetime earnings"
        />
        <StatCard
          title="Total Paid Out"
          value={`$${Math.round(commissionBank?.total_paid_out || 0).toLocaleString()}`}
          icon={Clock}
          subtitle="All time"
        />
      </div>

      {/* Commission Tier Info */}
      {commissionBank && !commissionBank.isAggregate && (
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
                    <p className="text-2xl font-bold text-slate-900">{currentTier?.tier_name || commissionBank.current_tier || 'Not Set'}</p>
                    {currentTier && (
                      <p className="text-sm text-slate-500">
                        Commission Rate: {currentTier.commission_rate}%
                      </p>
                    )}
                  </div>
                  
                  {commissionStartDateStr && (
                    <p className="text-xs text-slate-500">
                      Commission year: {commissionYearStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — present
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Pre-Construction (This Year)</p>
                      <p className="text-lg font-bold text-blue-600">
                        ${ytdPreconSales.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Construction (This Year)</p>
                      <p className="text-lg font-bold text-emerald-600">
                        ${ytdConstructionSales.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Construction (Tier Calc — This Year)</p>
                    <p className="text-xl font-bold text-slate-900">
                      ${ytdConstructionSales.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Total this year (all sales): ${(ytdPreconSales + ytdConstructionSales).toLocaleString()}
                    </p>
                  </div>

                  {nextTier && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-medium text-slate-600">
                          Progress to {nextTier.tier_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          ${ytdConstructionSales.toLocaleString()} / ${nextTier.min_volume.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-amber-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${clampedProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        ${(nextTier.min_volume - ytdConstructionSales).toLocaleString()} until next tier ({nextTier.commission_rate}%)
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

                  {(() => {
                    const startDateStr = displayUser?.commission_start_date;
                    if (!startDateStr) return (
                      <div className="p-3 bg-slate-100 rounded-lg text-center">
                        <p className="text-xs text-slate-500">Commission start date not set</p>
                      </div>
                    );
                    const start = new Date(startDateStr);
                    const now = new Date();
                    // Next anniversary of commission_start_date
                    const resetDate = new Date(now.getFullYear(), start.getMonth(), start.getDate());
                    if (resetDate <= now) resetDate.setFullYear(resetDate.getFullYear() + 1);
                    const daysLeft = Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24));
                    return (
                      <div className="p-3 bg-slate-100 rounded-lg text-center">
                        <p className="text-sm text-slate-700 font-medium">
                          ⏱ <span className="font-bold text-slate-900">{daysLeft}</span> days until tier reset
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tiers reset {resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    );
                  })()}
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
                          ${Math.round(commissionBank?.available_balance || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          Banked (not yet available): ${Math.round(commissionBank?.current_bank_balance || 0).toLocaleString()}
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

      {/* Pipeline Revenue */}
      {!isCompanyWide && displayUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              My Pipeline Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Leads assigned to this user (not converted/disqualified)
              const myLeads = leads.filter(l => l.assigned_to === displayUserId && l.status !== 'converted' && l.status !== 'disqualified');
              const leadPreconRevenue = myLeads.reduce((s, l) => s + (l.estimated_precon_value || 0), 0);
              const leadConstructionRevenue = myLeads.reduce((s, l) => s + (l.estimated_construction_value || 0), 0);
              const leadTotal = leadPreconRevenue + leadConstructionRevenue;

              // Active precon sales assigned to this user OR where they are a contributor (not closed)
              const isUserOnSale = (s) => s.assigned_to === displayUserId || (s.sale_contributors || []).some(c => c.user_id === displayUserId);
              const myPreconSales = sales.filter(s => isUserOnSale(s) && s.sale_type === 'preconstruction' && s.status !== 'closed_won' && s.status !== 'closed_lost');
              const preconRevenue = myPreconSales.reduce((s, sale) => s + (sale.contract_value || 0), 0);

              // Active construction sales assigned to this user OR where they are a contributor (not closed)
              const myConstructionSales = sales.filter(s => isUserOnSale(s) && s.sale_type === 'construction' && s.status !== 'closed_won' && s.status !== 'closed_lost');
              const constructionRevenue = myConstructionSales.reduce((s, sale) => s + (sale.contract_value || 0), 0);

              const totalPipeline = leadTotal + preconRevenue + constructionRevenue;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Leads ({myLeads.length})</p>
                      <p className="text-lg font-bold text-purple-600">${leadTotal.toLocaleString()}</p>
                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        <p>Precon: ${leadPreconRevenue.toLocaleString()}</p>
                        <p>Construction: ${leadConstructionRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Pre-Construction ({myPreconSales.length})</p>
                      <p className="text-lg font-bold text-blue-600">${preconRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Construction ({myConstructionSales.length})</p>
                      <p className="text-lg font-bold text-emerald-600">${constructionRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Total Pipeline Revenue</p>
                    <p className="text-xl font-bold text-slate-900">${totalPipeline.toLocaleString()}</p>
                  </div>
                </div>
              );
            })()}
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
                    <p className="font-medium text-slate-900">${Math.round(payout.amount).toLocaleString()}</p>
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
            <div className="flex items-center gap-2">
              <ExportCSVButton
                data={filteredTransactions}
                filename="commission_transactions"
                columns={[
                  { header: 'Date', accessor: (t) => format(new Date(t.created_date), 'yyyy-MM-dd') },
                  { header: 'Type', accessor: (t) => t.transaction_type?.replace('_', ' ') },
                  { header: 'Sale/Project', accessor: (t) => t.sale_id ? getSaleName(t.sale_id, t.sale_type) : '' },
                  { header: 'Sale Value', accessor: (t) => t.sale_amount || '' },
                  { header: 'Phase', accessor: (t) => t.phase_name || '' },
                  { header: 'Tier', accessor: (t) => t.tier_at_time || '' },
                  { header: 'Commission Amount', accessor: (t) => t.amount },
                  { header: 'Status', accessor: (t) => t.status },
                  { header: 'Banked Amount', accessor: (t) => t.banked_amount || '' },
                  { header: 'Immediate Payout', accessor: (t) => t.immediate_payout_amount || '' },
                  { header: 'Notes', accessor: (t) => t.notes || '' },
                ]}
              />
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sale/Project</TableHead>
                <TableHead>Sale Value</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Edit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow 
                  key={transaction.id} 
                  className="hover:bg-slate-50"
                >
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    {format(new Date(transaction.created_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell 
                    className="capitalize cursor-pointer"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    {transaction.transaction_type.replace('_', ' ')}
                  </TableCell>
                  <TableCell 
                    className="text-xs cursor-pointer"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    {transaction.sale_id ? getSaleName(transaction.sale_id, transaction.sale_type) : '-'}
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    {transaction.sale_amount ? `$${Math.round(transaction.sale_amount).toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell 
                    className="text-xs cursor-pointer"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    {transaction.phase_name && `Phase: ${transaction.phase_name}`}
                    {transaction.tier_at_time && ` (${transaction.tier_at_time})`}
                  </TableCell>
                  <TableCell 
                    className="font-medium cursor-pointer"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    ${Math.round(transaction.amount).toLocaleString()}
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    <Badge variant={transaction.status === 'banked' ? 'default' : 'secondary'}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTransaction(transaction);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-slate-500 py-8">
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
                    <TableCell className="font-medium">${Math.round(payout.amount).toLocaleString()}</TableCell>
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

      {/* Edit Transaction Dialog (Admin Only) */}
      {isAdmin && (
        <Dialog open={editTransactionOpen} onOpenChange={setEditTransactionOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Commission Transaction</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salesperson</Label>
                    <Select 
                      value={editFormData.user_id} 
                      onValueChange={(value) => setEditFormData({ ...editFormData, user_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers
                          .filter(u => u.commission_rule_ids?.length > 0)
                          .map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction Date</Label>
                    <Input
                      type="date"
                      value={editFormData.created_date}
                      onChange={(e) => setEditFormData({ ...editFormData, created_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Commission Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sale Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editFormData.sale_amount}
                      onChange={(e) => setEditFormData({ ...editFormData, sale_amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="banked">Banked</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Note (Explanation of Changes) *</Label>
                  <Textarea
                    placeholder="Explain why this transaction is being edited..."
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    ⚠️ All changes will be permanently logged with your name, timestamp, and this note.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditTransactionOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleEditTransaction}
                    disabled={editTransactionMutation.isPending}
                  >
                    {editTransactionMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Commission Change Log Dialog */}
      <CommissionChangeLogDialog
        open={changeLogOpen}
        onOpenChange={setChangeLogOpen}
        userId={displayUserId}
        userName={isCompanyWide ? 'Company-Wide' : (displayUser?.full_name || user?.full_name)}
        sales={sales}
      />

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
                      ${Math.round(selectedTransaction.amount).toLocaleString()}
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
                        {getSaleName(selectedTransaction.sale_id, selectedTransaction.sale_type)}
                      </span>
                    </div>
                    {selectedTransaction.sale_amount && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Sale Amount:</span>
                        <span className="text-sm font-medium text-slate-900">
                          ${Math.round(selectedTransaction.sale_amount).toLocaleString()}
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
                          ${Math.round(selectedTransaction.banked_amount).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.immediate_payout_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Immediate Payout:</span>
                        <span className="text-sm font-medium text-slate-900">
                          ${Math.round(selectedTransaction.immediate_payout_amount).toLocaleString()}
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

              {selectedTransaction.audit_log && selectedTransaction.audit_log.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Audit Log</h4>
                  <div className="space-y-3">
                    {selectedTransaction.audit_log.map((entry, idx) => (
                      <div key={idx} className="text-xs border-l-2 border-slate-300 pl-3 py-1">
                        <p className="font-medium text-slate-900">
                          {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')} - {entry.edited_by}
                        </p>
                        <p className="text-slate-600 mt-1">Changes: {entry.changes}</p>
                        <p className="text-slate-700 mt-1 italic">Note: {entry.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 gap-2">
                {isAdmin && (
                  <Button 
                    variant="default"
                    onClick={() => {
                      setTransactionDetailOpen(false);
                      openEditTransaction(selectedTransaction);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Transaction
                  </Button>
                )}
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