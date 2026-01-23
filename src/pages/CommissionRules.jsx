import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch.jsx';
import { Plus, Edit2, Trash2, DollarSign, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function CommissionRules() {
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    sale_type: 'both',
    tiers: [{ tier_name: '', min_volume: 0, max_volume: null, commission_rate: 0 }],
    precon_phase_availability: [
      { phase: 'feasibility', available_percentage: 30, banked_percentage: 70 },
      { phase: 'design_material_selections', available_percentage: 60, banked_percentage: 40 },
      { phase: 'engineering_permits', available_percentage: 80, banked_percentage: 20 },
      { phase: 'pending_construction_sale', available_percentage: 100, banked_percentage: 0 },
    ],
    construction_phase_availability: [
      { phase: 'awaiting_to_be_scheduled', available_percentage: 0, banked_percentage: 100 },
      { phase: 'mobilization', available_percentage: 20, banked_percentage: 80 },
      { phase: 'active_construction', available_percentage: 50, banked_percentage: 50 },
      { phase: 'substantial_completion_closeout', available_percentage: 80, banked_percentage: 20 },
      { phase: 'closed', available_percentage: 100, banked_percentage: 0 },
    ],
    is_active: true,
    notes: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      if (user?.role !== 'admin') {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['commissionRules'],
    queryFn: () => base44.entities.CommissionRule.list(),
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.CommissionRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionRules'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Commission rule created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create rule: ' + error.message);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommissionRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionRules'] });
      setDialogOpen(false);
      setEditingRule(null);
      resetForm();
      toast.success('Commission rule updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update rule: ' + error.message);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.CommissionRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionRules'] });
      toast.success('Commission rule deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete rule: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      sale_type: 'both',
      tiers: [{ tier_name: '', min_volume: 0, max_volume: null, commission_rate: 0 }],
      precon_phase_availability: [
        { phase: 'feasibility', available_percentage: 30, banked_percentage: 70 },
        { phase: 'design_material_selections', available_percentage: 60, banked_percentage: 40 },
        { phase: 'engineering_permits', available_percentage: 80, banked_percentage: 20 },
        { phase: 'pending_construction_sale', available_percentage: 100, banked_percentage: 0 },
      ],
      construction_phase_availability: [
        { phase: 'awaiting_to_be_scheduled', available_percentage: 0, banked_percentage: 100 },
        { phase: 'mobilization', available_percentage: 20, banked_percentage: 80 },
        { phase: 'active_construction', available_percentage: 50, banked_percentage: 50 },
        { phase: 'substantial_completion_closeout', available_percentage: 80, banked_percentage: 20 },
        { phase: 'closed', available_percentage: 100, banked_percentage: 0 },
      ],
      is_active: true,
      notes: '',
    });
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        rule_name: rule.rule_name || '',
        sale_type: rule.sale_type || 'both',
        tiers: rule.tiers || [{ tier_name: '', min_volume: 0, max_volume: null, commission_rate: 0 }],
        precon_banking_rate: rule.precon_banking_rate || 25,
        is_active: rule.is_active !== undefined ? rule.is_active : true,
        notes: rule.notes || '',
      });
    } else {
      resetForm();
      setEditingRule(null);
    }
    setDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!formData.rule_name) {
      toast.error('Rule name is required');
      return;
    }

    if (formData.tiers.length === 0) {
      toast.error('At least one tier is required');
      return;
    }

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const handleAddTier = () => {
    setFormData({
      ...formData,
      tiers: [...formData.tiers, { tier_name: '', min_volume: 0, max_volume: null, commission_rate: 0 }],
    });
  };

  const handleRemoveTier = (index) => {
    const newTiers = formData.tiers.filter((_, i) => i !== index);
    setFormData({ ...formData, tiers: newTiers });
  };

  const handleTierChange = (index, field, value) => {
    const newTiers = [...formData.tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData({ ...formData, tiers: newTiers });
  };

  const handleDeleteRule = (id) => {
    if (confirm('Are you sure you want to delete this commission rule?')) {
      deleteRuleMutation.mutate(id);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commission Rules</h1>
          <p className="text-slate-500 mt-1">Define commission tiers and rates for sales</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="grid gap-6">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{rule.rule_name}</CardTitle>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-slate-500">
                      Type: <span className="font-medium text-slate-700">{rule.sale_type}</span>
                    </span>
                    {rule.sale_type === 'preconstruction' || rule.sale_type === 'both' ? (
                      <span className="text-sm text-slate-500">
                        Banking: <span className="font-medium text-slate-700">{rule.precon_banking_rate}%</span>
                      </span>
                    ) : null}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rule.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(rule)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rule.notes && (
                <p className="text-sm text-slate-600 mb-4">{rule.notes}</p>
              )}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-700">Commission Tiers</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier Name</TableHead>
                      <TableHead>Min Volume</TableHead>
                      <TableHead>Max Volume</TableHead>
                      <TableHead>Commission Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rule.tiers?.map((tier, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{tier.tier_name}</TableCell>
                        <TableCell>${tier.min_volume?.toLocaleString()}</TableCell>
                        <TableCell>
                          {tier.max_volume ? `$${tier.max_volume.toLocaleString()}` : 'Unlimited'}
                        </TableCell>
                        <TableCell className="font-semibold text-amber-600">
                          {tier.commission_rate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Commission Rule' : 'Create Commission Rule'}</DialogTitle>
            <DialogDescription>
              Define commission tiers that work like income tax brackets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input
                placeholder="e.g., Standard Sales Commission"
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Sale Type</Label>
              <Select
                value={formData.sale_type}
                onValueChange={(value) => setFormData({ ...formData, sale_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preconstruction">Preconstruction Only</SelectItem>
                  <SelectItem value="construction">Construction Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData.sale_type === 'preconstruction' || formData.sale_type === 'both') && (
              <div>
                <Label>Preconstruction Banking Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.precon_banking_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, precon_banking_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes about this rule..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Tiers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Commission Tiers (like tax brackets)</Label>
                <Button type="button" size="sm" onClick={handleAddTier}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tier
                </Button>
              </div>
              {formData.tiers.map((tier, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Tier Name</Label>
                      <Input
                        placeholder="e.g., Bronze, Silver, Gold"
                        value={tier.tier_name}
                        onChange={(e) => handleTierChange(index, 'tier_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Min Volume ($)</Label>
                      <Input
                        type="number"
                        value={tier.min_volume}
                        onChange={(e) =>
                          handleTierChange(index, 'min_volume', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <Label>Max Volume ($)</Label>
                      <Input
                        type="number"
                        placeholder="Leave empty for unlimited"
                        value={tier.max_volume || ''}
                        onChange={(e) =>
                          handleTierChange(
                            index,
                            'max_volume',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Commission Rate (%)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={tier.commission_rate}
                          onChange={(e) =>
                            handleTierChange(index, 'commission_rate', parseFloat(e.target.value) || 0)
                          }
                        />
                        {formData.tiers.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleRemoveTier(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              {createRuleMutation.isPending || updateRuleMutation.isPending
                ? 'Saving...'
                : editingRule
                ? 'Update Rule'
                : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}