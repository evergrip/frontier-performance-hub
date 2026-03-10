import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Plus, Shield } from 'lucide-react';
import AlertRuleFormDialog from '@/components/alerts/AlertRuleFormDialog';
import AlertRulesList from '@/components/alerts/AlertRulesList';

export default function MyAlerts() {
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  const { data: allRules = [], isLoading } = useQuery({
    queryKey: ['alertRules'],
    queryFn: () => base44.entities.AlertRule.list('-created_date'),
    enabled: !!currentUser,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  // For non-admin, only show their own rules
  const myRules = allRules.filter(r => r.user_id === currentUser?.id);
  const otherRules = isAdmin ? allRules.filter(r => r.user_id !== currentUser?.id) : [];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AlertRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      setShowForm(false);
      setEditRule(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AlertRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      setShowForm(false);
      setEditRule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AlertRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertRules'] }),
  });

  const handleSave = (formData) => {
    const { target_user_id, ...data } = formData;
    if (editRule) {
      updateMutation.mutate({ id: editRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggle = (rule) => {
    updateMutation.mutate({ id: rule.id, data: { is_active: !rule.is_active } });
  };

  const handleDelete = (rule) => {
    if (confirm(`Delete alert "${rule.name || 'Unnamed'}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  const handleEdit = (rule) => {
    setEditRule(rule);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-500" />
            My Alerts
          </h1>
          <p className="text-slate-500 mt-1">Get notified when important things happen in your pipeline.</p>
        </div>
        <Button onClick={() => { setEditRule(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Alert
        </Button>
      </div>

      {/* Quick tips card */}
      {myRules.length === 0 && otherRules.length === 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-5">
            <h3 className="font-semibold text-orange-900 mb-2">💡 What can you track?</h3>
            <ul className="text-sm text-orange-800 space-y-1.5">
              <li>• <strong>Leads:</strong> Get notified when leads are converted to pre-construction, disqualified, or change status</li>
              <li>• <strong>Pre-Construction:</strong> Track when projects move through feasibility, design, engineering, or convert to construction</li>
              <li>• <strong>Construction:</strong> Know when projects enter mobilization, active construction, or closeout</li>
              <li>• Choose <strong>immediate emails</strong> or a <strong>daily digest</strong> summary</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {isAdmin ? (
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">My Alerts ({myRules.length})</TabsTrigger>
            <TabsTrigger value="all">
              <Shield className="w-3.5 h-3.5 mr-1" />
              All Users ({allRules.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="mt-4">
            <AlertRulesList
              rules={myRules}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              isAdmin={false}
            />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <AlertRulesList
              rules={allRules}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              isAdmin={true}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <AlertRulesList
          rules={myRules}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          isAdmin={false}
        />
      )}

      <AlertRuleFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditRule(null); }}
        onSave={handleSave}
        editRule={editRule}
        users={isAdmin ? users : [currentUser].filter(Boolean)}
        currentUser={currentUser}
      />
    </div>
  );
}