import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, List, Users, Clock, Star, FileImage, FileVideo, Music } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";

export default function SurveyResults() {
  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get("id");

  const { data: survey } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: async () => {
      const s = await base44.entities.Survey.filter({ id: surveyId });
      return s[0];
    },
    enabled: !!surveyId,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["survey-responses", surveyId],
    queryFn: () => base44.entities.SurveyResponse.filter({ survey_id: surveyId }, "-created_date"),
    enabled: !!surveyId,
  });

  if (!survey) {
    return <div className="max-w-4xl mx-auto text-center text-slate-500 mt-12">Loading...</div>;
  }

  const questions = survey.questions || [];
  const avgTime = responses.length > 0
    ? Math.round(responses.reduce((s, r) => s + (r.completion_time_seconds || 0), 0) / responses.length)
    : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={createPageUrl("Surveys")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{survey.title} — Results</h1>
          <p className="text-sm text-slate-500">{responses.length} responses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{responses.length}</p>
              <p className="text-xs text-slate-500">Total Responses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{avgTime > 60 ? `${Math.round(avgTime / 60)}m` : `${avgTime}s`}</p>
              <p className="text-xs text-slate-500">Avg. Completion Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{questions.length}</p>
              <p className="text-xs text-slate-500">Questions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="individual">Individual Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 mt-4">
          {questions.map(q => (
            <QuestionSummary key={q.id} question={q} responses={responses} />
          ))}
        </TabsContent>

        <TabsContent value="individual" className="space-y-4 mt-4">
          {responses.map((r, i) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">
                    Response #{responses.length - i}
                    {r.respondent_name && ` — ${r.respondent_name}`}
                    {!r.respondent_name && r.respondent_email && ` — ${r.respondent_email}`}
                  </CardTitle>
                  <span className="text-xs text-slate-400">{moment(r.submitted_at || r.created_date).format("MMM D, YYYY h:mm A")}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {questions.map(q => (
                    <div key={q.id}>
                      <p className="text-xs font-medium text-slate-500">{q.text}</p>
                      <ResponseDisplay question={q} answer={r.responses?.[q.id]} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {responses.length === 0 && (
            <Card className="p-8 text-center text-slate-500">No responses yet</Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResponseDisplay({ question, answer }) {
  if (answer === undefined || answer === null || answer === "") {
    return <p className="text-sm text-slate-400 italic">No answer</p>;
  }

  if (question.type === "file_upload" && Array.isArray(answer)) {
    return (
      <div className="flex gap-2 flex-wrap mt-1">
        {answer.map((url, i) => {
          if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) {
            return <img key={i} src={url} alt="" className="h-16 rounded border" />;
          }
          if (/\.(mp4|mov|avi|webm)/i.test(url)) {
            return <video key={i} src={url} controls className="h-16 rounded border" />;
          }
          if (/\.(mp3|wav|ogg|aac)/i.test(url)) {
            return <audio key={i} src={url} controls className="h-8" />;
          }
          return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">File {i + 1}</a>;
        })}
      </div>
    );
  }

  if (question.type === "rating") {
    return (
      <div className="flex gap-0.5 mt-1">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} className={`w-4 h-4 ${n <= answer ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
        ))}
      </div>
    );
  }

  if (Array.isArray(answer)) {
    return <p className="text-sm mt-1">{answer.join(", ")}</p>;
  }

  return <p className="text-sm mt-1">{String(answer)}</p>;
}

function QuestionSummary({ question, responses }) {
  const answers = responses.map(r => r.responses?.[question.id]).filter(a => a !== undefined && a !== null && a !== "");
  const responseRate = responses.length > 0 ? Math.round((answers.length / responses.length) * 100) : 0;

  if (["radio", "dropdown"].includes(question.type)) {
    const counts = {};
    answers.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
    const max = Math.max(...Object.values(counts), 1);

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <p className="font-medium text-sm">{question.text}</p>
            <Badge variant="outline" className="text-xs">{responseRate}% answered</Badge>
          </div>
          <div className="space-y-2">
            {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([opt, count]) => (
              <div key={opt} className="flex items-center gap-3">
                <div className="w-32 text-sm truncate">{opt}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div className="bg-[#ea7924] h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="text-sm text-slate-600 w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (question.type === "checkbox") {
    const counts = {};
    answers.forEach(arr => {
      (Array.isArray(arr) ? arr : []).forEach(a => { counts[a] = (counts[a] || 0) + 1; });
    });
    const max = Math.max(...Object.values(counts), 1);

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <p className="font-medium text-sm">{question.text}</p>
            <Badge variant="outline" className="text-xs">{responseRate}% answered</Badge>
          </div>
          <div className="space-y-2">
            {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([opt, count]) => (
              <div key={opt} className="flex items-center gap-3">
                <div className="w-32 text-sm truncate">{opt}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div className="bg-[#ea7924] h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="text-sm text-slate-600 w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (["rating", "scale", "number"].includes(question.type)) {
    const nums = answers.map(Number).filter(n => !isNaN(n));
    const avg = nums.length > 0 ? (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1) : "—";

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium text-sm">{question.text}</p>
            <Badge variant="outline" className="text-xs">{responseRate}% answered</Badge>
          </div>
          <p className="text-3xl font-bold text-[#ea7924]">{avg}</p>
          <p className="text-xs text-slate-500">Average from {nums.length} responses</p>
        </CardContent>
      </Card>
    );
  }

  if (question.type === "file_upload") {
    const allFiles = answers.flat();
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium text-sm">{question.text}</p>
            <Badge variant="outline" className="text-xs">{allFiles.length} files</Badge>
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            {allFiles.slice(0, 12).map((url, i) => {
              if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) {
                return <img key={i} src={url} alt="" className="h-16 w-16 rounded border object-cover" />;
              }
              return <div key={i} className="h-16 w-16 rounded border flex items-center justify-center bg-slate-50"><FileImage className="w-6 h-6 text-slate-400" /></div>;
            })}
            {allFiles.length > 12 && <Badge variant="outline">+{allFiles.length - 12} more</Badge>}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Text-based questions
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="font-medium text-sm">{question.text}</p>
          <Badge variant="outline" className="text-xs">{responseRate}% answered</Badge>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {answers.slice(0, 10).map((a, i) => (
            <p key={i} className="text-sm bg-slate-50 rounded px-3 py-1.5">{String(a)}</p>
          ))}
          {answers.length > 10 && <p className="text-xs text-slate-400">+{answers.length - 10} more responses</p>}
        </div>
      </CardContent>
    </Card>
  );
}