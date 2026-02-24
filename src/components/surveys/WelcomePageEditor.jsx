import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import ReactQuill from "react-quill";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image", "video"],
    ["clean"],
  ],
};

export default function WelcomePageEditor({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">Enable Welcome Page</Label>
          <p className="text-xs text-slate-500">Show a welcome screen before the survey starts</p>
        </div>
        <Switch
          checked={form.welcome_page_enabled || false}
          onCheckedChange={v => setForm(p => ({ ...p, welcome_page_enabled: v }))}
        />
      </div>

      {form.welcome_page_enabled && (
        <>
          <div>
            <Label className="text-xs">Welcome Page Content</Label>
            <p className="text-[10px] text-slate-400 mb-1">
              Add instructions, images, or videos to greet respondents
            </p>
            <ReactQuill
              theme="snow"
              value={form.welcome_page_content || ""}
              onChange={v => setForm(p => ({ ...p, welcome_page_content: v }))}
              modules={QUILL_MODULES}
              placeholder="Welcome to our survey! Here's what you need to know..."
              className="bg-white rounded"
            />
          </div>
          <div>
            <Label className="text-xs">Start Button Text</Label>
            <Input
              value={form.welcome_page_button_text || "Start Survey"}
              onChange={e => setForm(p => ({ ...p, welcome_page_button_text: e.target.value }))}
              placeholder="Start Survey"
            />
          </div>
        </>
      )}
    </div>
  );
}