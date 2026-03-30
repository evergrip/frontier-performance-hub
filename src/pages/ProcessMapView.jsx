import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Users, Clock, ExternalLink, Info, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import ProcessMapLinearView from "../components/processmaps/ProcessMapLinearView";
import ProcessMapComments from "../components/processmaps/ProcessMapComments";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  archived: { label: "Archived", color: "bg-red-100 text-red-700" },
};

export default function ProcessMapView() {
  const urlParams = new URLSearchParams(window.location.search);
  const mapId = urlParams.get("id");

  const { data: processMap, isLoading } = useQuery({
    queryKey: ["processMap", mapId],
    queryFn: () => base44.entities.ProcessMap.filter({ id: mapId }),
    select: (data) => data?.[0],
    enabled: !!mapId,
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
  });

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name || u.email]));

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (!processMap) {
    return <div className="text-center py-20 text-slate-500">Process map not found.</div>;
  }

  const sc = STATUS_CONFIG[processMap.status] || STATUS_CONFIG.draft;
  const isAdmin = user?.role === "admin";
  const isOwner = processMap.process_owner === user?.id;
  const canEdit = isAdmin || isOwner;
  const totalSteps = (processMap.sections || []).reduce((sum, s) => sum + (s.section_steps || []).length, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/ProcessMaps"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{processMap.title}</h1>
              <Badge className={sc.color}>{sc.label}</Badge>
              <span className="text-xs text-slate-400">v{processMap.version || "1.0"}</span>
            </div>
            {processMap.description && <p className="text-sm text-slate-500 mt-1">{processMap.description}</p>}
          </div>
        </div>
        {canEdit && (
          <Link to={`/ProcessMapEditor?id=${processMap.id}`}>
            <Button className="gap-1"><Pencil className="w-4 h-4" /> Edit</Button>
          </Link>
        )}
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{(processMap.sections || []).length}</p>
            <p className="text-xs text-slate-500">Sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{totalSteps}</p>
            <p className="text-xs text-slate-500">Steps</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-slate-800 truncate">{userMap[processMap.process_owner] || "—"}</p>
            <p className="text-xs text-slate-500">Owner</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-slate-800">{processMap.department || "—"}</p>
            <p className="text-xs text-slate-500">Department</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      {(processMap.objective || processMap.scope) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {processMap.objective && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Info className="w-4 h-4" /> Objective</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-600">{processMap.objective}</p></CardContent>
            </Card>
          )}
          {processMap.scope && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Info className="w-4 h-4" /> Scope</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-600">{processMap.scope}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="flow">
        <TabsList>
          <TabsTrigger value="flow">Process Flow</TabsTrigger>
          <TabsTrigger value="comments" className="gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Comments {(processMap.comments || []).length > 0 && `(${processMap.comments.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="mt-4">
          <ProcessMapLinearView processMap={processMap} />
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <ProcessMapComments processMap={processMap} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}