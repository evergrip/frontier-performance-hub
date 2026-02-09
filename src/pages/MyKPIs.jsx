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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Calendar, Edit2, ClipboardCheck, Save, CheckCircle2, XCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export default function MyKPIs() {
  const [user, setUser] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedScorecard, setSelectedScorecard] = useState(null);
  const [scorecardAnswers, setScorecardAnswers] = useState({});
  const [scorecardExplanations, setScorecardExplanations] = useState({});
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
    queryKey: ['active-kpis', user?.id],
    queryFn: async () => {
      const allKPIs = await base44.entities.KPI.filter({ is_active: true });
      return allKPIs.filter(kpi => 
        !kpi.assigned_user_ids || 
        kpi.assigned_user_ids.length === 0 || 
        kpi.assigned_user_ids.includes(user.id)
      );
    },
    enabled: !!user
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

  const scorecardKPIs = kpis.filter(kpi => kpi.type === 'scorecard');
  const regularKPIs = kpis.filter(kpi => kpi.type !== 'scorecard');

  const getPeriodDates = (kpi) => {
    const now = new Date();
    switch (kpi.reporting_period_type) {
      case 'daily':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'weekly':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const hasSubmittedScorecard = (kpi) => {
    const { start, end } = getPeriodDates(kpi);
    return entries.some(entry => 
      entry.kpi_id === kpi.id &&
      new Date(entry.reporting_period_start_date) >= start &&
      new Date(entry.reporting_period_end_date) <= end
    );
  };

  const submitScorecardMutation = useMutation({
    mutationFn: (data) => base44.entities.KPIEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-kpi-entries']);
      setSelectedScorecard(null);
      setScorecardAnswers({});
      setScorecardExplanations({});
      toast.success('Scorecard submitted successfully');
    }
  });

  const handleScorecardSubmit = () => {
    if (!selectedScorecard || !user) return;

    const scorecardAnswersData = selectedScorecard.scorecard_questions.map((q, idx) => {
      const answer = scorecardAnswers[idx];
      let pointsEarned = 0;
      let isFlagged = false;

      if (q.response_type === 'yes_no') {
        pointsEarned = answer === 'yes' ? q.point_value_if_yes : q.point_value_if_no;
        isFlagged = pointsEarned < q.max_points;
      } else if (q.response_type === 'number') {
        const numValue = parseFloat(answer) || 0;
        pointsEarned = Math.min(numValue * (q.points_per_unit || 1), q.max_points || 1);
        isFlagged = pointsEarned < q.max_points;
      }

      return {
        question_index: idx,
        question_text: q.question,
        answer: answer?.toString() || '',
        points_earned: pointsEarned,
        max_points: q.max_points,
        is_flagged: isFlagged,
        explanation: scorecardExplanations[idx] || ''
      };
    });

    const totalPoints = scorecardAnswersData.reduce((sum, a) => sum + a.points_earned, 0);
    const maxPoints = scorecardAnswersData.reduce((sum, a) => sum + a.max_points, 0);
    const { start, end } = getPeriodDates(selectedScorecard);

    submitScorecardMutation.mutate({
      kpi_id: selectedScorecard.id,
      user_id: user.id,
      reporting_period_start_date: start.toISOString(),
      reporting_period_end_date: end.toISOString(),
      actual_value: totalPoints,
      target_value_at_entry: selectedScorecard.target_value || maxPoints,
      scorecard_answers: scorecardAnswersData,
      is_flagged: totalPoints < (selectedScorecard.target_value || maxPoints),
      manual_entry: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My KPIs</h1>
        <p className="text-slate-600 mt-1">Track your performance metrics and complete scorecards</p>
      </div>

      <Tabs defaultValue="kpis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="kpis" className="gap-2">
            <Target className="w-4 h-4" />
            KPI Entries
          </TabsTrigger>
          <TabsTrigger value="scorecards" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Scorecards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-6">
          <div className="flex justify-end gap-2">
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
        </TabsContent>

        <TabsContent value="scorecards" className="space-y-6">
          {!selectedScorecard ? (
            <div className="grid gap-4">
              {scorecardKPIs.map((kpi) => {
                const submitted = hasSubmittedScorecard(kpi);
                return (
                  <Card key={kpi.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{kpi.name}</CardTitle>
                              {submitted && <Badge className="bg-green-500">Completed</Badge>}
                            </div>
                            <CardDescription className="mt-1">{kpi.description}</CardDescription>
                            <div className="mt-2 text-sm text-slate-600">
                              {kpi.scorecard_questions?.length || 0} questions • {kpi.reporting_period_type}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedScorecard(kpi);
                            setScorecardAnswers({});
                            setScorecardExplanations({});
                          }}
                          disabled={submitted}
                        >
                          {submitted ? 'Already Completed' : 'Fill Out'}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}

              {scorecardKPIs.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No scorecard KPIs assigned to you</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedScorecard.name}</CardTitle>
                    <CardDescription className="mt-1">{selectedScorecard.description}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedScorecard(null)}>
                    Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedScorecard.scorecard_questions?.map((question, idx) => {
                  const answer = scorecardAnswers[idx];
                  const needsExplanation = question.requires_explanation_if_wrong && (
                    (question.response_type === 'yes_no' && answer === 'no') ||
                    (question.response_type === 'number' && parseFloat(answer || 0) < (question.expected_number_value || 0))
                  );

                  return (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <Label className="text-base font-medium">
                          {idx + 1}. {question.question}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          Max: {question.max_points} pts
                        </Badge>
                      </div>

                      {question.response_type === 'yes_no' ? (
                        <div className="flex gap-3">
                          <Button
                            variant={answer === 'yes' ? 'default' : 'outline'}
                            onClick={() => setScorecardAnswers({ ...scorecardAnswers, [idx]: 'yes' })}
                            className="flex-1"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Yes ({question.point_value_if_yes} pts)
                          </Button>
                          <Button
                            variant={answer === 'no' ? 'default' : 'outline'}
                            onClick={() => setScorecardAnswers({ ...scorecardAnswers, [idx]: 'no' })}
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            No ({question.point_value_if_no} pts)
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Input
                            type="number"
                            placeholder="Enter number"
                            value={answer || ''}
                            onChange={(e) => setScorecardAnswers({ ...scorecardAnswers, [idx]: e.target.value })}
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Target: {question.expected_number_value} • {question.points_per_unit} pts per unit (max {question.max_points})
                          </p>
                        </div>
                      )}

                      {needsExplanation && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 text-amber-900">
                            <AlertTriangle className="w-4 h-4" />
                            <Label className="text-sm font-medium">Explanation Required</Label>
                          </div>
                          <Textarea
                            placeholder="Please explain what you'll do to meet this KPI..."
                            value={scorecardExplanations[idx] || ''}
                            onChange={(e) => setScorecardExplanations({ ...scorecardExplanations, [idx]: e.target.value })}
                            rows={3}
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedScorecard(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleScorecardSubmit} className="bg-purple-600 hover:bg-purple-700">
                    <Save className="w-4 h-4 mr-2" />
                    Submit Scorecard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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