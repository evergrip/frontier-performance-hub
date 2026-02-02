import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportingRelationshipsTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const queryClient = useQueryClient();

  const { data: relationships = [] } = useQuery({
    queryKey: ['reporting-relationships'],
    queryFn: () => base44.entities.ReportingRelationship.filter({ is_active: true })
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReportingRelationship.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reporting-relationships']);
      setShowDialog(false);
      setSelectedManager('');
      setSelectedEmployee('');
      toast.success('Reporting relationship created');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportingRelationship.update(id, { is_active: false, end_date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reporting-relationships']);
      toast.success('Reporting relationship ended');
    }
  });

  const handleCreate = () => {
    if (!selectedManager || !selectedEmployee) {
      toast.error('Please select both manager and employee');
      return;
    }

    if (selectedManager === selectedEmployee) {
      toast.error('Manager and employee cannot be the same person');
      return;
    }

    // Check if relationship already exists
    const exists = relationships.find(
      r => r.manager_id === selectedManager && r.employee_id === selectedEmployee && r.is_active
    );

    if (exists) {
      toast.error('This reporting relationship already exists');
      return;
    }

    createMutation.mutate({
      manager_id: selectedManager,
      employee_id: selectedEmployee,
      start_date: new Date().toISOString(),
      is_active: true
    });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown';
  };

  // Group by manager
  const byManager = {};
  relationships.forEach(rel => {
    if (!byManager[rel.manager_id]) {
      byManager[rel.manager_id] = [];
    }
    byManager[rel.manager_id].push(rel);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reporting Relationships</h2>
          <p className="text-slate-600 mt-1">Define who reports to whom for KPI reviews</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Relationship
        </Button>
      </div>

      {Object.keys(byManager).length > 0 ? (
        <div className="grid gap-4">
          {Object.entries(byManager).map(([managerId, reports]) => (
            <Card key={managerId}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg">{getUserName(managerId)}</CardTitle>
                  <Badge>{reports.length} direct report{reports.length !== 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((rel) => (
                      <TableRow key={rel.id}>
                        <TableCell className="font-medium">{getUserName(rel.employee_id)}</TableCell>
                        <TableCell>
                          {new Date(rel.start_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rel.is_active ? 'default' : 'secondary'}>
                            {rel.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rel.is_active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('End this reporting relationship?')) {
                                  deleteMutation.mutate(rel.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No reporting relationships defined yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Click "Add Relationship" to set up your organizational structure
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reporting Relationship</DialogTitle>
            <DialogDescription>
              Define who reports to whom for KPI review purposes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Manager *</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Employee *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => u.id !== selectedManager)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                Add Relationship
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}