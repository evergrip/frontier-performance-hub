import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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

export default function ThankYouPageEditor({ form, setForm }) {
  const hasRichContent = !!form.thank_you_page_content;

  return (
    <div className="space-y-4">
      <div>
        <Label className="font-medium">Thank You Page Content</Label>
        <p className="text-[10px] text-slate-400 mb-1">
          Create a rich thank you page with links, images, and piped text (e.g. {"{{q_xxx}}"} to show answers).
          Leave empty to use the simple success message instead.
        </p>
        <ReactQuill
          theme="snow"
          value={form.thank_you_page_content || ""}
          onChange={v => setForm(p => ({ ...p, thank_you_page_content: v }))}
          modules={QUILL_MODULES}
          placeholder="Thank you for your feedback! Here's a summary of your responses..."
          className="bg-white rounded"
        />
      </div>

      <div>
        <Label className="text-xs">Fallback Success Message (plain text)</Label>
        <Input
          value={form.success_message || ""}
          onChange={e => setForm(p => ({ ...p, success_message: e.target.value }))}
          placeholder="Thank you for completing this survey!"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Used if no rich content is set above. Supports {"{{q_xxx}}"} piped text.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-medium">Show Social Share Buttons</Label>
          <p className="text-[10px] text-slate-500">Let respondents share the survey on social media</p>
        </div>
        <Switch
          checked={form.thank_you_show_social_share || false}
          onCheckedChange={v => setForm(p => ({ ...p, thank_you_show_social_share: v }))}
        />
      </div>

      <div>
        <Label className="text-xs">Redirect URL (optional)</Label>
        <Input
          value={form.redirect_url || ""}
          onChange={e => setForm(p => ({ ...p, redirect_url: e.target.value }))}
          placeholder="https://..."
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Automatically redirect after a few seconds
        </p>
      </div>
    </div>
  );
}