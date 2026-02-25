import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ThankYouPageEditor({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="font-medium">Thank You Page Content (HTML)</Label>
        <p className="text-[10px] text-slate-400 mb-1">
          Create a thank you page with HTML. Use {"{{q_xxx}}"} to pipe in answers.
          Leave empty to use the simple success message instead.
        </p>
        <Textarea
          value={form.thank_you_page_content || ""}
          onChange={e => setForm(p => ({ ...p, thank_you_page_content: e.target.value }))}
          placeholder="<h2>Thank you!</h2><p>We appreciate your feedback.</p>"
          rows={6}
          className="font-mono text-xs"
        />
        {form.thank_you_page_content && (
          <div className="mt-2 p-3 border rounded-lg bg-slate-50">
            <p className="text-[10px] text-slate-400 mb-1">Preview:</p>
            <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: form.thank_you_page_content }} />
          </div>
        )}
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