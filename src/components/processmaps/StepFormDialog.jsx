import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

const EMPTY_STEP = {
  step_id: "", step_description: "", step_type: "task",
  responsible_roles: [], accountable_role: "", consulted_roles: [], informed_roles: [],
  estimated_duration_minutes: null, prerequisites: [],
  inputs: [], outputs: [], resources: [],
  is_decision_point: false, decision_options: [], notes: "",
};

export default function StepFormDialog({ open, onOpenChange, step, stepTypes, allSteps, onSave }) {
  const [form, setForm] = useState(EMPTY_STEP);

  useEffect(() => {
    if (step) {
      setForm({ ...EMPTY_STEP, ...step });
    } else {
      setForm({ ...EMPTY_STEP });
    }
  }, [step, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleArrayField = (field, value) => {
    set(field, value.split(",").map(v => v.trim()).filter(Boolean));
  };

  const addResource = () => {
    set("resources", [...(form.resources || []), { name: "", url: "", type: "template" }]);
  };

  const updateResource = (idx, field, value) => {
    const copy = [...(form.resources || [])];
    copy[idx] = { ...copy[idx], [field]: value };
    set("resources", copy);
  };

  const removeResource = (idx) => {
    set("resources", (form.resources || []).filter((_, i) => i !== idx));
  };

  const addDecisionOption = () => {
    set("decision_options", [...(form.decision_options || []), { option: "", next_step_id: "", description: "" }]);
  };

  const updateDecisionOption = (idx, field, value) => {
    const copy = [...(form.decision_options || [])];
    copy[idx] = { ...copy[idx], [field]: value };
    set("decision_options", copy);
  };

  const removeDecisionOption = (idx) => {
    set("decision_options", (form.decision_options || []).filter((_, i) => i !== idx));
  };

  const addOutput = () => {
    set("outputs", [...(form.outputs || []), { name: "", description: "" }]);
  };

  const updateOutput = (idx, field, value) => {
    const copy = [...(form.outputs || [])];
    copy[idx] = { ...copy[idx], [field]: value };
    set("outputs", copy);
  };

  const removeOutput = (idx) => {
    set("outputs", (form.outputs || []).filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step ? "Edit Step" : "Add Step"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="raci">RACI</TabsTrigger>
            <TabsTrigger value="io">Inputs/Outputs</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Step ID</Label>
                <Input value={form.step_id} onChange={e => set("step_id", e.target.value)} placeholder="e.g. PRE-001" />
              </div>
              <div>
                <Label>Step Type</Label>
                <Select value={form.step_type} onValueChange={v => set("step_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stepTypes.map(t => (
                      <SelectItem key={t.key} value={t.key}>
                        <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea value={form.step_description} onChange={e => set("step_description", e.target.value)} placeholder="What happens in this step..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.estimated_duration_minutes || ""} onChange={e => set("estimated_duration_minutes", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <Label>Prerequisites (step IDs, comma-separated)</Label>
                <Input value={(form.prerequisites || []).join(", ")} onChange={e => handleArrayField("prerequisites", e.target.value)} placeholder="e.g. PRE-001, PRE-002" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_decision_point} onCheckedChange={v => set("is_decision_point", v)} />
              <Label>Decision Point</Label>
            </div>
            {form.is_decision_point && (
              <div className="space-y-2 pl-4 border-l-2 border-red-200">
                <Label className="text-red-600">Decision Options</Label>
                {(form.decision_options || []).map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <Input value={opt.option} onChange={e => updateDecisionOption(idx, "option", e.target.value)} placeholder="Option (e.g. Approved)" className="flex-1" />
                    <Input value={opt.next_step_id} onChange={e => updateDecisionOption(idx, "next_step_id", e.target.value)} placeholder="Next step ID" className="w-32" />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeDecisionOption(idx)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addDecisionOption} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Add Option
                </Button>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="raci" className="space-y-4 mt-4">
            <div>
              <Label>Responsible (comma-separated roles)</Label>
              <Input value={(form.responsible_roles || []).join(", ")} onChange={e => handleArrayField("responsible_roles", e.target.value)} placeholder="e.g. Project Manager, Designer" />
              <p className="text-xs text-slate-400 mt-1">Role(s) that perform the work</p>
            </div>
            <div>
              <Label>Accountable</Label>
              <Input value={form.accountable_role || ""} onChange={e => set("accountable_role", e.target.value)} placeholder="e.g. VP of Operations" />
              <p className="text-xs text-slate-400 mt-1">Single role ultimately answerable</p>
            </div>
            <div>
              <Label>Consulted (comma-separated roles)</Label>
              <Input value={(form.consulted_roles || []).join(", ")} onChange={e => handleArrayField("consulted_roles", e.target.value)} placeholder="e.g. Estimator, Engineer" />
              <p className="text-xs text-slate-400 mt-1">Roles whose input is actively sought</p>
            </div>
            <div>
              <Label>Informed (comma-separated roles)</Label>
              <Input value={(form.informed_roles || []).join(", ")} onChange={e => handleArrayField("informed_roles", e.target.value)} placeholder="e.g. Client, Sales Lead" />
              <p className="text-xs text-slate-400 mt-1">Roles kept up-to-date</p>
            </div>
          </TabsContent>

          <TabsContent value="io" className="space-y-4 mt-4">
            <div>
              <Label>Inputs (comma-separated)</Label>
              <Input value={(form.inputs || []).join(", ")} onChange={e => handleArrayField("inputs", e.target.value)} placeholder="e.g. Signed contract, Client brief" />
              <p className="text-xs text-slate-400 mt-1">What is needed before this step can begin</p>
            </div>
            <div>
              <Label>Outputs</Label>
              {(form.outputs || []).map((out, idx) => (
                <div key={idx} className="flex gap-2 items-start mt-2">
                  <Input value={out.name} onChange={e => updateOutput(idx, "name", e.target.value)} placeholder="Output name" className="flex-1" />
                  <Input value={out.description || ""} onChange={e => updateOutput(idx, "description", e.target.value)} placeholder="Description" className="flex-1" />
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeOutput(idx)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOutput} className="gap-1 text-xs mt-2">
                <Plus className="w-3 h-3" /> Add Output
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 mt-4">
            {(form.resources || []).map((res, idx) => (
              <div key={idx} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input value={res.name} onChange={e => updateResource(idx, "name", e.target.value)} placeholder="Resource name" />
                  <Input value={res.url} onChange={e => updateResource(idx, "url", e.target.value)} placeholder="URL" />
                  <Select value={res.type || "template"} onValueChange={v => updateResource(idx, "type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["template", "example", "training", "policy", "tool"].map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeResource(idx)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addResource} className="gap-1 text-xs w-full border-dashed">
              <Plus className="w-3.5 h-3.5" /> Add Resource
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.step_description?.trim()}>
            {step ? "Update Step" : "Add Step"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}