import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Calendar, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MyKPIs() {
  const [user, setUser] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: entries = [] } = useQuery({
    queryKey: ['my-kpi-entries', user?.id],
    queryFn: () => base44.entities.KPIEntry.filter({ user_id: user.id }, '-reporting_period_start_date'),
    enabled: !!user
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['active-kpis'],
    queryFn: () => base44.entities.KPI.filter({ is_active: true })
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPIEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-kpi-entries']);
      setSelectedEntry(null);
      setExplanation('');
      toast.success('Explanation saved');
    }
  });

  const getKPIById = (id) => kpis.find(k => k.id === id);

  const currentPeriodEntries = entries.filter(entry => {
    const start = new Date(entry.reporting_period_start_date);
    const end = new Date(entry.reporting_period_end_date);
    const now = new Date();
    return now >= start && now <= end;
  });

  const handleSaveExplanation = () => {
    if (selectedEntry) {
      updateEntryMutation.mutate({
        id: selectedEntry.id,
        data: {
          ...selectedEntry,
          explanation_provided: explanation
        }
      });
    }
  };

  const getStatusColor = (entry) => {
    if (!entry.target_value_at_entry) return 'slate';
    const percentage = (entry.actual_value / entry.target_value_at_entry) * 100;
    if (percentage >= 100) return 'green';
    if (percentage >= 75) return 'amber';
    return 'red';
  };

  const getStatusIcon = (entry) => {
    if (entry.is_flagged) return AlertTriangle;
    if (entry.actual_value >= entry.target_value_at_entry) return CheckCircle;
    return TrendingUp;
  };

  const displayEntries = selectedPeriod === 'current' ? currentPeriodEntries : entries;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My KPIs</h1>
          <p className="text-slate-600 mt-1">Track your performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'current' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('current')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Current Period
          </Button>
          <Button
            variant={selectedPeriod === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('all')}
          >
            All History
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total KPIs</p>
                <p className="text-2xl font-bold text-slate-900">{currentPeriodEntries.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">On Target</p>
                <p className="text-2xl font-bold text-green-600">
                  {currentPeriodEntries.filter(e => e.actual_value >= e.target_value_at_entry).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Flagged</p>
                <p className="text-2xl font-bold text-red-600">
                  {currentPeriodEntries.filter(e => e.is_flagged).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Needs Explanation</p>
                <p className="text-2xl font-bold text-amber-600">
                  {currentPeriodEntries.filter(e => e.is_flagged && !e.explanation_provided).length}
                </p>
              </div>
              <Edit2 className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Entries */}
      <div className="grid gap-4">
        {displayEntries.map((entry) => {
          const kpi = getKPIById(entry.kpi_id);
          if (!kpi) return null;

          const StatusIcon = getStatusIcon(entry);
          const statusColor = getStatusColor(entry);

          return (
            <Card key={entry.id} className={entry.is_flagged ? 'border-red-300 bg-red-50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{kpi.name}</CardTitle>
                      <Badge variant="outline">{kpi.category}</Badge>
                      {entry.is_flagged && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                    
                    <CardDescription>
                      {format(new Date(entry.reporting_period_start_date), 'MMM d')} - 
                      {format(new Date(entry.reporting_period_end_date), 'MMM d, yyyy')}
                    </CardDescription>

                    {/* Performance */}
                    <div className="mt-4 flex items-center gap-6">
                      <div>
                        <p className="text-sm text-slate-500">Actual</p>
                        <p className={`text-2xl font-bold text-${statusColor}-600`}>
                          {entry.actual_value}
                          {kpi.measurement_unit === 'percentage' && '%'}
                          {kpi.measurement_unit === 'USD' && ' $'}
                        </p>
                      </div>

                      {entry.target_value_at_entry && (
                        <>
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
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`w-5 h-5 text-${statusColor}-500`} />
                              <p className={`text-2xl font-bold text-${statusColor}-600`}>
                                {Math.round((entry.actual_value / entry.target_value_at_entry) * 100)}%
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Explanation */}
                    {entry.is_flagged && (
                      <div className="mt-4 p-3 bg-white rounded-lg border">
                        {entry.explanation_provided ? (
                          <div>
                            <p className="text-sm font-medium text-slate-900 mb-1">Explanation:</p>
                            <p className="text-sm text-slate-600">{entry.explanation_provided}</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-amber-600 font-medium">
                              Explanation required for this flagged KPI
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEntry(entry);
                                setExplanation(entry.explanation_provided || '');
                              }}
                            >
                              Add Explanation
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manager Review */}
                    {entry.reviewed_by && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">Manager Feedback:</p>
                        <p className="text-sm text-slate-600">{entry.manager_notes}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Reviewed on {format(new Date(entry.reviewed_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>

                  {entry.explanation_provided && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setExplanation(entry.explanation_provided || '');
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}

        {displayEntries.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No KPI entries for this period yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Explanation Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Explanation</DialogTitle>
            <DialogDescription>
              Explain why this KPI was flagged
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Explanation</Label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Provide context for this result..."
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveExplanation} disabled={!explanation.trim()}>
                Save Explanation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}