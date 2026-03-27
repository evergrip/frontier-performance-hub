import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEPARTMENTS = [
  { value: "sales", label: "Sales" },
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "precon", label: "Pre-Construction" },
  { value: "projects", label: "Projects" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
  { value: "company_wide", label: "Company-Wide" },
];

const TYPES = [
  { value: "process", label: "Process / SOP" },
  { value: "template", label: "Template" },
  { value: "guide", label: "Guide" },
  { value: "tool", label: "Tool / Software" },
  { value: "policy", label: "Policy" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Other" },
];

export default function ResourceFormDialog({ open, onOpenChange, resource, onSaved }) {
  const [form, setForm] = useState({
    title: "", url: "", department: "", resource_type: "", description: "", tags: [], is_pinned: false
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resource) {
      setForm({
        title: resource.title || "",
        url: resource.url || "",
        department: resource.department || "",
        resource_type: resource.resource_type || "",
        description: resource.description || "",
        tags: resource.tags || [],
        is_pinned: resource.is_pinned || false,
      });
    } else {
      setForm({ title: "", url: "", department: "", resource_type: "", description: "", tags: [], is_pinned: false });
    }
    setTagInput("");
  }, [resource, open]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput("");
  };

  const removeTag = (tag) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSave = async () => {
    setSaving(true);
    if (resource) {
      await base44.entities.CompanyResource.update(resource.id, form);
    } else {
      await base44.entities.CompanyResource.create(form);
    }
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const isValid = form.title && form.url && form.department && form.resource_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{resource ? "Edit Resource" : "Add Resource"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Sales Process SOP" />
          </div>
          <div>
            <Label>URL *</Label>
            <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://docs.google.com/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department *</Label>
              <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.resource_type} onValueChange={v => setForm(p => ({ ...p, resource_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this resource..." rows={2} />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}} placeholder="Add tag..." className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_pinned} onCheckedChange={v => setForm(p => ({ ...p, is_pinned: v }))} />
            <Label className="cursor-pointer">Pin to top</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>{saving ? "Saving..." : resource ? "Update" : "Add Resource"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}