import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, Save, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

export default function MyKPIScorecard() {
  const [user, setUser] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [answers, setAnswers] = useState({});
  const [explanations, setExplanations] = useState({});
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: scorecardKPIs = [] } = useQuery({
    queryKey: ['scorecard-kpis'],
    queryFn: () => base44.entities.KPI.filter({ type: 'scorecard', is_active: true })
  });

  const { data: myEntries = [] } = useQuery({
    queryKey: ['my-scorecard-entries', user?.id],
    queryFn: () => base44.entities.KPIEntry.filter({ user_id: user.id }),
    enabled: !!user
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.KPIEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-scorecard-entries']);
      setSelectedKPI(null);
      setAnswers({});
      setExplanations({});
      toast.success('Scorecard submitted successfully');
    }
  });

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

  const hasSubmittedThisPeriod = (kpi) => {
    const { start, end } = getPeriodDates(kpi);
    return myEntries.some(entry => 
      entry.kpi_id === kpi.id &&
      new Date(entry.reporting_period_start_date) >= start &&
      new Date(entry.reporting_period_end_date) <= end
    );
  };

  const handleSubmit = () => {
    if (!selectedKPI || !user) return;

    const scorecardAnswers = selectedKPI.scorecard_questions.map((q, idx) => {
      const answer = answers[idx];
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
        explanation: explanations[idx] || ''
      };
    });

    const totalPoints = scorecardAnswers.reduce((sum, a) => sum + a.points_earned, 0);
    const maxPoints = scorecardAnswers.reduce((sum, a) => sum + a.max_points, 0);
    const { start, end } = getPeriodDates(selectedKPI);

    submitMutation.mutate({
      kpi_id: selectedKPI.id,
      user_id: user.id,
      reporting_period_start_date: start.toISOString(),
      reporting_period_end_date: end.toISOString(),
      actual_value: totalPoints,
      target_value_at_entry: selectedKPI.target_value || maxPoints,
      scorecard_answers: scorecardAnswers,
      is_flagged: totalPoints < (selectedKPI.target_value || maxPoints),
      manual_entry: true
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My KPI Scorecards</h1>
        <p className="text-slate-600 mt-1">Complete your performance checklists</p>
      </div>

      {!selectedKPI ? (
        <div className="grid gap-4">
          {scorecardKPIs.map((kpi) => {
            const submitted = hasSubmittedThisPeriod(kpi);
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
                        setSelectedKPI(kpi);
                        setAnswers({});
                        setExplanations({});
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
                <p className="text-slate-500">No scorecard KPIs available</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{selectedKPI.name}</CardTitle>
                <CardDescription className="mt-1">{selectedKPI.description}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedKPI(null)}>
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedKPI.scorecard_questions?.map((question, idx) => {
              const answer = answers[idx];
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
                        onClick={() => setAnswers({ ...answers, [idx]: 'yes' })}
                        className="flex-1"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Yes ({question.point_value_if_yes} pts)
                      </Button>
                      <Button
                        variant={answer === 'no' ? 'default' : 'outline'}
                        onClick={() => setAnswers({ ...answers, [idx]: 'no' })}
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
                        onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Target: {question.expected_number_value} • {question.points_per_unit} pts per unit (max {question.max_points})
                      </p>
                    </div>
                  )}

                  {needsExplanation && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900">
                        <AlertCircle className="w-4 h-4" />
                        <Label className="text-sm font-medium">Explanation Required</Label>
                      </div>
                      <Textarea
                        placeholder="Please explain what you'll do to meet this KPI..."
                        value={explanations[idx] || ''}
                        onChange={(e) => setExplanations({ ...explanations, [idx]: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedKPI(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Submit Scorecard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}