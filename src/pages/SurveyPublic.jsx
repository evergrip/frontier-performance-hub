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
  const headingColor = styling.heading_color || textColor;
  const descColor = styling.description_color || undefined;
  const cardBg = styling.card_background_color || "#ffffff";
  const cardBorder = styling.card_border_color || "#e2e8f0";
  const inputBg = styling.input_background_color || "#ffffff";
  const inputBorder = styling.input_border_color || "#e2e8f0";
  const inputText = styling.input_text_color || textColor;
  const borderRadius = styling.border_radius || "12px";
  const btnRadius = styling.button_border_radius || "12px";
  const btnHover = styling.button_hover_color || undefined;
  const bodyFont = styling.font_family || undefined;
  const headingFont = styling.heading_font_family || styling.font_family || undefined;
  const [btnHovered, setBtnHovered] = useState(false);

  const setAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  // Piped text: replace {{q_xxx}} with actual answer values
  const pipedText = (text) => {
    if (!text) return text;
    return text.replace(/\{\{(q_[a-z0-9]+)\}\}/g, (match, qId) => {
      const val = answers[qId];
      if (val === undefined || val === null || val === "") return match;
      return Array.isArray(val) ? val.join(", ") : String(val);
    });
  };

  // Skip/show logic evaluation
  const evaluateLogic = (question) => {
    const rules = question.logic_rules;
    if (!rules || rules.length === 0) return true; // no rules = always show

    return rules.every(rule => {
      const condAnswer = answers[rule.condition_question_id];
      let conditionMet = false;

      switch (rule.operator) {
        case "equals":
          conditionMet = String(condAnswer) === String(rule.value);
          break;
        case "not_equals":
          conditionMet = String(condAnswer) !== String(rule.value);
          break;
        case "contains":
          if (Array.isArray(condAnswer)) conditionMet = condAnswer.includes(rule.value);
          else conditionMet = String(condAnswer || "").includes(rule.value);
          break;
        case "not_contains":
          if (Array.isArray(condAnswer)) conditionMet = !condAnswer.includes(rule.value);
          else conditionMet = !String(condAnswer || "").includes(rule.value);
          break;
        case "greater_than":
          conditionMet = Number(condAnswer) > Number(rule.value);
          break;
        case "less_than":
          conditionMet = Number(condAnswer) < Number(rule.value);
          break;
        case "is_answered":
          conditionMet = condAnswer !== undefined && condAnswer !== null && condAnswer !== "" && (!Array.isArray(condAnswer) || condAnswer.length > 0);
          break;
        case "is_not_answered":
          conditionMet = condAnswer === undefined || condAnswer === null || condAnswer === "" || (Array.isArray(condAnswer) && condAnswer.length === 0);
          break;
        default:
          conditionMet = true;
      }

      return rule.logic_type === "show" ? conditionMet : !conditionMet;
    });
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

  const visibleQuestions = (survey.questions || []).filter(q => evaluateLogic(q));
  const totalQuestions = visibleQuestions.length;
  const answeredCount = visibleQuestions.filter(q => {
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== "" && (!Array.isArray(a) || a.length > 0);
  }).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const fontImports = [styling.font_url, styling.heading_font_url].filter(Boolean);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor, fontFamily: bodyFont }}>
        {fontImports.map((url, i) => <link key={i} href={url} rel="stylesheet" />)}
        <div className="text-center max-w-md px-6">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: accentColor }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: headingColor, fontFamily: headingFont }}>
            {pipedText(survey.success_message || "Thank you!")}
          </h2>
          {survey.redirect_url && <p className="text-sm" style={{ color: descColor || "#64748b" }}>Redirecting...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: bgColor, color: textColor, fontFamily: bodyFont }}>
      {fontImports.map((url, i) => <link key={i} href={url} rel="stylesheet" />)}
      <style>{`
        .survey-input input, .survey-input textarea, .survey-input select, .survey-input [role="combobox"] {
          background-color: ${inputBg} !important;
          border-color: ${inputBorder} !important;
          color: ${inputText} !important;
        }
        .survey-input input:focus, .survey-input textarea:focus {
          border-color: ${accentColor} !important;
          box-shadow: 0 0 0 1px ${accentColor}40 !important;
        }
      `}</style>
      <div className="max-w-2xl mx-auto">
        {styling.logo_url && (
          <img src={styling.logo_url} alt="Logo" className="h-12 mb-4" />
        )}
        {styling.banner_image_url && (
          <img src={styling.banner_image_url} alt="Banner" className="w-full mb-6 max-h-48 object-cover" style={{ borderRadius }} />
        )}

        <h1 className="text-3xl font-bold mb-2" style={{ color: headingColor, fontFamily: headingFont }}>{survey.title}</h1>
        {survey.description && <p className="text-lg mb-6" style={{ color: descColor || `${textColor}cc` }}>{survey.description}</p>}

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1" style={{ color: descColor || "#64748b" }}>
            <span>{answeredCount} of {totalQuestions} answered</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${styling.progress_bar_color || accentColor}20` }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, backgroundColor: styling.progress_bar_color || accentColor }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {visibleQuestions.map((q, idx) => (
            <div key={q.id} className="p-6 shadow-sm survey-input" style={{ backgroundColor: cardBg, borderRadius, border: `1px solid ${cardBorder}` }}>
              <div className="mb-3">
                <Label className="text-base font-medium" style={{ color: headingColor, fontFamily: headingFont }}>
                  {pipedText(q.text)}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {q.description && <p className="text-sm mt-1" style={{ color: descColor || `${textColor}99` }}>{pipedText(q.description)}</p>}
                {q.image_url && <img src={q.image_url} alt="" className="mt-3 max-h-64 object-contain" style={{ borderRadius }} />}
                {q.video_url && <video src={q.video_url} controls className="mt-3 max-h-64 w-full" style={{ borderRadius }} />}
              </div>

              <QuestionInput
                question={q}
                value={answers[q.id]}
                onChange={(val) => setAnswer(q.id, val)}
                accentColor={accentColor}
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full py-4 text-lg font-semibold transition-colors"
            style={{
              backgroundColor: btnHovered && btnHover ? btnHover : buttonColor,
              color: buttonTextColor,
              borderRadius: btnRadius,
            }}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> : null}
            {submitting ? "Submitting..." : "Submit Survey"}
          </button>
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
        <div className="inline-block">
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
          {(question.min_label || question.max_label) && (
            <div className="flex justify-between mt-1.5 text-xs text-slate-500">
              <span>{question.min_label || ""}</span>
              <span>{question.max_label || ""}</span>
            </div>
          )}
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