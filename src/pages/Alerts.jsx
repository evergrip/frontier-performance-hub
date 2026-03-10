import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AlertRuleForm from '@/components/alerts/AlertRuleForm';
import AlertRuleCard from '@/components/alerts/AlertRuleCard';

export default function Alerts() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    };
    load();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: alertRules = [], isLoading } = useQuery({
    queryKey: ['alertRules', user?.id, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        return await base44.entities.AlertRule.list('-created_date');
      }
      return await base44.entities.AlertRule.filter({ user_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const { data: recentNotifications = [] } = useQuery({
    queryKey: ['alertNotifications', user?.id, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        return await base44.entities.AlertNotification.list('-created_date', 50);
      }
      return await base44.entities.AlertNotification.filter({ user_id: user.id }, '-created_date', 50);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AlertRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      toast.success('Alert rule created');
      setShowCreateDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (rule) => base44.entities.AlertRule.update(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      toast.success('Alert updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (rule) => base44.entities.AlertRule.delete(rule.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      toast.success('Alert deleted');
    },
  });

  const activeRules = alertRules.filter(r => r.is_active);
  const inactiveRules = alertRules.filter(r => !r.is_active);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-500" />
            Notification Alerts
          </h1>
          <p className="text-slate-500 mt-1">
            Get notified when leads, sales, or projects change status
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Alert Rule
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">
            My Rules
            {activeRules.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">{activeRules.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            Recent Activity
            {recentNotifications.filter(n => !n.sent).length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                {recentNotifications.filter(n => !n.sent).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : alertRules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-1">No alert rules yet</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Create your first alert to get notified when things change
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Alert Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeRules.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Active ({activeRules.length})</h3>
                  {activeRules.map(rule => (
                    <AlertRuleCard
                      key={rule.id}
                      rule={rule}
                      onToggle={(r) => toggleMutation.mutate(r)}
                      onDelete={(r) => deleteMutation.mutate(r)}
                      userName={user?.full_name}
                    />
                  ))}
                </div>
              )}
              {inactiveRules.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Paused ({inactiveRules.length})</h3>
                  {inactiveRules.map(rule => (
                    <AlertRuleCard
                      key={rule.id}
                      rule={rule}
                      onToggle={(r) => toggleMutation.mutate(r)}
                      onDelete={(r) => deleteMutation.mutate(r)}
                      userName={user?.full_name}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4" /> Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No notifications yet</p>
              ) : (
                <div className="space-y-2">
                  {recentNotifications.map(n => (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.sent ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">{n.event_summary}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>{format(new Date(n.created_date), 'MMM d, h:mm a')}</span>
                          <Badge variant="outline" className="text-xs">
                            {n.delivery_mode === 'immediate' ? 'Immediate' : 'Digest'}
                          </Badge>
                          {n.sent && <span className="text-emerald-500">Sent</span>}
                          {!n.sent && n.delivery_mode === 'daily_digest' && <span className="text-amber-500">Pending digest</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Alert Rule</DialogTitle>
          </DialogHeader>
          <AlertRuleForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowCreateDialog(false)}
            allUsers={allUsers}
            currentUser={user}
            isAdmin={isAdmin}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}