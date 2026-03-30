import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const DEPARTMENTS = ["Sales", "Preconstruction", "Construction", "Admin", "Management", "Marketing", "Company-Wide"];

export default function ProcessMapFormDialog({ open, onOpenChange, processMap, users, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", objective: "", scope: "",
    department: "", process_owner: "", tags: "",
    requires_approval: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (processMap) {
      setForm({
        title: processMap.title || "",
        description: processMap.description || "",
        objective: processMap.objective || "",
        scope: processMap.scope || "",
        department: processMap.department || "",
        process_owner: processMap.process_owner || "",
        tags: (processMap.tags || []).join(", "),
        requires_approval: processMap.requires_approval || false,
      });
    } else {
      setForm({ title: "", description: "", objective: "", scope: "", department: "", process_owner: "", tags: "", requires_approval: false });
    }
  }, [processMap, open]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    const data = {
      title: form.title.trim(),
      description: form.description.trim(),
      objective: form.objective.trim(),
      scope: form.scope.trim(),
      department: form.department,
      process_owner: form.process_owner || null,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      requires_approval: form.requires_approval,
    };

    if (processMap) {
      await base44.entities.ProcessMap.update(processMap.id, data);
      setSaving(false);
      onOpenChange(false);
      onSaved?.();
    } else {
      data.status = "draft";
      data.version = "1.0";
      data.is_current = true;
      data.sections = [];
      const created = await base44.entities.ProcessMap.create(data);
      setSaving(false);
      onOpenChange(false);
      onSaved?.();
      // Navigate to editor immediately
      window.location.href = `/ProcessMapEditor?id=${created.id}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{processMap ? "Edit Process Map" : "New Process Map"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Pre-Construction Process" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="High-level overview..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department</Label>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Process Owner</Label>
              <Select value={form.process_owner} onValueChange={v => setForm(f => ({ ...f, process_owner: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {(users || []).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Objective</Label>
            <Textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} placeholder="Business purpose / success criteria..." rows={2} />
          </div>
          <div>
            <Label>Scope</Label>
            <Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="What is in/out of scope..." rows={2} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. precon, sales, onboarding" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {processMap ? "Save Changes" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}