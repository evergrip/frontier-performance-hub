import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, AlertTriangle, CheckCircle, MessageSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function KPIReview() {
  const [user, setUser] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [managerNotes, setManagerNotes] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Fetch direct reports
  const { data: relationships = [] } = useQuery({
    queryKey: ['reporting-relationships', user?.id],
    queryFn: () => base44.entities.ReportingRelationship.filter({
      manager_id: user.id,
      is_active: true
    }),
    enabled: !!user
  });

  // Fetch all users to get employee details
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list()
  });

  // Fetch KPI entries for selected user
  const { data: entries = [] } = useQuery({
    queryKey: ['team-kpi-entries', selectedUserId],
    queryFn: () => base44.entities.KPIEntry.filter({ user_id: selectedUserId }, '-reporting_period_start_date'),
    enabled: !!selectedUserId
  });

  // Fetch KPIs
  const { data: kpis = [] } = useQuery({
    queryKey: ['active-kpis'],
    queryFn: () => base44.entities.KPI.filter({ is_active: true })
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPIEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-kpi-entries']);
      setSelectedEntry(null);
      setManagerNotes('');
      toast.success('Review saved');
    }
  });

  const directReports = relationships.map(rel => {
    const employee = allUsers.find(u => u.id === rel.employee_id);
    return employee;
  }).filter(Boolean);

  const getKPIById = (id) => kpis.find(k => k.id === id);

  const handleReview = () => {
    if (selectedEntry) {
      reviewMutation.mutate({
        id: selectedEntry.id,
        data: {
          ...selectedEntry,
          reviewed_by: user.id,
          reviewed_date: new Date().toISOString(),
          manager_notes: managerNotes
        }
      });
    }
  };

  const flaggedEntries = entries.filter(e => e.is_flagged && !e.reviewed_by);
  const reviewedEntries = entries.filter(e => e.reviewed_by);

  const selectedEmployee = allUsers.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Team KPI Review</h1>
        <p className="text-slate-600 mt-1">Review and provide feedback on team member performance</p>
      </div>

      {/* Select Employee */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Team Member</CardTitle>
          <CardDescription>Choose a direct report to review their KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          {directReports.length > 0 ? (
            <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {directReports.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name} - {employee.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No direct reports found</p>
              <p className="text-sm text-slate-400 mt-1">
                Set up reporting relationships in Company Admin
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee KPIs */}
      {selectedUserId && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Needs Review</p>
                    <p className="text-2xl font-bold text-amber-600">{flaggedEntries.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Reviewed</p>
                    <p className="text-2xl font-bold text-green-600">{reviewedEntries.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Entries</p>
                    <p className="text-2xl font-bold text-slate-900">{entries.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Entries Needing Review */}
          {flaggedEntries.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Needs Your Review</h2>
              <div className="grid gap-4">
                {flaggedEntries.map((entry) => {
                  const kpi = getKPIById(entry.kpi_id);
                  if (!kpi) return null;

                  return (
                    <Card key={entry.id} className="border-amber-300 bg-amber-50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{kpi.name}</CardTitle>
                              <Badge variant="outline">{kpi.category}</Badge>
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Flagged
                              </Badge>
                            </div>
                            
                            <CardDescription>
                              {format(new Date(entry.reporting_period_start_date), 'MMM d')} - 
                              {format(new Date(entry.reporting_period_end_date), 'MMM d, yyyy')}
                            </CardDescription>

                            {/* Performance */}
                            <div className="mt-4 flex items-center gap-6">
                              <div>
                                <p className="text-sm text-slate-500">Actual</p>
                                <p className="text-2xl font-bold text-red-600">
                                  {entry.actual_value}
                                  {kpi.measurement_unit === 'percentage' && '%'}
                                  {kpi.measurement_unit === 'USD' && ' $'}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-slate-500">Target</p>
                                <p className="text-2xl font-bold text-slate-900">
                                  {entry.target_value_at_entry}
                                  {kpi.measurement_unit === 'percentage' && '%'}
                                  {kpi.measurement_unit === 'USD' && ' $'}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-slate-500">Achievement</p>
                                <p className="text-2xl font-bold text-red-600">
                                  {Math.round((entry.actual_value / entry.target_value_at_entry) * 100)}%
                                </p>
                              </div>
                            </div>

                            {/* Employee Explanation */}
                            {entry.explanation_provided && (
                              <div className="mt-4 p-3 bg-white rounded-lg border">
                                <p className="text-sm font-medium text-slate-900 mb-1">
                                  {selectedEmployee?.full_name}'s Explanation:
                                </p>
                                <p className="text-sm text-slate-600">{entry.explanation_provided}</p>
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setManagerNotes('');
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Previously Reviewed */}
          {reviewedEntries.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Previously Reviewed</h2>
              <div className="grid gap-4">
                {reviewedEntries.map((entry) => {
                  const kpi = getKPIById(entry.kpi_id);
                  if (!kpi) return null;

                  return (
                    <Card key={entry.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{kpi.name}</CardTitle>
                              <Badge variant="outline">{kpi.category}</Badge>
                              <Badge className="gap-1 bg-green-500">
                                <CheckCircle className="w-3 h-3" />
                                Reviewed
                              </Badge>
                            </div>
                            
                            <CardDescription>
                              {format(new Date(entry.reporting_period_start_date), 'MMM d')} - 
                              {format(new Date(entry.reporting_period_end_date), 'MMM d, yyyy')}
                            </CardDescription>

                            {/* Performance */}
                            <div className="mt-4 flex items-center gap-6 text-sm">
                              <div>
                                <span className="text-slate-500">Actual: </span>
                                <span className="font-semibold">{entry.actual_value}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Target: </span>
                                <span className="font-semibold">{entry.target_value_at_entry}</span>
                              </div>
                            </div>

                            {/* Your Feedback */}
                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm font-medium text-green-900 mb-1">Your Feedback:</p>
                              <p className="text-sm text-slate-600">{entry.manager_notes}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Reviewed on {format(new Date(entry.reviewed_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {entries.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No KPI entries found for this team member</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review KPI Entry</DialogTitle>
            <DialogDescription>
              Provide feedback on this performance metric
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              {/* Employee's Explanation */}
              {selectedEntry.explanation_provided && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900 mb-1">Employee's Explanation:</p>
                  <p className="text-sm text-slate-600">{selectedEntry.explanation_provided}</p>
                </div>
              )}

              {/* Manager Feedback */}
              <div>
                <Label>Your Feedback</Label>
                <Textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Provide constructive feedback..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                  Cancel
                </Button>
                <Button onClick={handleReview} disabled={!managerNotes.trim()}>
                  Submit Review
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}