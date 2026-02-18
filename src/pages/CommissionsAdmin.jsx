import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertCircle, Users, DollarSign, TrendingUp, Clock, Plus } from 'lucide-react';
import ExportCSVButton from '@/components/commissions/ExportCSVButton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StatCard from '@/components/common/StatCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CommissionsAdmin() {
  const [user, setUser] = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [legacySales, setLegacySales] = useState([
    { id: 0, lead_name: '', sale_date: '', sale_amount: '', commission_amount: '', salesperson_id: '' }
  ]);
  const [nextId, setNextId] = useState(1);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [releaseAmount, setReleaseAmount] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user]);

  const { data: allBanks = [], isLoading: banksLoading } = useQuery({
    queryKey: ['allCommissionBanks'],
    queryFn: () => base44.entities.CommissionBank.filter({}),
  });

  const { data: allPayouts = [] } = useQuery({
    queryKey: ['allPayouts'],
    queryFn: () => base44.entities.CommissionPayout.filter({}),
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['allTransactions'],
    queryFn: () => base44.entities.CommissionTransaction.filter({}),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.filter({}),
  });

  const { data: commissionRules = [] } = useQuery({
    queryKey: ['commissionRules'],
    queryFn: () => base44.entities.CommissionRule.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ payout_id, approve }) => {
      const response = await base44.functions.invoke('approveBalloonPayment', {
        payout_id,
        approve
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allPayouts'] });
      queryClient.invalidateQueries({ queryKey: ['allCommissionBanks'] });
      toast.success(variables.approve ? 'Balloon payment approved' : 'Balloon payment rejected');
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to process request');
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('recalculateQuarterlyPayouts', {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCommissionBanks'] });
      toast.success('Quarterly payouts recalculated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to recalculate payouts');
    },
  });

  const legacySaleMutation = useMutation({
    mutationFn: async (data) => {
      const results = [];
      for (const sale of data) {
        const result = await base44.functions.invoke('addLegacySale', sale);
        results.push(result.data);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCommissionBanks'] });
      queryClient.invalidateQueries({ queryKey: ['allTransactions'] });
      toast.success('Legacy sales added successfully');
      setLegacySales([{ id: 0, lead_name: '', sale_date: '', sale_amount: '', commission_amount: '', salesperson_id: '' }]);
      setNextId(1);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add legacy sales');
    },
  });

  const releaseCommissionMutation = useMutation({
    mutationFn: async ({ user_id, amount }) => {
      // Get the bank
      const banks = await base44.entities.CommissionBank.filter({ user_id });
      const bank = banks[0];
      
      if (!bank) throw new Error('Commission bank not found');
      
      const parsedAmount = parseFloat(amount);
      if (parsedAmount <= 0 || parsedAmount > bank.current_bank_balance) {
        throw new Error('Invalid amount');
      }

      // Create a transaction record
      await base44.entities.CommissionTransaction.create({
        user_id,
        transaction_type: 'adjustment',
        amount: 0,
        amount_made_available: parsedAmount,
        status: 'available',
        notes: 'Manual commission release by admin'
      });

      // Update the bank
      await base44.entities.CommissionBank.update(bank.id, {
        current_bank_balance: bank.current_bank_balance - parsedAmount,
        available_balance: (bank.available_balance || 0) + parsedAmount
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCommissionBanks'] });
      queryClient.invalidateQueries({ queryKey: ['allTransactions'] });
      toast.success('Commission released successfully');
      setReleaseDialogOpen(false);
      setSelectedBank(null);
      setReleaseAmount('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to release commission');
    },
  });

  const handleUpdateRow = (id, field, value) => {
    setLegacySales(legacySales.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleAddRow = () => {
    setLegacySales([
      ...legacySales,
      { id: nextId, lead_name: '', sale_date: '', sale_amount: '', commission_amount: '', salesperson_id: '' }
    ]);
    setNextId(nextId + 1);
  };

  const handleRemoveRow = (id) => {
    setLegacySales(legacySales.filter(row => row.id !== id));
  };

  const handleSubmitLegacySales = () => {
    const validRows = legacySales.filter(row => 
      row.lead_name && row.sale_date && row.sale_amount && row.commission_amount && row.salesperson_id
    );
    if (validRows.length === 0) {
      toast.error('Please fill in at least one complete row');
      return;
    }
    legacySaleMutation.mutate(validRows.map(row => ({
      lead_name: row.lead_name,
      sale_date: row.sale_date,
      sale_amount: parseFloat(row.sale_amount),
      commission_amount: parseFloat(row.commission_amount),
      salesperson_id: row.salesperson_id
    })));
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown';
  };

  const pendingPayouts = allPayouts.filter(p => p.status === 'pending');
  const totalBanked = allBanks.reduce((sum, bank) => sum + (bank.current_bank_balance || 0), 0);
  const totalEarned = allBanks.reduce((sum, bank) => sum + (bank.total_earned || 0), 0);
  const totalPaidOut = allBanks.reduce((sum, bank) => sum + (bank.total_paid_out || 0), 0);

  // Calculate pending phase releases
  const calculatePendingReleases = () => {
    const pendingReleases = [];
    
    projects.forEach(project => {
      if (!project.phases || project.phases.length === 0) return;
      
      project.phases.forEach(phase => {
        // Check if phase is completed but commission not processed
        if (phase.status === 'completed' && !phase.commission_processed) {
          const relatedSale = sales.find(s => s.id === project.sale_id);
          if (relatedSale && relatedSale.commission_transaction_ids) {
            const salesperson = users.find(u => u.id === relatedSale.assigned_to);
            pendingReleases.push({
              project_title: project.title,
              phase_name: phase.name,
              salesperson_name: salesperson?.full_name || 'Unknown',
              salesperson_id: relatedSale.assigned_to,
              project_id: project.id,
              sale_id: project.sale_id
            });
          }
        }
      });
    });
    
    return pendingReleases;
  };

  const pendingReleases = calculatePendingReleases();

  if (banksLoading) {
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
          <h1 className="text-3xl font-bold text-slate-900">Commission Management</h1>
          <p className="text-slate-500 mt-1">Manage commission banks and approve payouts</p>
        </div>
        <Button
          onClick={() => recalculateMutation.mutate()}
          disabled={recalculateMutation.isPending}
          variant="outline"
          className="border-amber-500 text-amber-600 hover:bg-amber-50"
        >
          <Clock className="w-4 h-4 mr-2" />
          {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate Quarterly Payouts'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Banked"
          value={`$${totalBanked.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Earned"
          value={`$${totalEarned.toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Paid Out"
          value={`$${totalPaidOut.toLocaleString()}`}
          icon={CheckCircle}
        />
        <StatCard
          title="Pending Requests"
          value={pendingPayouts.length}
          icon={AlertCircle}
        />
      </div>

      {/* Pending Phase Releases Alert */}
      {pendingReleases.length > 0 && (
        <Card className="border-amber-500 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              Pending Commission Releases ({pendingReleases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 mb-4">
              The following completed project phases have banked commissions ready to be moved to available:
            </p>
            <div className="bg-white rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Salesperson</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReleases.map((release, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{release.project_title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{release.phase_name}</Badge>
                      </TableCell>
                      <TableCell>{release.salesperson_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-amber-700 mt-3">
              Process these releases by updating the project phases to trigger commission availability.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 hidden">
        {/* Hidden duplicate stats - keeping for spacing */}
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests {pendingPayouts.length > 0 && `(${pendingPayouts.length})`}
          </TabsTrigger>
          <TabsTrigger value="banks">Commission Banks</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Sales</TabsTrigger>
        </TabsList>

        {/* Pending Requests Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Balloon Payment Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayouts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No pending requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance Before</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-medium">{getUserName(payout.user_id)}</TableCell>
                        <TableCell>{format(new Date(payout.request_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-bold text-amber-600">
                          ${payout.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>${payout.bank_balance_before?.toLocaleString() || 0}</TableCell>
                        <TableCell>${payout.bank_balance_after?.toLocaleString() || 0}</TableCell>
                        <TableCell className="max-w-xs truncate">{payout.notes || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPayout(payout);
                                setApproveDialogOpen(true);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedPayout(payout);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Banks Tab */}
        <TabsContent value="banks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Commission Banks
                </CardTitle>
                <ExportCSVButton
                  data={allBanks}
                  filename="commission_banks"
                  columns={[
                    { header: 'Salesperson', accessor: (b) => getUserName(b.user_id) },
                    { header: 'Current Tier', accessor: (b) => b.current_tier || 'N/A' },
                    { header: 'YTD Volume', accessor: (b) => b.ytd_sales_volume || 0 },
                    { header: 'Bank Balance', accessor: (b) => b.current_bank_balance || 0 },
                    { header: 'Available Balance', accessor: (b) => b.available_balance || 0 },
                    { header: 'Quarterly Payout', accessor: (b) => b.quarterly_payout_amount || 0 },
                    { header: 'Total Earned', accessor: (b) => b.total_earned || 0 },
                    { header: 'Total Paid', accessor: (b) => b.total_paid_out || 0 },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Current Tier</TableHead>
                    <TableHead>YTD Volume</TableHead>
                    <TableHead>Bank Balance</TableHead>
                    <TableHead>Available Balance</TableHead>
                    <TableHead>Quarterly Payout</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Commission Rule</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBanks.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell className="font-medium">{getUserName(bank.user_id)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{bank.current_tier || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>${(bank.ytd_sales_volume || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-amber-600">
                        ${(bank.current_bank_balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${(bank.available_balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>${(bank.quarterly_payout_amount || 0).toLocaleString()}</TableCell>
                      <TableCell>${(bank.total_earned || 0).toLocaleString()}</TableCell>
                      <TableCell>${(bank.total_paid_out || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        {bank.commission_rule_id ? (
                          <Badge variant="outline">
                            {commissionRules.find(r => r.id === bank.commission_rule_id)?.rule_name || 'Unknown'}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(bank.current_bank_balance || 0) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-500 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedBank(bank);
                              setReleaseAmount('');
                              setReleaseDialogOpen(true);
                            }}
                          >
                            Release
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allBanks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                        No commission banks found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legacy Sales Tab */}
        <TabsContent value="legacy">
          <Card>
            <CardHeader>
              <CardTitle>Add Legacy Sales (Spreadsheet)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 text-sm">
                Enter multiple legacy sales at once. Fill in all fields for each row.
              </p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Salesperson</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Lead Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Sale Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Sale Amount</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Commission</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacySales.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <select
                            value={row.salesperson_id}
                            onChange={(e) => handleUpdateRow(row.id, 'salesperson_id', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Select...</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.lead_name}
                            onChange={(e) => handleUpdateRow(row.id, 'lead_name', e.target.value)}
                            placeholder="Project name"
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={row.sale_date}
                            onChange={(e) => handleUpdateRow(row.id, 'sale_date', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.sale_amount}
                            onChange={(e) => handleUpdateRow(row.id, 'sale_amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.commission_amount}
                            onChange={(e) => handleUpdateRow(row.id, 'commission_amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAddRow}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
                <Button
                  onClick={handleSubmitLegacySales}
                  disabled={legacySaleMutation.isPending}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 flex-1"
                >
                  {legacySaleMutation.isPending ? 'Submitting...' : `Submit ${legacySales.filter(r => r.lead_name).length} Sale(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Payout Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPayouts
                    .filter(p => p.status !== 'pending')
                    .sort((a, b) => new Date(b.payout_date) - new Date(a.payout_date))
                    .slice(0, 20)
                    .map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-medium">{getUserName(payout.user_id)}</TableCell>
                        <TableCell className="capitalize">{payout.payout_type.replace('_', ' ')}</TableCell>
                        <TableCell className="font-bold">${payout.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {payout.request_date ? format(new Date(payout.request_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{payout.approved_by ? getUserName(payout.approved_by) : '-'}</TableCell>
                        <TableCell>{format(new Date(payout.payout_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payout.status === 'paid' ? 'default' : 
                              payout.status === 'approved' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  {allPayouts.filter(p => p.status !== 'pending').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No payout history
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Balloon Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this balloon payment of ${selectedPayout?.amount.toLocaleString()} 
              for {getUserName(selectedPayout?.user_id)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveMutation.mutate({ payout_id: selectedPayout?.id, approve: true })}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Balloon Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this balloon payment request 
              for {getUserName(selectedPayout?.user_id)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveMutation.mutate({ payout_id: selectedPayout?.id, approve: false })}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Release Commission Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Banked Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Salesperson</Label>
              <div className="text-lg font-semibold">{getUserName(selectedBank?.user_id)}</div>
            </div>
            <div className="space-y-2">
              <Label>Current Bank Balance</Label>
              <div className="text-2xl font-bold text-amber-600">
                ${(selectedBank?.current_bank_balance || 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="release-amount">Amount to Release</Label>
              <Input
                id="release-amount"
                type="number"
                placeholder="0.00"
                value={releaseAmount}
                onChange={(e) => setReleaseAmount(e.target.value)}
                max={selectedBank?.current_bank_balance || 0}
              />
              <p className="text-xs text-slate-500">
                This will move the specified amount from banked to available balance
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setReleaseDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => releaseCommissionMutation.mutate({
                user_id: selectedBank?.user_id,
                amount: releaseAmount
              })}
              disabled={!releaseAmount || parseFloat(releaseAmount) <= 0 || releaseCommissionMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 flex-1"
            >
              {releaseCommissionMutation.isPending ? 'Releasing...' : 'Release Commission'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}