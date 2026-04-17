import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronRight, Clock, AlertCircle, ExternalLink } from "lucide-react";
import moment from "moment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function InProgressResponses({ inProgressResponses, questions, surveyId, shareToken }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SurveyResponse.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["survey-responses", surveyId] }),
  });

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (inProgressResponses.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        No in-progress responses
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 mb-3">
        These respondents started but haven't submitted yet. They may still return to complete the survey.
      </p>
      {inProgressResponses.map((r, i) => {
        const isExpanded = expandedIds.has(r.id);
        const answeredCount = questions.filter(q => {
          const a = r.responses?.[q.id];
          return a !== undefined && a !== null && a !== "" && (!Array.isArray(a) || a.length > 0);
        }).length;
        const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
        const displayName = r.respondent_name || r.respondent_email || "Anonymous";
        const lastUpdated = r.updated_date || r.created_date;

        return (
          <Card key={r.id}>
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
              onClick={() => toggleExpanded(r.id)}
            >
              {isExpanded
                ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-700">{displayName}</span>
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                  {progressPct}% complete
                </Badge>
                <span className="text-xs text-slate-400">{answeredCount}/{questions.length} answered</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-xs text-slate-400 hidden sm:inline flex items-center gap-1">
                  <Clock className="w-3 h-3 inline" /> {moment(lastUpdated).fromNow()}
                </span>
                {shareToken && (
                  <a
                    href={`${window.location.origin}/SurveyPublic?token=${shareToken}&response_id=${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Continue / Edit
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                  onClick={() => {
                    if (confirm("Delete this in-progress response?")) deleteMutation.mutate(r.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {isExpanded && (
              <CardContent className="pt-0 pb-4">
                <div className="border-t pt-4">
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {questions.map(q => {
                      const answer = r.responses?.[q.id];
                      const hasAnswer = answer !== undefined && answer !== null && answer !== "" && (!Array.isArray(answer) || answer.length > 0);
                      return (
                        <div key={q.id} className={!hasAnswer ? "opacity-40" : ""}>
                          <p className="text-xs font-medium text-slate-500">{q.text}</p>
                          {hasAnswer ? (
                            <p className="text-sm mt-0.5">
                              {Array.isArray(answer) ? answer.join(", ") : String(answer)}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-300 italic mt-0.5">Not answered yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}