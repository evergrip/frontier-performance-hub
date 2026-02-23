import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Upload, X, Star, Loader2 } from "lucide-react";
import FileUploadField from "../components/surveys/FileUploadField";

export default function SurveyPublic() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const inviteToken = urlParams.get("invite");

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  const { data: survey, isLoading, error } = useQuery({
    queryKey: ["survey-public", token],
    queryFn: async () => {
      const res = await base44.functions.invoke("publicSurvey", { action: "get", token });
      return res.data?.survey || null;
    },
    enabled: !!token,
  });

  const styling = survey?.styling || {};
  const bgColor = styling.background_color || "#f8fafc";
  const textColor = styling.text_color || "#1e293b";
  const accentColor = styling.accent_color || "#ea7924";
  const buttonColor = styling.button_color || "#ea7924";
  const buttonTextColor = styling.button_text_color || "#ffffff";

  const setAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    await base44.functions.invoke("publicSurvey", {
      action: "submit",
      token,
      invite: inviteToken || "",
      responseData: {
        responses: answers,
        completion_time_seconds: Math.round((Date.now() - startTime) / 1000),
      },
    });

    setSubmitted(true);
    setSubmitting(false);

    if (survey.redirect_url) {
      setTimeout(() => { window.location.href = survey.redirect_url; }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Survey not found or no longer available.</p>
      </div>
    );
  }

  if (survey.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <p style={{ color: textColor }}>This survey is not currently accepting responses.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center max-w-md px-6">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: accentColor }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
            {survey.success_message || "Thank you!"}
          </h2>
          {survey.redirect_url && <p className="text-sm text-slate-500">Redirecting...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: bgColor, color: textColor }}>
      <div className="max-w-2xl mx-auto">
        {styling.logo_url && (
          <img src={styling.logo_url} alt="Logo" className="h-12 mb-4" />
        )}
        {styling.banner_image_url && (
          <img src={styling.banner_image_url} alt="Banner" className="w-full rounded-xl mb-6 max-h-48 object-cover" />
        )}

        <h1 className="text-3xl font-bold mb-2">{survey.title}</h1>
        {survey.description && <p className="text-lg opacity-80 mb-8">{survey.description}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {(survey.questions || []).map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="mb-3">
                <Label className="text-base font-medium">
                  {q.text}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {q.description && <p className="text-sm opacity-60 mt-1">{q.description}</p>}
                {q.image_url && <img src={q.image_url} alt="" className="mt-3 rounded-lg max-h-64 object-contain" />}
                {q.video_url && <video src={q.video_url} controls className="mt-3 rounded-lg max-h-64 w-full" />}
              </div>

              <QuestionInput
                question={q}
                value={answers[q.id]}
                onChange={(val) => setAnswer(q.id, val)}
                accentColor={accentColor}
              />
            </div>
          ))}

          <Button
            type="submit"
            className="w-full py-6 text-lg font-semibold rounded-xl"
            style={{ backgroundColor: buttonColor, color: buttonTextColor }}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {submitting ? "Submitting..." : "Submit Survey"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange, accentColor }) {
  switch (question.type) {
    case "text":
    case "email":
    case "phone":
    case "url":
      return <Input type={question.type === "text" ? "text" : question.type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={question.placeholder || ""} required={question.required} />;

    case "textarea":
      return <Textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={4} required={question.required} />;

    case "number":
      return <Input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)} min={question.min_value} max={question.max_value} required={question.required} />;

    case "date":
      return <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} required={question.required} />;

    case "radio":
      const radioIsOther = value && !(question.options || []).includes(value);
      return (
        <div className="space-y-2">
          <RadioGroup value={radioIsOther ? "__other__" : (value || "")} onValueChange={(v) => onChange(v === "__other__" ? "" : v)}>
            {(question.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`${question.id}-${i}`} />
                <Label htmlFor={`${question.id}-${i}`} className="cursor-pointer">{opt}</Label>
              </div>
            ))}
            {question.allow_other && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="__other__" id={`${question.id}-other`} />
                <Label htmlFor={`${question.id}-other`} className="cursor-pointer">Other</Label>
              </div>
            )}
          </RadioGroup>
          {question.allow_other && radioIsOther && (
            <Input placeholder="Please specify..." value={value || ""} onChange={e => onChange(e.target.value)} className="ml-6 max-w-xs" />
          )}
        </div>
      );

    case "checkbox":
      const cbOptions = question.options || [];
      const cbValues = value || [];
      const cbOtherValues = cbValues.filter(v => !cbOptions.includes(v) && v !== "");
      const cbOtherText = cbOtherValues.length > 0 ? cbOtherValues[0] : "";
      const cbOtherChecked = cbOtherValues.length > 0 || (cbValues.includes("__other__"));
      return (
        <div className="space-y-2">
          {cbOptions.map((opt, i) => {
            const checked = cbValues.includes(opt);
            return (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    onChange(c ? [...cbValues.filter(v => cbOptions.includes(v) || (v !== "" && !cbOptions.includes(v))), opt] : cbValues.filter(v => v !== opt));
                  }}
                />
                {opt}
              </label>
            );
          })}
          {question.allow_other && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={cbOtherChecked}
                  onCheckedChange={(c) => {
                    if (c) {
                      onChange([...cbValues.filter(v => cbOptions.includes(v)), ""]);
                    } else {
                      onChange(cbValues.filter(v => cbOptions.includes(v)));
                    }
                  }}
                />
                Other
              </label>
              {cbOtherChecked && (
                <Input
                  placeholder="Please specify..."
                  value={cbOtherText}
                  onChange={e => {
                    const knownValues = cbValues.filter(v => cbOptions.includes(v));
                    onChange(e.target.value ? [...knownValues, e.target.value] : [...knownValues, ""]);
                  }}
                  className="ml-6 max-w-xs mt-1"
                />
              )}
            </div>
          )}
        </div>
      );

    case "dropdown":
      const ddIsOther = value && !(question.options || []).includes(value) && value !== "__other__";
      const ddSelectValue = ddIsOther ? "__other__" : (value || "");
      return (
        <div className="space-y-2">
          <Select value={ddSelectValue} onValueChange={(v) => onChange(v === "__other__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {(question.options || []).map((opt, i) => (
                <SelectItem key={i} value={opt}>{opt}</SelectItem>
              ))}
              {question.allow_other && <SelectItem value="__other__">Other...</SelectItem>}
            </SelectContent>
          </Select>
          {question.allow_other && (ddSelectValue === "__other__" || ddIsOther) && (
            <Input placeholder="Please specify..." value={ddIsOther ? value : ""} onChange={e => onChange(e.target.value)} className="max-w-xs" />
          )}
        </div>
      );

    case "rating":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => onChange(n)} className="p-1">
              <Star className={`w-8 h-8 ${(value || 0) >= n ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`} />
            </button>
          ))}
        </div>
      );

    case "scale":
      const min = question.min_value ?? 1;
      const max = question.max_value ?? 10;
      return (
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                value === n ? "text-white" : "bg-white hover:bg-slate-50"
              }`}
              style={value === n ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
            >
              {n}
            </button>
          ))}
        </div>
      );

    case "file_upload":
      return (
        <FileUploadField
          value={value || []}
          onChange={onChange}
          allowedTypes={question.allowed_file_types || ["image", "video", "audio"]}
          maxFiles={question.max_files || 5}
        />
      );

    default:
      return <Input value={value || ""} onChange={e => onChange(e.target.value)} />;
  }
}