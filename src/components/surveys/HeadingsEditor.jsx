import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

function generateId() {
  return "h_" + Math.random().toString(36).substring(2, 9);
}

export default function HeadingsEditor({ headings = [], onChange }) {
  const addHeading = () => {
    onChange([...headings, { id: generateId(), title: "", description: "" }]);
  };

  const updateHeading = (index, key, value) => {
    const updated = headings.map((h, i) => i === index ? { ...h, [key]: value } : h);
    onChange(updated);
  };

  const removeHeading = (index) => {
    onChange(headings.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Survey Sections</Label>
          <p className="text-xs text-slate-500">Define sections to group and score questions (e.g. Planning, Design, Construction)</p>
        </div>
        <Button variant="outline" size="sm" onClick={addHeading}>
          <Plus className="w-3 h-3 mr-1" /> Add Section
        </Button>
      </div>

      {headings.length === 0 && (
        <p className="text-xs text-slate-400 italic py-2">No sections defined yet. Add sections to enable per-category scoring.</p>
      )}

      {headings.map((h, i) => (
        <Card key={h.id} className="bg-slate-50">
          <CardContent className="p-3 flex items-start gap-2">
            <div className="pt-2 text-slate-400">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Section title (e.g. Planning)"
                value={h.title}
                onChange={e => updateHeading(i, "title", e.target.value)}
                className="font-medium text-sm"
              />
              <Input
                placeholder="Description (optional)"
                value={h.description || ""}
                onChange={e => updateHeading(i, "description", e.target.value)}
                className="text-xs text-slate-500"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => removeHeading(i)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}