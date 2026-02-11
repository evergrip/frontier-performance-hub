import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const INITIAL_FORM = {
  user_id: '',
  sale_id: '',
  sale_type: '',
  project_id: '',
  transaction_type: 'sale_commission',
  amount: '',
  commission_rate: '',
  sale_amount: '',
  tier_at_time: '',
  phase_name: '',
  banking_percentage: '',
  banked_amount: '',
  immediate_payout_amount: '',
  status: 'banked',
  notes: '',
};

export default function AddCommissionTransactionForm({ allUsers }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const queryClient = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ['allSales'],
    queryFn: () => base44.entities.Sale.list(),
    enabled: open,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: open,
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.contact_name || client?.company_name || '';
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {};
      const roundFields = ['amount', 'sale_amount', 'banked_amount', 'immediate_payout_amount'];
      Object.entries(data).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          if (['amount', 'commission_rate', 'sale_amount', 'banking_percentage', 'banked_amount', 'immediate_payout_amount'].includes(key)) {
            const num = parseFloat(value);
            cleanData[key] = roundFields.includes(key) ? Math.round(num) : num;
          } else {
            cleanData[key] = value;
          }
        }
      });
      cleanData.audit_log = [{
        timestamp: new Date().toISOString(),
        edited_by: 'admin',
        changes: 'Manual creation',
        note: data.notes || 'Manually added commission transaction',
      }];
      return await base44.entities.CommissionTransaction.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['commissionBank'] });
      toast.success('Commission transaction created');
      setForm(INITIAL_FORM);
      setOpen(false);
    },
  });

  const handleSubmit = () => {
    if (!form.user_id) return toast.error('Select a salesperson');
    if (!form.amount) return toast.error('Enter a commission amount');
    if (!form.transaction_type) return toast.error('Select a transaction type');
    createMutation.mutate(form);
  };

  // When sale is selected, auto-fill sale_type
  const handleSaleChange = (saleId) => {
    const sale = sales.find(s => s.id === saleId);
    setForm(prev => ({
      ...prev,
      sale_id: saleId,
      sale_type: sale?.sale_type || prev.sale_type,
      sale_amount: sale?.contract_value || prev.sale_amount,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Commission Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Salesperson */}
          <div className="space-y-2">
            <Label>Salesperson *</Label>
            <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select salesperson..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linked Sale */}
          <div className="space-y-2">
            <Label>Linked Sale</Label>
            <Select value={form.sale_id} onValueChange={handleSaleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select sale..." />
              </SelectTrigger>
              <SelectContent>
                {sales.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} — {getClientName(s.client_id)} ({s.sale_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linked Project */}
          <div className="space-y-2">
            <Label>Linked Project (optional)</Label>
            <Select value={form.project_id || "none"} onValueChange={(v) => setForm({ ...form, project_id: v === "none" ? "" : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} — {getClientName(p.client_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type *</Label>
              <Select value={form.transaction_type} onValueChange={(v) => setForm({ ...form, transaction_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale_commission">Sale Commission</SelectItem>
                  <SelectItem value="phase_commission">Phase Commission</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sale Type */}
            <div className="space-y-2">
              <Label>Sale Type</Label>
              <Select value={form.sale_type || "none"} onValueChange={(v) => setForm({ ...form, sale_type: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="preconstruction">Preconstruction</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commission Amount */}
            <div className="space-y-2">
              <Label>Commission Amount *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            {/* Sale Amount */}
            <div className="space-y-2">
              <Label>Sale Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.sale_amount}
                onChange={(e) => setForm({ ...form, sale_amount: e.target.value })}
              />
            </div>

            {/* Commission Rate */}
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 5.5"
                value={form.commission_rate}
                onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
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

            {/* Banked Amount */}
            <div className="space-y-2">
              <Label>Banked Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.banked_amount}
                onChange={(e) => setForm({ ...form, banked_amount: e.target.value })}
              />
            </div>

            {/* Immediate Payout */}
            <div className="space-y-2">
              <Label>Immediate Payout Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.immediate_payout_amount}
                onChange={(e) => setForm({ ...form, immediate_payout_amount: e.target.value })}
              />
            </div>
          </div>

          {/* Phase Name */}
          <div className="space-y-2">
            <Label>Phase Name (optional)</Label>
            <Input
              placeholder="e.g. feasibility, active_construction"
              value={form.phase_name}
              onChange={(e) => setForm({ ...form, phase_name: e.target.value })}
            />
          </div>

          {/* Tier at Time */}
          <div className="space-y-2">
            <Label>Tier at Time (optional)</Label>
            <Input
              placeholder="e.g. Pre-Con Sale, Tier 1"
              value={form.tier_at_time}
              onChange={(e) => setForm({ ...form, tier_at_time: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Reason for adding this transaction..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Transaction'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}