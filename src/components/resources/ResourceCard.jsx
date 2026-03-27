import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Pin, Pencil, Trash2 } from "lucide-react";

const TYPE_LABELS = {
  process: "Process / SOP",
  template: "Template",
  guide: "Guide",
  tool: "Tool",
  policy: "Policy",
  reference: "Reference",
  other: "Other",
};

const TYPE_COLORS = {
  process: "bg-blue-100 text-blue-700",
  template: "bg-purple-100 text-purple-700",
  guide: "bg-green-100 text-green-700",
  tool: "bg-orange-100 text-orange-700",
  policy: "bg-red-100 text-red-700",
  reference: "bg-slate-100 text-slate-700",
  other: "bg-gray-100 text-gray-700",
};

export default function ResourceCard({ resource, isAdmin, onEdit, onDelete }) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      {resource.is_pinned && (
        <Pin className="absolute top-3 right-3 w-3.5 h-3.5 text-orange-400 fill-orange-400" />
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-slate-800 hover:text-orange-600 truncate transition-colors"
            >
              {resource.title}
            </a>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
          {resource.description && (
            <p className="text-xs text-slate-500 mb-2 line-clamp-2">{resource.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] border-0 ${TYPE_COLORS[resource.resource_type] || TYPE_COLORS.other}`}>
              {TYPE_LABELS[resource.resource_type] || resource.resource_type}
            </Badge>
            {(resource.tags || []).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(resource)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDelete(resource)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}