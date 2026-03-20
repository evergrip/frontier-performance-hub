import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
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
import { Users, Mail, UserCog, Search, Shield, User as UserIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function UsersAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteData, setInviteData] = useState({ email: '', role: 'user' });

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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: commissionRules = [] } = useQuery({
    queryKey: ['commissionRules'],
    queryFn: () => base44.entities.CommissionRule.list(),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast.success('User updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user: ' + error.message);
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteDialogOpen(false);
      setInviteData({ email: '', role: 'user' });
      toast.success('User invited successfully');
    },
    onError: (error) => {
      toast.error('Failed to invite user: ' + error.message);
    },
  });

  const handleEditUser = (user) => {
    setSelectedUser({ 
      ...user,
      departments: user.departments || [],
      commission_rule_ids: user.commission_rule_ids || [],
      next_year_commission_rule_ids: user.next_year_commission_rule_ids || [],
      commission_start_date: user.commission_start_date ? format(new Date(user.commission_start_date), 'yyyy-MM-dd') : ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;
    
    // Validate sales department has commission rules
    if (selectedUser.departments?.includes('sales') && (!selectedUser.commission_rule_ids || selectedUser.commission_rule_ids.length === 0)) {
      toast.error('Sales department requires at least one commission rule');
      return;
    }
    
    const updateData = {
      role: selectedUser.role,
      departments: selectedUser.departments,
      department: selectedUser.departments?.[0] || null,
      is_department_manager: selectedUser.is_department_manager || false,
      managed_departments: selectedUser.is_department_manager ? (selectedUser.managed_departments || []) : [],
      commission_rule_ids: selectedUser.commission_rule_ids,
      next_year_commission_rule_ids: selectedUser.next_year_commission_rule_ids,
      is_commission_eligible: selectedUser.departments?.includes('sales'),
      commission_start_date: selectedUser.commission_start_date || null,
      profit_sharing_eligible: selectedUser.profit_sharing_eligible || false,
      profit_sharing_pools: selectedUser.profit_sharing_eligible ? (selectedUser.profit_sharing_pools || []) : [],
      hire_date: selectedUser.hire_date || null,
    };
    
    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: updateData,
    });
  };

  const handleInviteUser = () => {
    if (!inviteData.email) {
      toast.error('Email is required');
      return;
    }
    inviteUserMutation.mutate(inviteData);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

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
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage users and their roles</p>
        </div>
        <Button
          onClick={() => setInviteDialogOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
        >
          <Mail className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <h3 className="text-2xl font-bold text-slate-900">{users.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Admins</p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {users.filter((u) => u.role === 'admin').length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Regular Users</p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {users.filter((u) => u.role === 'user').length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="text-slate-600">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.departments?.map((dept, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                          {dept}
                        </span>
                      ))}
                      {(!user.departments || user.departments.length === 0) && (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {new Date(user.created_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and role</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={selectedUser.full_name || ''}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, full_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={selectedUser.email || ''} disabled />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) =>
                    setSelectedUser({ ...selectedUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departments</Label>
                <div className="space-y-2 mt-2">
                  {['sales', 'preconstruction', 'construction', 'admin', 'management'].map(dept => (
                    <label key={dept} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedUser.departments?.includes(dept) || false}
                        onChange={(e) => {
                          const newDepts = e.target.checked
                            ? [...(selectedUser.departments || []), dept]
                            : (selectedUser.departments || []).filter(d => d !== dept);
                          setSelectedUser({ ...selectedUser, departments: newDepts });
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Profit Sharing Eligibility */}
              <div className="space-y-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Profit Sharing Eligible</Label>
                    <p className="text-xs text-slate-500">Admin override for variable compensation eligibility</p>
                  </div>
                  <Switch
                    checked={selectedUser.profit_sharing_eligible || false}
                    onCheckedChange={(checked) => setSelectedUser({ ...selectedUser, profit_sharing_eligible: checked })}
                  />
                </div>
                {selectedUser.profit_sharing_eligible && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-slate-500">Profit Sharing Pools</Label>
                      <div className="space-y-2 mt-1">
                        {[
                          { value: 'shareholders', label: 'Shareholders / Ownership' },
                          { value: 'leadership', label: 'Leadership' },
                          { value: 'full_staff', label: 'Full Staff / Employee' },
                        ].map((pool) => {
                          const pools = selectedUser.profit_sharing_pools || [];
                          const checked = pools.includes(pool.value);
                          return (
                            <label key={pool.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const updated = checked
                                    ? pools.filter(p => p !== pool.value)
                                    : [...pools, pool.value];
                                  setSelectedUser({ ...selectedUser, profit_sharing_pools: updated });
                                }}
                                className="rounded border-slate-300"
                              />
                              <span className="text-sm">{pool.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Hire Date (for tenure calc)</Label>
                      <Input
                        type="date"
                        value={selectedUser.hire_date || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, hire_date: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Department Manager Toggle */}
              <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Department Manager</Label>
                    <p className="text-xs text-slate-500">Can create KPIs for their managed departments</p>
                  </div>
                  <Switch
                    checked={selectedUser.is_department_manager || false}
                    onCheckedChange={(checked) => setSelectedUser({ ...selectedUser, is_department_manager: checked, managed_departments: checked ? (selectedUser.managed_departments || []) : [] })}
                  />
                </div>
                {selectedUser.is_department_manager && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Managed Departments</Label>
                    <div className="space-y-1">
                      {['sales', 'preconstruction', 'construction', 'admin', 'management'].map(dept => (
                        <label key={dept} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedUser.managed_departments?.includes(dept) || false}
                            onChange={(e) => {
                              const newDepts = e.target.checked
                                ? [...(selectedUser.managed_departments || []), dept]
                                : (selectedUser.managed_departments || []).filter(d => d !== dept);
                              setSelectedUser({ ...selectedUser, managed_departments: newDepts });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm capitalize">{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedUser.departments?.includes('sales') && (
                <>
                  <div>
                    <Label>Commission Start Date</Label>
                    <Input
                      type="date"
                      value={selectedUser.commission_start_date || ''}
                      onChange={(e) =>
                        setSelectedUser({ ...selectedUser, commission_start_date: e.target.value })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">Annual tier resets calculated from this date</p>
                  </div>
                  <div>
                    <Label>Current Fiscal Year Commission Rules *</Label>
                    <div className="space-y-2 mt-2 border rounded-md p-3 bg-amber-50">
                      {commissionRules.map(rule => (
                        <label key={rule.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedUser.commission_rule_ids?.includes(rule.id) || false}
                            onChange={(e) => {
                              const newRules = e.target.checked
                                ? [...(selectedUser.commission_rule_ids || []), rule.id]
                                : (selectedUser.commission_rule_ids || []).filter(r => r !== rule.id);
                              setSelectedUser({ ...selectedUser, commission_rule_ids: newRules });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{rule.rule_name}</span>
                        </label>
                      ))}
                      {commissionRules.length === 0 && (
                        <p className="text-xs text-amber-600">No commission rules available. Create one first.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Next Fiscal Year Commission Rules</Label>
                    <p className="text-xs text-slate-500 mb-2">Defaults to current rules if not set</p>
                    <div className="space-y-2 mt-2 border rounded-md p-3 bg-blue-50">
                      {commissionRules.map(rule => (
                        <label key={rule.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              selectedUser.next_year_commission_rule_ids?.includes(rule.id) ||
                              (!selectedUser.next_year_commission_rule_ids?.length && selectedUser.commission_rule_ids?.includes(rule.id))
                            }
                            onChange={(e) => {
                              const newRules = e.target.checked
                                ? [...(selectedUser.next_year_commission_rule_ids || selectedUser.commission_rule_ids || []).filter(r => r !== rule.id), rule.id]
                                : (selectedUser.next_year_commission_rule_ids || selectedUser.commission_rule_ids || []).filter(r => r !== rule.id);
                              setSelectedUser({ ...selectedUser, next_year_commission_rule_ids: newRules });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{rule.rule_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={updateUserMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>Send an invitation to a new user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteData.email}
                onChange={(e) =>
                  setInviteData({ ...inviteData, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value) =>
                  setInviteData({ ...inviteData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={inviteUserMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              {inviteUserMutation.isPending ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}