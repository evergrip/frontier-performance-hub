import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, X, Bell, Mail, Info } from "lucide-react";

export default function AlertRecipientsTab({ form, setForm, questions }) {
  const [newEmail, setNewEmail] = useState("");

  const recipients = form.alert_recipients || [];
  const includedQuestionIds = form.alert_include_question_ids || [];

  const addRecipient = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (recipients.includes(email)) return;
    setForm(prev => ({ ...prev, alert_recipients: [...recipients, email] }));
    setNewEmail("");
  };

  const removeRecipient = (email) => {
    setForm(prev => ({ ...prev, alert_recipients: recipients.filter(r => r !== email) }));
  };

  const toggleQuestion = (qId) => {
    if (includedQuestionIds.includes(qId)) {
      setForm(prev => ({ ...prev, alert_include_question_ids: includedQuestionIds.filter(id => id !== qId) }));
    } else {
      setForm(prev => ({ ...prev, alert_include_question_ids: [...includedQuestionIds, qId] }));
    }
  };

  const availableQuestions = (questions || []).filter(q => q.text);

  return (
    <TabsContent value="alerts" className="space-y-5 mt-4">
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Bell className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Response Alerts</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Get notified by email whenever someone submits a response to this survey.
          </p>
        </div>
      </div>

      {/* Email recipients */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Alert Recipients</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addRecipient} className="shrink-0 gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
        {recipients.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {recipients.map(email => (
              <Badge key={email} variant="secondary" className="gap-1 py-1 px-2 text-xs">
                <Mail className="w-3 h-3" />
                {email}
                <button type="button" onClick={() => removeRecipient(email)} className="ml-1 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No recipients added yet. Alerts are disabled until you add at least one email.</p>
        )}
      </div>

      {/* Question answers to include */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Include Answers in Alert</Label>
        <p className="text-xs text-slate-500">Choose which question answers to highlight in the notification email.</p>
        {availableQuestions.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Add questions to the survey first, then come back here to select which answers to include.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
            {availableQuestions.map((q, idx) => {
              const isSelected = includedQuestionIds.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleQuestion(q.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    isSelected ? "bg-orange-50 border border-orange-200 text-orange-800" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs shrink-0 ${
                    isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300"
                  }`}>
                    {isSelected ? "✓" : ""}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">Q{idx + 1}.</span>
                  <span className="truncate">{q.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom message */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-start gap-2">
          <Label className="text-sm font-medium">Custom Alert Message</Label>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-medium">Available placeholders:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li><code className="bg-blue-100 px-1 rounded">{'{{survey_title}}'}</code> — Survey name</li>
                <li><code className="bg-blue-100 px-1 rounded">{'{{total_responses}}'}</code> — Response count</li>
                <li><code className="bg-blue-100 px-1 rounded">{'{{answers_table}}'}</code> — Table of selected question answers</li>
                {availableQuestions.slice(0, 3).map((q, i) => (
                  <li key={q.id}><code className="bg-blue-100 px-1 rounded">{`{{answer:${q.id}}}`}</code> — Answer to "{q.text.length > 30 ? q.text.slice(0, 30) + '...' : q.text}"</li>
                ))}
                {availableQuestions.length > 3 && <li className="text-blue-500">...and more question IDs from the builder</li>}
              </ul>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Email Subject</Label>
          <Input
            value={form.alert_subject || ''}
            onChange={e => setForm(prev => ({ ...prev, alert_subject: e.target.value }))}
            placeholder="New Response: {{survey_title}}"
          />
        </div>

        <div>
          <Label className="text-xs">Email Body</Label>
          <Textarea
            value={form.alert_body || ''}
            onChange={e => setForm(prev => ({ ...prev, alert_body: e.target.value }))}
            placeholder={`A new response was submitted for {{survey_title}}.\n\n{{answers_table}}\n\nTotal responses: {{total_responses}}`}
            rows={6}
          />
          <p className="text-[10px] text-slate-400 mt-1">Leave blank to use the default alert template.</p>
        </div>
      </div>
    </TabsContent>
  );
}