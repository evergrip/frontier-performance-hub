import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, Flag, AlertTriangle, Users, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StatCard from '@/components/common/StatCard';
import AddCommissionTransactionForm from '@/components/commissions/AddCommissionTransactionForm';
import AuditTransactionTable from '@/components/commissions/AuditTransactionTable';
import { getSaleStatusTag } from '@/components/commissions/SaleStatusTag';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unverified', label: 'Unverified' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'orphaned', label: 'Orphaned' },
  { key: 'discrepancies', label: 'Discrepancies' },
];

export default function CommissionAudit() {
  const [user, setUser] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [filter, setFilter] = useState('all');
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifyEditData, setVerifyEditData] = useState({ amount: 0, sale_amount: 0 });
  const [flagNote, setFlagNote] = useState('');
  const [editFormData, setEditFormData] = useState({});
  const [editNote, setEditNote] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== 'admin') { window.location.href = '/'; return; }
      setUser(u);
    });
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['allCommissionTransactions'],
    queryFn: () => base44.entities.CommissionTransaction.list('-created_date'),
    enabled: !!user,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['allSales'],
    queryFn: () => base44.entities.Sale.list(),
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user,
  });

  // Enrich transactions with sale/project data and computed tags
  const enrichedTransactions = transactions.map(tx => {
    const sale = sales.find(s => s.id === tx.sale_id);
    const project = sale ? projects.find(p => p.sale_id === sale.id) : null;
    const client = sale ? clients.find(c => c.id === sale.client_id) : null;
    const statusTag = getSaleStatusTag(tx, sale, project);
    const isOrphaned = !!tx.sale_id && !sale;
    const currentSaleValue = sale?.contract_value;
    const hasDiscrepancy = sale && tx.sale_amount && currentSaleValue != null && Math.abs(tx.sale_amount - currentSaleValue) > 1;
    const saleName = sale 
      ? `${sale.title} (${tx.sale_type || sale.sale_type})`
      : tx.sale_id 
        ? 'Unknown Sale (Orphaned)' 
        : tx.transaction_type === 'adjustment' || tx.transaction_type === 'correction_debit'
          ? 'Adjustment'
          : 'Manual Entry';
    const userName = allUsers.find(u => u.id === tx.user_id)?.full_name || 'Unknown';

    return { ...tx, sale, project, client, statusTag, isOrphaned, currentSaleValue, hasDiscrepancy, saleName, userName };
  });

  // Filter by selected user
  const userFiltered = selectedUserId === 'all' 
    ? enrichedTransactions 
    : enrichedTransactions.filter(tx => tx.user_id === selectedUserId);

  // Filter by tab
  const filteredTransactions = userFiltered.filter(tx => {
    switch (filter) {
      case 'unverified': return !tx.verified;
      case 'flagged': return tx.flagged_for_review;
      case 'orphaned': return tx.isOrphaned;
      case 'discrepancies': return tx.hasDiscrepancy;
      default: return true;
    }
  });

  // Counts for filter badges
  const counts = {
    all: userFiltered.length,
    unverified: userFiltered.filter(t => !t.verified).length,
    flagged: userFiltered.filter(t => t.flagged_for_review).length,
    orphaned: userFiltered.filter(t => t.isOrphaned).length,
    discrepancies: userFiltered.filter(t => t.hasDiscrepancy).length,
  };

  // Verify mutation (with optional edits)
  const verifyMutation = useMutation({
    mutationFn: async ({ txId, note, edits }) => {
      const updates = {
        verified: true,
        verified_by_user_id: user.id,
        verified_date: new Date().toISOString(),
        verification_notes: note || '',
        flagged_for_review: false,
      };
      // If amount or sale_amount changed, apply edits and log
      const hasEdits = edits && (edits.amount !== selectedTx.amount || edits.sale_amount !== selectedTx.sale_amount);
      if (hasEdits) {
        if (edits.amount !== selectedTx.amount) updates.amount = parseFloat(edits.amount);
        if (edits.sale_amount !== selectedTx.sale_amount) updates.sale_amount = parseFloat(edits.sale_amount);
        const changes = [];
        if (edits.amount !== selectedTx.amount) changes.push(`amount: $${selectedTx.amount?.toFixed(2)} → $${parseFloat(edits.amount).toFixed(2)}`);
        if (edits.sale_amount !== selectedTx.sale_amount) changes.push(`sale_amount: $${Math.round(selectedTx.sale_amount || 0)} → $${Math.round(parseFloat(edits.sale_amount))}`);
        updates.audit_log = [...(selectedTx.audit_log || []), {
          timestamp: new Date().toISOString(),
          edited_by: user.full_name || 'admin',
          changes: changes.join('; '),
          note: `Corrected during verification: ${note || ''}`,
        }];
      }
      await base44.entities.CommissionTransaction.update(txId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCommissionTransactions'] });
      toast.success('Transaction verified');
      setVerifyDialogOpen(false);
      setVerifyNote('');
    },
  });

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: async ({ txId, note }) => {
      await base44.entities.CommissionTransaction.update(txId, {
        flagged_for_review: true,
        flag_notes: note,
        verified: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCommissionTransactions'] });
      toast.success('Transaction flagged for review');
      setFlagDialogOpen(false);
      setFlagNote('');
    },
  });

  // Edit mutation (uses existing backend)
  const editMutation = useMutation({
    mutationFn: async ({ transactionId, updates, note }) => {
      const res = await base44.functions.invoke('editCommissionTransaction', { transaction_id: transactionId, updates, note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCommissionTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['commissionBank'] });
      toast.success('Transaction updated');
      setEditDialogOpen(false);
      setEditNote('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const handleVerify = (tx) => { setSelectedTx(tx); setVerifyNote(''); setVerifyEditData({ amount: tx.amount, sale_amount: tx.sale_amount || 0 }); setVerifyDialogOpen(true); };
  const handleFlag = (tx) => { setSelectedTx(tx); setFlagNote(''); setFlagDialogOpen(true); };
  const handleViewDetail = (tx) => { setSelectedTx(tx); setDetailDialogOpen(true); };
  const handleEdit = (tx) => {
    setSelectedTx(tx);
    setEditFormData({
      amount: tx.amount,
      sale_amount: tx.sale_amount || 0,
      user_id: tx.user_id,
      status: tx.status,
    });
    setEditNote('');
    setEditDialogOpen(true);
  };

  const submitEdit = () => {
    if (!editNote.trim()) { toast.error('Note required'); return; }
    const updates = {};
    if (editFormData.amount !== selectedTx.amount) updates.amount = parseFloat(editFormData.amount);
    if (editFormData.sale_amount !== selectedTx.sale_amount) updates.sale_amount = parseFloat(editFormData.sale_amount);
    if (editFormData.user_id !== selectedTx.user_id) updates.user_id = editFormData.user_id;
    if (editFormData.status !== selectedTx.status) updates.status = editFormData.status;
    if (Object.keys(updates).length === 0) { toast.error('No changes'); return; }
    editMutation.mutate({ transactionId: selectedTx.id, updates, note: editNote });
  };

  const commissionUsers = allUsers.filter(u => u.commission_rule_ids?.length > 0);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commission Audit</h1>
          <p className="text-slate-500 mt-1">Manual review, verification, and correction of all commission data</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
              Auto-calculation disabled
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Manual entry mode
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AddCommissionTransactionForm allUsers={allUsers} />
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select salesperson" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Salespeople</SelectItem>
                {commissionUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total" value={counts.all} icon={FileText} subtitle="transactions" />
        <StatCard title="Verified" value={counts.all - counts.unverified} icon={CheckCircle2} subtitle={`${counts.all > 0 ? Math.round(((counts.all - counts.unverified) / counts.all) * 100) : 0}% complete`} />
        <StatCard title="Unverified" value={counts.unverified} icon={Shield} subtitle="need review" />
        <StatCard title="Flagged" value={counts.flagged} icon={Flag} subtitle="issues found" />
        <StatCard title="Orphaned" value={counts.orphaned} icon={AlertTriangle} subtitle="sale deleted" />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map(tab => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(tab.key)}
            className="gap-1.5"
          >
            {tab.label}
            <Badge variant="secondary" className={`ml-1 text-[10px] px-1.5 py-0 ${
              filter === tab.key ? 'bg-white/20 text-white' : ''
            } ${tab.key === 'orphaned' && counts.orphaned > 0 ? 'bg-red-100 text-red-700' : ''}
            ${tab.key === 'flagged' && counts.flagged > 0 ? 'bg-amber-100 text-amber-700' : ''}`}>
              {counts[tab.key]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Transaction Table */}
      <Card>
        <CardContent className="p-0">
          <AuditTransactionTable
            transactions={filteredTransactions}
            allUsers={allUsers}
            onVerify={handleVerify}
            onFlag={handleFlag}
            onEdit={handleEdit}
            onViewDetail={handleViewDetail}
          />
        </CardContent>
      </Card>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Verify Transaction
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sale:</span>
                  <span className="font-medium">{selectedTx.saleName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">TX Sale Amount:</span>
                  <span className="font-medium">${Math.round(selectedTx.sale_amount || 0).toLocaleString()}</span>
                </div>
                {selectedTx.currentSaleValue != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current Sale Value:</span>
                    <span className={`font-medium ${selectedTx.hasDiscrepancy ? 'text-amber-600' : ''}`}>
                      ${Math.round(selectedTx.currentSaleValue).toLocaleString()}
                      {selectedTx.hasDiscrepancy && ' ⚠️'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Commission:</span>
                  <span className="font-bold text-emerald-700">${selectedTx.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tier:</span>
                  <span className="font-medium">{selectedTx.tier_at_time || '-'}</span>
                </div>
              </div>
              {selectedTx.hasDiscrepancy && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium">⚠️ Sale value discrepancy detected. Review before verifying.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commission Amount</Label>
                  <Input type="number" step="0.01" value={verifyEditData.amount} onChange={e => setVerifyEditData({...verifyEditData, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Sale Amount</Label>
                  <Input type="number" step="0.01" value={verifyEditData.sale_amount} onChange={e => setVerifyEditData({...verifyEditData, sale_amount: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Verification Note {(verifyEditData.amount != selectedTx.amount || verifyEditData.sale_amount != selectedTx.sale_amount) ? '(required — explain correction) *' : '(optional)'}</Label>
                <Textarea placeholder="e.g. Verified against signed contract..." value={verifyNote} onChange={e => setVerifyNote(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={verifyMutation.isPending || (verifyEditData.amount != selectedTx.amount && !verifyNote.trim()) || (verifyEditData.sale_amount != selectedTx.sale_amount && !verifyNote.trim())} onClick={() => verifyMutation.mutate({ txId: selectedTx.id, note: verifyNote, edits: verifyEditData })}>
                  {verifyMutation.isPending ? 'Verifying...' : 'Verify ✓'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-600" />
              Flag for Review
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">{selectedTx.saleName}</p>
                <p className="text-sm text-slate-600">Commission: ${selectedTx.amount?.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label>Reason for flagging *</Label>
                <Textarea placeholder="Describe the issue..." value={flagNote} onChange={e => setFlagNote(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>Cancel</Button>
                <Button className="bg-amber-600 hover:bg-amber-700" disabled={flagMutation.isPending || !flagNote.trim()} onClick={() => flagMutation.mutate({ txId: selectedTx.id, note: flagNote })}>
                  {flagMutation.isPending ? 'Flagging...' : 'Flag ⚑'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Commission Transaction</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="font-medium">{selectedTx.saleName}</p>
                <p className="text-slate-500">Salesperson: {selectedTx.userName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commission Amount</Label>
                  <Input type="number" step="0.01" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Sale Amount</Label>
                  <Input type="number" step="0.01" value={editFormData.sale_amount} onChange={e => setEditFormData({...editFormData, sale_amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Salesperson</Label>
                  <Select value={editFormData.user_id} onValueChange={v => setEditFormData({...editFormData, user_id: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {commissionUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editFormData.status} onValueChange={v => setEditFormData({...editFormData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Required Note (reason for changes) *</Label>
                <Textarea placeholder="Explain the correction..." value={editNote} onChange={e => setEditNote(e.target.value)} rows={3} />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">⚠️ Changes are permanently logged with your name and timestamp.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button disabled={editMutation.isPending} onClick={submitEdit}>
                  {editMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg grid grid-cols-2 gap-3">
                <Detail label="Date" value={format(new Date(selectedTx.created_date), 'MMM d, yyyy')} />
                <Detail label="Type" value={selectedTx.transaction_type?.replace(/_/g, ' ')} />
                <Detail label="Sale" value={selectedTx.saleName} />
                <Detail label="Salesperson" value={selectedTx.userName} />
                <Detail label="TX Sale Amount" value={`$${Math.round(selectedTx.sale_amount || 0).toLocaleString()}`} />
                <Detail label="Current Sale Value" value={selectedTx.currentSaleValue != null ? `$${Math.round(selectedTx.currentSaleValue).toLocaleString()}` : 'N/A'} />
                <Detail label="Commission" value={`$${selectedTx.amount?.toFixed(2)}`} highlight />
                <Detail label="Tier" value={selectedTx.tier_at_time || '-'} />
                <Detail label="Phase" value={selectedTx.phase_name?.replace(/_/g, ' ') || '-'} />
                <Detail label="Status" value={selectedTx.status} />
                <Detail label="Banked" value={selectedTx.banked_amount ? `$${Math.round(selectedTx.banked_amount).toLocaleString()}` : '-'} />
                <Detail label="Available" value={selectedTx.immediate_payout_amount ? `$${Math.round(selectedTx.immediate_payout_amount).toLocaleString()}` : '-'} />
              </div>
              {selectedTx.verified && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <p className="font-medium text-emerald-800">✓ Verified by {allUsers.find(u => u.id === selectedTx.verified_by_user_id)?.full_name || 'admin'}</p>
                  {selectedTx.verified_date && <p className="text-emerald-700">{format(new Date(selectedTx.verified_date), 'MMM d, yyyy h:mm a')}</p>}
                  {selectedTx.verification_notes && <p className="text-emerald-700 mt-1">{selectedTx.verification_notes}</p>}
                </div>
              )}
              {selectedTx.flagged_for_review && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                  <p className="font-medium text-amber-800">⚑ Flagged for Review</p>
                  {selectedTx.flag_notes && <p className="text-amber-700 mt-1">{selectedTx.flag_notes}</p>}
                </div>
              )}
              {selectedTx.notes && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs">
                  <p className="font-medium text-slate-700 mb-1">Notes</p>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedTx.notes}</p>
                </div>
              )}
              {selectedTx.audit_log?.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-slate-700">Audit Log</p>
                  {selectedTx.audit_log.map((entry, idx) => (
                    <div key={idx} className="text-xs border-l-2 border-slate-300 pl-3 py-1">
                      <p className="font-medium text-slate-900">{entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a') : '?'} — {entry.edited_by}</p>
                      <p className="text-slate-600">{entry.changes}</p>
                      {entry.note && <p className="text-slate-700 italic">{entry.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`text-xs font-medium ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}