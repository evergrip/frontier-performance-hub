import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function MultiUrlInput({ value, onChange, required }) {
  const urls = Array.isArray(value) ? value : (value ? [value] : [""]);

  const update = (index, val) => {
    const next = [...urls];
    next[index] = val;
    onChange(next);
  };

  const add = () => onChange([...urls, ""]);

  const remove = (index) => {
    const next = urls.filter((_, i) => i !== index);
    onChange(next.length === 0 ? [""] : next);
  };

  return (
    <div className="space-y-2">
      {urls.map((url, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            type="url"
            value={url}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://..."
            required={required && i === 0}
          />
          {urls.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-slate-400 hover:text-red-500" onClick={() => remove(i)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="text-xs gap-1 text-slate-500" onClick={add}>
        <Plus className="w-3.5 h-3.5" /> Add another URL
      </Button>
    </div>
  );
}