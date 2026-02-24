import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Copy, ChevronUp, ChevronDown, Plus, X, Image, Video, Upload, GitBranch } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LogicRuleEditor from "./LogicRuleEditor";

const FILE_TYPE_OPTIONS = [
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
];

export default function QuestionEditor({ question, index, totalCount, questionTypes, onChange, onRemove, onMove, onDuplicate, allQuestions }) {
  const [uploading, setUploading] = useState(false);

  const update = (key, value) => {
    onChange({ ...question, [key]: value });
  };

  const updateOption = (optIndex, value) => {
    const opts = [...(question.options || [])];
    opts[optIndex] = value;
    update("options", opts);
  };

  const addOption = () => {
    update("options", [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`]);
  };

  const removeOption = (optIndex) => {
    update("options", (question.options || []).filter((_, i) => i !== optIndex));
  };

  const handleMediaUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update(field, file_url);
    setUploading(false);
  };

  const toggleFileType = (ft) => {
    const current = question.allowed_file_types || [];
    if (current.includes(ft)) {
      update("allowed_file_types", current.filter(t => t !== ft));
    } else {
      update("allowed_file_types", [...current, ft]);
    }
  };

  const hasOptions = ["radio", "checkbox", "dropdown"].includes(question.type);
  const isFileUpload = question.type === "file_upload";

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1 pt-2">
            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(-1)} disabled={index === 0}>
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(1)} disabled={index === totalCount - 1}>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <Input
                  placeholder="Question text..."
                  value={question.text}
                  onChange={e => update("text", e.target.value)}
                  className="font-medium"
                />
              </div>
              <Select value={question.type} onValueChange={v => update("type", v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                placeholder="Description (optional)"
                value={question.description || ""}
                onChange={e => update("description", e.target.value)}
                className="text-sm text-slate-500"
              />
            </div>

            {/* Options for radio/checkbox/dropdown */}
            {hasOptions && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Options</Label>
                {(question.options || []).map((opt, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <Input value={opt} onChange={e => updateOption(oi, e.target.value)} className="text-sm" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeOption(oi)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="w-3 h-3 mr-1" /> Add Option
                  </Button>
                  <div className="flex items-center gap-2 ml-2">
                    <Switch checked={question.allow_other || false} onCheckedChange={v => update("allow_other", v)} />
                    <Label className="text-xs text-slate-500">Allow "Other" option</Label>
                  </div>
                </div>
              </div>
            )}

            {/* File upload settings */}
            {isFileUpload && (
              <div className="space-y-3 bg-slate-50 rounded-lg p-3">
                <div>
                  <Label className="text-xs text-slate-500">Allowed File Types</Label>
                  <div className="flex gap-3 mt-1">
                    {FILE_TYPE_OPTIONS.map(ft => (
                      <label key={ft.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={(question.allowed_file_types || []).includes(ft.value)}
                          onCheckedChange={() => toggleFileType(ft.value)}
                        />
                        {ft.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Max Files</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={question.max_files || 5}
                    onChange={e => update("max_files", parseInt(e.target.value) || 5)}
                    className="w-24"
                  />
                </div>
              </div>
            )}

            {/* Number min/max */}
            {(question.type === "number" || question.type === "scale") && (
              <div className="flex gap-3">
                <div>
                  <Label className="text-xs">Min</Label>
                  <Input type="number" value={question.min_value ?? ""} onChange={e => update("min_value", e.target.value === "" ? undefined : Number(e.target.value))} className="w-24" />
                </div>
                <div>
                  <Label className="text-xs">Max</Label>
                  <Input type="number" value={question.max_value ?? ""} onChange={e => update("max_value", e.target.value === "" ? undefined : Number(e.target.value))} className="w-24" />
                </div>
              </div>
            )}

            {/* Scale labels */}
            {question.type === "scale" && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Min Label</Label>
                  <Input value={question.min_label || ""} onChange={e => update("min_label", e.target.value)} placeholder="e.g. Not at all likely" className="text-sm" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Max Label</Label>
                  <Input value={question.max_label || ""} onChange={e => update("max_label", e.target.value)} placeholder="e.g. Extremely likely" className="text-sm" />
                </div>
              </div>
            )}

            {/* Question-level media */}
            <div className="flex gap-2">
              <div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleMediaUpload(e, "image_url")} />
                  <Badge variant="outline" className="cursor-pointer gap-1">
                    <Image className="w-3 h-3" /> {question.image_url ? "Change Image" : "Add Image"}
                  </Badge>
                </label>
                {question.image_url && (
                  <div className="mt-1 relative inline-block">
                    <img src={question.image_url} alt="" className="h-16 rounded" />
                    <Button variant="ghost" size="icon" className="absolute -top-1 -right-1 h-5 w-5 bg-white shadow" onClick={() => update("image_url", "")}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <input type="file" accept="video/*" className="hidden" onChange={e => handleMediaUpload(e, "video_url")} />
                  <Badge variant="outline" className="cursor-pointer gap-1">
                    <Video className="w-3 h-3" /> {question.video_url ? "Change Video" : "Add Video"}
                  </Badge>
                </label>
                {question.video_url && (
                  <Button variant="ghost" size="sm" onClick={() => update("video_url", "")} className="text-red-500 text-xs mt-1">
                    Remove Video
                  </Button>
                )}
              </div>
            </div>

            {/* Logic rules */}
            {allQuestions && (
              <LogicRuleEditor
                question={question}
                allQuestions={allQuestions}
                currentIndex={index}
                onChange={onChange}
              />
            )}

            {/* Bottom row */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={question.required || false} onCheckedChange={v => update("required", v)} />
                <Label className="text-xs">Required</Label>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onRemove}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        {uploading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg"><span className="text-sm text-slate-500">Uploading...</span></div>}
      </CardContent>
    </Card>
  );
}