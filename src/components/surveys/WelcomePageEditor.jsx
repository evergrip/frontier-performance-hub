import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

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
            <Label className="text-xs">Welcome Page Content (HTML)</Label>
            <p className="text-[10px] text-slate-400 mb-1">
              Add instructions, images, or formatted text to greet respondents. Supports HTML.
            </p>
            <Textarea
              value={form.welcome_page_content || ""}
              onChange={e => setForm(p => ({ ...p, welcome_page_content: e.target.value }))}
              placeholder="<h2>Welcome!</h2><p>Thank you for taking the time to complete our survey.</p>"
              rows={6}
              className="font-mono text-xs"
            />
            {form.welcome_page_content && (
              <div className="mt-2 p-3 border rounded-lg bg-slate-50">
                <p className="text-[10px] text-slate-400 mb-1">Preview:</p>
                <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: form.welcome_page_content }} />
              </div>
            )}
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