import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, ClipboardList, Eye, BarChart3, Copy, Check, ExternalLink, Pencil, Trash2, BookOpen, Bookmark, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SurveyFormDialog from "../components/surveys/SurveyFormDialog";
import SurveyTemplateLibrary, { SaveAsTemplateDialog } from "../components/surveys/SurveyTemplateLibrary";
import AIGenerateSurveyDialog from "../components/surveys/AIGenerateSurveyDialog";

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  closed: "bg-red-100 text-red-700",
};

const accessLabels = {
  public: "Public",
  link_only: "Link Only",
  invite_only: "Invite Only",
};

export default function Surveys() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSurvey, setTemplateSurvey] = useState(null);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const queryClient = useQueryClient();

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => base44.entities.Survey.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Survey.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surveys"] }),
  });

  const filtered = surveys.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (survey) => {
    setEditingSurvey(survey);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingSurvey(null);
    setShowForm(true);
  };

  const [copiedId, setCopiedId] = useState(null);

  const getSurveyLink = (survey) => {
    return `${window.location.origin}${createPageUrl("SurveyPublic")}?token=${survey.share_token}`;
  };

  const copyLink = (survey) => {
    navigator.clipboard.writeText(getSurveyLink(survey));
    setCopiedId(survey.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Surveys</h1>
          <p className="text-sm text-slate-500">Create and manage surveys</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)}>
            <BookOpen className="w-4 h-4 mr-2" /> Templates
          </Button>
          <Button variant="outline" onClick={() => setShowAIGenerate(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> AI Generate
          </Button>
          <Button onClick={handleCreate} className="bg-[#ea7924] hover:bg-[#d66a1f]">
            <Plus className="w-4 h-4 mr-2" /> New Survey
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search surveys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 bg-slate-200 rounded w-3/4" /></CardHeader>
              <CardContent><div className="h-4 bg-slate-100 rounded w-1/2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No surveys yet</p>
          <p className="text-sm text-slate-400 mb-4">Create your first survey to get started</p>
          <Button onClick={handleCreate} className="bg-[#ea7924] hover:bg-[#d66a1f]">
            <Plus className="w-4 h-4 mr-2" /> Create Survey
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(survey => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base line-clamp-1">{survey.title}</CardTitle>
                  <Badge className={statusColors[survey.status]}>{survey.status}</Badge>
                </div>
                {survey.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{survey.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{accessLabels[survey.access_type] || "Link Only"}</span>
                  <span>•</span>
                  <span>{survey.questions?.length || 0} questions</span>
                  <span>•</span>
                  <span>{survey.total_responses || 0} responses</span>
                </div>
                {survey.share_token && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Public Link:</p>
                    <div className="flex items-center gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <input
                        readOnly
                        value={getSurveyLink(survey)}
                        className="flex-1 text-xs bg-transparent text-slate-600 truncate outline-none cursor-text"
                        onClick={(e) => e.target.select()}
                      />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => copyLink(survey)}>
                        {copiedId === survey.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(survey)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Link to={createPageUrl("SurveyBuilder") + `?id=${survey.id}`}>
                    <Button variant="ghost" size="sm">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  {survey.share_token && (
                    <Link to={createPageUrl("SurveyPublic") + `?token=${survey.share_token}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                  <Link to={createPageUrl("SurveyResults") + `?id=${survey.id}`}>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setTemplateSurvey(survey)} title="Save as template">
                    <Bookmark className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(survey.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SurveyFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        survey={editingSurvey}
      />

      <SurveyTemplateLibrary
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["surveys"] })}
      />

      {templateSurvey && (
        <SaveAsTemplateDialog
          open={!!templateSurvey}
          onOpenChange={(open) => !open && setTemplateSurvey(null)}
          survey={templateSurvey}
        />
      )}
    </div>
  );
}