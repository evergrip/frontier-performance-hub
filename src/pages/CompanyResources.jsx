import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FolderOpen } from "lucide-react";
import ResourceFormDialog from "../components/resources/ResourceFormDialog";
import ResourceCard from "../components/resources/ResourceCard";

const DEPARTMENTS = [
  { value: "all", label: "All Departments" },
  { value: "sales", label: "Sales" },
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "precon", label: "Pre-Construction" },
  { value: "projects", label: "Projects" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
  { value: "company_wide", label: "Company-Wide" },
];

const DEPT_LABELS = Object.fromEntries(DEPARTMENTS.map(d => [d.value, d.label]));

const TYPES = [
  { value: "all", label: "All Types" },
  { value: "process", label: "Process / SOP" },
  { value: "template", label: "Template" },
  { value: "guide", label: "Guide" },
  { value: "tool", label: "Tool / Software" },
  { value: "policy", label: "Policy" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Other" },
];

export default function CompanyResources() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["companyResources"],
    queryFn: () => base44.entities.CompanyResource.list("-created_date", 200),
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === "admin";

  const filtered = resources.filter(r => {
    if (deptFilter !== "all" && r.department !== deptFilter) return false;
    if (typeFilter !== "all" && r.resource_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchTags = (r.tags || []).some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }
    return true;
  });

  // Sort: pinned first, then by title
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return (a.title || "").localeCompare(b.title || "");
  });

  // Group by department
  const grouped = {};
  sorted.forEach(r => {
    const dept = r.department || "other";
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(r);
  });

  // Department display order
  const deptOrder = ["company_wide", "sales", "precon", "projects", "operations", "finance", "hr", "marketing"];
  const sortedDepts = Object.keys(grouped).sort((a, b) => {
    const ai = deptOrder.indexOf(a);
    const bi = deptOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setDialogOpen(true);
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"?`)) return;
    await base44.entities.CompanyResource.delete(resource.id);
    queryClient.invalidateQueries({ queryKey: ["companyResources"] });
  };

  const handleAdd = () => {
    setEditingResource(null);
    setDialogOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company Resources</h1>
          <p className="text-sm text-slate-500 mt-1">Centralized links to processes, tools, and key documents.</p>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Add Resource
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, description, or tag..."
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No resources found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search || deptFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters."
              : isAdmin ? "Click \"Add Resource\" to get started." : "No resources have been added yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDepts.map(dept => (
            <div key={dept}>
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">
                {DEPT_LABELS[dept] || dept}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[dept].map(resource => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editingResource}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["companyResources"] })}
      />
    </div>
  );
}