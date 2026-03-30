import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Map, Eye, Pencil, Trash2, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import ProcessMapFormDialog from "../components/processmaps/ProcessMapFormDialog";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  archived: { label: "Archived", color: "bg-red-100 text-red-700" },
};

export default function ProcessMaps() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["processMaps"],
    queryFn: () => base44.entities.ProcessMap.list("-updated_date", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
  });

  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || (user?.permissions || []).includes("process_maps");

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name || u.email]));

  const filtered = maps.filter(m => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.title?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        (m.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleDelete = async (map) => {
    if (!window.confirm(`Delete "${map.title}"? This cannot be undone.`)) return;
    await base44.entities.ProcessMap.delete(map.id);
    queryClient.invalidateQueries({ queryKey: ["processMaps"] });
  };

  const handleDuplicate = async (map) => {
    const { id, created_date, updated_date, created_by, ...rest } = map;
    await base44.entities.ProcessMap.create({
      ...rest,
      title: `${map.title} (Copy)`,
      status: "draft",
      version: "1.0",
      is_current: false,
    });
    queryClient.invalidateQueries({ queryKey: ["processMaps"] });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Process Maps</h1>
          <p className="text-sm text-slate-500 mt-1">Documented workflows, SOPs, and process guides.</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingMap(null); setDialogOpen(true); }} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> New Process Map
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, description, or tag..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No process maps found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search || statusFilter !== "all" ? "Try adjusting your filters." : canCreate ? 'Click "New Process Map" to get started.' : "No process maps have been created yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(map => {
            const sc = STATUS_CONFIG[map.status] || STATUS_CONFIG.draft;
            const sectionCount = (map.sections || []).length;
            const stepCount = (map.sections || []).reduce((sum, s) => sum + (s.section_steps || []).length, 0);
            const isOwner = map.process_owner === user?.id;

            return (
              <Card key={map.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={sc.color}>{sc.label}</Badge>
                    <span className="text-xs text-slate-400">v{map.version || "1.0"}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">{map.title}</h3>
                  {map.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{map.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                    <span>{sectionCount} section{sectionCount !== 1 ? "s" : ""}</span>
                    <span>•</span>
                    <span>{stepCount} step{stepCount !== 1 ? "s" : ""}</span>
                    {map.department && <><span>•</span><span className="capitalize">{map.department}</span></>}
                  </div>

                  {map.process_owner && (
                    <p className="text-xs text-slate-400 mb-3">
                      Owner: <span className="text-slate-600">{userMap[map.process_owner] || "Unknown"}</span>
                    </p>
                  )}

                  {(map.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {map.tags.slice(0, 4).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{t}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                    <Link to={`/ProcessMapView?id=${map.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </Link>
                    {(isAdmin || isOwner) && (
                      <>
                        <Link to={`/ProcessMapEditor?id=${map.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleDuplicate(map)}>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(map)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProcessMapFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        processMap={editingMap}
        users={users}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["processMaps"] })}
      />
    </div>
  );
}