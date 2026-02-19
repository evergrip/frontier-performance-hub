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
import { Target, TrendingUp, AlertTriangle, CheckCircle, Calendar, Edit2, ClipboardCheck, Save, CheckCircle2, XCircle, PenLine, Sparkles } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import KPIEntryCard from '../components/kpi/KPIEntryCard';
import ManualEntryDialog from '../components/kpi/ManualEntryDialog';

export default function MyKPIs() {
  const [user, setUser] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedScorecard, setSelectedScorecard] = useState(null);
  const [scorecardAnswers, setScorecardAnswers] = useState({});
  const [scorecardExplanations, setScorecardExplanations] = useState({});
  const [manualEntryKPI, setManualEntryKPI] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
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
      toast.success('Saved');
    }
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.KPIEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-kpi-entries']);
      setManualEntryKPI(null);
      toast.success('Entry logged');
    }
  });

  const submitScorecardMutation = useMutation({
    mutationFn: (data) => base44.entities.KPIEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-kpi-entries']);
      setSelectedScorecard(null);
      setScorecardAnswers({});
      setScorecardExplanations({});
      toast.success('Scorecard submitted');
    }
  });

  const getKPIById = (id) => kpis.find(k => k.id === id);

  const getPeriodDates = (kpi) => {
    const now = new Date();
    switch (kpi.reporting_period_type) {
      case 'daily': return { start: startOfDay(now), end: endOfDay(now) };
      case 'weekly': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarterly': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'yearly': return { start: startOfYear(now), end: endOfYear(now) };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const currentPeriodEntries = entries.filter(entry => {
    const start = new Date(entry.reporting_period_start_date);
    const end = new Date(entry.reporting_period_end_date);
    const now = new Date();
    return now >= start && now <= end;
  });

  const displayEntries = selectedPeriod === 'current' ? currentPeriodEntries : entries;

  const scorecardKPIs = kpis.filter(kpi => kpi.type === 'scorecard');
  const manualKPIs = kpis.filter(kpi => kpi.type === 'manual');

  const hasSubmittedForPeriod = (kpi) => {
    const { start, end } = getPeriodDates(kpi);
    return entries.some(entry =>
      entry.kpi_id === kpi.id &&
      new Date(entry.reporting_period_start_date) >= start &&
      new Date(entry.reporting_period_end_date) <= end
    );
  };

  const handleManualSubmit = (entryData) => {
    if (!manualEntryKPI || !user) return;
    const { start, end } = getPeriodDates(manualEntryKPI);
    createEntryMutation.mutate({
      kpi_id: manualEntryKPI.id,
      user_id: user.id,
      reporting_period_start_date: start.toISOString(),
      reporting_period_end_date: end.toISOString(),
      target_value_at_entry: manualEntryKPI.target_value || 0,
      ...entryData
    });
  };

  const handleScorecardSubmit = () => {
    if (!selectedScorecard || !user) return;
    const answersData = selectedScorecard.scorecard_questions.map((q, idx) => {
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
        question_index: idx, question_text: q.question, answer: answer?.toString() || '',
        points_earned: pointsEarned, max_points: q.max_points, is_flagged: isFlagged,
        explanation: scorecardExplanations[idx] || ''
      };
    });
    const totalPoints = answersData.reduce((s, a) => s + a.points_earned, 0);
    const maxPoints = answersData.reduce((s, a) => s + a.max_points, 0);
    const { start, end } = getPeriodDates(selectedScorecard);
    submitScorecardMutation.mutate({
      kpi_id: selectedScorecard.id, user_id: user.id,
      reporting_period_start_date: start.toISOString(), reporting_period_end_date: end.toISOString(),
      actual_value: totalPoints, target_value_at_entry: selectedScorecard.target_value || maxPoints,
      scorecard_answers: answersData, is_flagged: totalPoints < (selectedScorecard.target_value || maxPoints),
      manual_entry: true
    });
  };

  const needsAction = manualKPIs.filter(k => !hasSubmittedForPeriod(k)).length + scorecardKPIs.filter(k => !hasSubmittedForPeriod(k)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Performance</h1>
          <p className="text-slate-600 mt-1">Track your KPIs, log manual entries, and complete scorecards</p>
        </div>
        <Link to={createPageUrl('KPIAgentChat')}>
          <Button variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700">
            <Sparkles className="w-4 h-4 mr-2" /> KPI Assistant
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">KPI Entries</p>
          <p className="text-2xl font-bold text-slate-900">{currentPeriodEntries.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">On Target</p>
          <p className="text-2xl font-bold text-green-600">{currentPeriodEntries.filter(e => e.actual_value >= (e.target_value_at_entry || 0)).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Flagged</p>
          <p className="text-2xl font-bold text-red-600">{currentPeriodEntries.filter(e => e.is_flagged).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Needs Explanation</p>
          <p className="text-2xl font-bold text-amber-600">{currentPeriodEntries.filter(e => e.is_flagged && !e.explanation_provided).length}</p>
        </Card>
        <Card className="p-4 border-orange-200 bg-orange-50">
          <p className="text-xs text-orange-600">Action Needed</p>
          <p className="text-2xl font-bold text-orange-700">{needsAction}</p>
        </Card>
      </div>

      <Tabs defaultValue="kpis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="kpis" className="gap-2"><Target className="w-4 h-4" />KPI Results</TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <PenLine className="w-4 h-4" />Manual Entries
            {manualKPIs.filter(k => !hasSubmittedForPeriod(k)).length > 0 && (
              <span className="ml-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {manualKPIs.filter(k => !hasSubmittedForPeriod(k)).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="scorecards" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />Scorecards
            {scorecardKPIs.filter(k => !hasSubmittedForPeriod(k)).length > 0 && (
              <span className="ml-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {scorecardKPIs.filter(k => !hasSubmittedForPeriod(k)).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* KPI Results Tab */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant={selectedPeriod === 'current' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPeriod('current')}>
              <Calendar className="w-4 h-4 mr-1" />Current Period
            </Button>
            <Button variant={selectedPeriod === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPeriod('all')}>All History</Button>
          </div>

          <div className="grid gap-4">
            {displayEntries.map(entry => (
              <KPIEntryCard key={entry.id} entry={entry} kpi={getKPIById(entry.kpi_id)} onExplain={(e) => { setSelectedEntry(e); setExplanation(e.explanation_provided || ''); }} />
            ))}
            {displayEntries.length === 0 && (
              <Card><CardContent className="py-12 text-center"><Target className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No KPI entries for this period</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Manual Entries Tab */}
        <TabsContent value="manual" className="space-y-4">
          {manualKPIs.length > 0 ? (
            <div className="grid gap-3">
              {manualKPIs.map(kpi => {
                const submitted = hasSubmittedForPeriod(kpi);
                return (
                  <Card key={kpi.id} className={submitted ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <CardTitle className="text-base">{kpi.name}</CardTitle>
                            <Badge variant="outline" className="text-[10px]">{kpi.category}</Badge>
                            <Badge variant="outline" className="text-[10px]">{kpi.reporting_period_type}</Badge>
                            {submitted && <Badge className="bg-green-500 text-[10px]">Submitted</Badge>}
                          </div>
                          {kpi.description && <CardDescription className="text-xs">{kpi.description}</CardDescription>}
                          {kpi.question && <p className="text-sm text-slate-700 mt-2 italic">"{kpi.question}"</p>}
                          {kpi.target_value > 0 && <p className="text-xs text-slate-500 mt-1">Target: {kpi.target_value} {kpi.measurement_unit}</p>}
                        </div>
                        <Button size="sm" disabled={submitted} onClick={() => setManualEntryKPI(kpi)}>
                          {submitted ? 'Done' : 'Log Entry'}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center"><PenLine className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No manual KPIs assigned to you</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Scorecards Tab */}
        <TabsContent value="scorecards" className="space-y-6">
          {!selectedScorecard ? (
            <div className="grid gap-4">
              {scorecardKPIs.map(kpi => {
                const submitted = hasSubmittedForPeriod(kpi);
                return (
                  <Card key={kpi.id} className={submitted ? 'opacity-60' : ''}>
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
                            <div className="mt-2 text-sm text-slate-600">{kpi.scorecard_questions?.length || 0} questions • {kpi.reporting_period_type}</div>
                          </div>
                        </div>
                        <Button onClick={() => { setSelectedScorecard(kpi); setScorecardAnswers({}); setScorecardExplanations({}); }} disabled={submitted}>
                          {submitted ? 'Already Completed' : 'Fill Out'}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
              {scorecardKPIs.length === 0 && (
                <Card><CardContent className="py-12 text-center"><ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No scorecard KPIs assigned to you</p></CardContent></Card>
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
                  <Button variant="outline" onClick={() => setSelectedScorecard(null)}>Back</Button>
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
                        <Label className="text-base font-medium">{idx + 1}. {question.question}</Label>
                        <Badge variant="outline" className="text-xs">Max: {question.max_points} pts</Badge>
                      </div>
                      {question.response_type === 'yes_no' ? (
                        <div className="flex gap-3">
                          <Button variant={answer === 'yes' ? 'default' : 'outline'} onClick={() => setScorecardAnswers({ ...scorecardAnswers, [idx]: 'yes' })} className="flex-1">
                            <CheckCircle2 className="w-4 h-4 mr-2" />Yes ({question.point_value_if_yes} pts)
                          </Button>
                          <Button variant={answer === 'no' ? 'default' : 'outline'} onClick={() => setScorecardAnswers({ ...scorecardAnswers, [idx]: 'no' })} className="flex-1">
                            <XCircle className="w-4 h-4 mr-2" />No ({question.point_value_if_no} pts)
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Input type="number" placeholder="Enter number" value={answer || ''} onChange={(e) => setScorecardAnswers({ ...scorecardAnswers, [idx]: e.target.value })} />
                          <p className="text-xs text-slate-500 mt-1">Target: {question.expected_number_value} • {question.points_per_unit} pts per unit (max {question.max_points})</p>
                        </div>
                      )}
                      {needsExplanation && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 text-amber-900"><AlertTriangle className="w-4 h-4" /><Label className="text-sm font-medium">Explanation Required</Label></div>
                          <Textarea placeholder="Please explain..." value={scorecardExplanations[idx] || ''} onChange={(e) => setScorecardExplanations({ ...scorecardExplanations, [idx]: e.target.value })} rows={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedScorecard(null)}>Cancel</Button>
                  <Button onClick={handleScorecardSubmit} className="bg-purple-600 hover:bg-purple-700"><Save className="w-4 h-4 mr-2" />Submit Scorecard</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Entry Dialog */}
      <ManualEntryDialog
        open={!!manualEntryKPI}
        onOpenChange={() => setManualEntryKPI(null)}
        kpi={manualEntryKPI}
        user={user}
        onSubmit={handleManualSubmit}
        isSubmitting={createEntryMutation.isPending}
      />

      {/* Explanation Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Explanation</DialogTitle>
            <DialogDescription>Explain why this KPI was flagged</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Provide context for this result..." rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedEntry(null)}>Cancel</Button>
              <Button onClick={() => updateEntryMutation.mutate({ id: selectedEntry.id, data: { explanation_provided: explanation } })} disabled={!explanation.trim()}>Save Explanation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}