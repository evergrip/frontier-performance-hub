import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, X, Bell, Mail } from "lucide-react";

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
    </TabsContent>
  );
}