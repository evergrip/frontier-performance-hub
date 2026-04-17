import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Upload, X, Star, Loader2 } from "lucide-react";
import FileUploadField from "../components/surveys/FileUploadField";
import RankingInput from "../components/surveys/RankingInput";
import SurveyWelcomePage from "../components/surveys/SurveyWelcomePage";
import SurveyThankYouPage from "../components/surveys/SurveyThankYouPage";
import MultiUrlInput from "../components/surveys/MultiUrlInput";
import SurveyProgressBanner from "../components/surveys/SurveyProgressBanner";
import { toast } from "sonner";

export default function SurveyPublic() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const inviteToken = urlParams.get("invite");
  const resumeParam = urlParams.get("resume");
  const responseIdParam = urlParams.get("response_id");

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [showWelcome, setShowWelcome] = useState(true);

  // Save/resume state
  const [responseId, setResponseId] = useState(responseIdParam || null);
  const [resumeToken, setResumeToken] = useState(resumeParam || localStorage.getItem(`survey_resume_${token}`) || '');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const { data: survey, isLoading, error } = useQuery({
    queryKey: ["survey-public", token],
    queryFn: async () => {
      const res = await base44.functions.invoke('publicSurvey', { action: "get", token });
      return res.data?.survey || null;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
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

  // Load saved progress on mount
  useEffect(() => {
    if (!token || progressLoaded) return;
    const loadProgress = async () => {
      try {
        const res = await base44.functions.invoke('publicSurvey', {
          action: 'load_progress',
          token,
          response_id: responseIdParam || undefined,
          resumeToken: resumeToken || undefined,
        });
        if (res.data?.found) {
          setAnswers(res.data.responses || {});
          setResponseId(res.data.response_id);
          if (res.data.resume_token) {
            setResumeToken(res.data.resume_token);
            localStorage.setItem(`survey_resume_${token}`, res.data.resume_token);
          }
          setShowWelcome(false); // skip welcome if resuming
          setLastSaved('previously');
        }
      } catch (e) {
        console.warn('Could not load progress:', e.message);
      }
      setProgressLoaded(true);
    };
    loadProgress();
  }, [token]);

  // Auto-save after each answer change (debounced 2s)
  const prevAnswersRef = useRef(JSON.stringify({}));
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    if (!token || !progressLoaded) return;
    const currentJson = JSON.stringify(answers);
    if (currentJson === prevAnswersRef.current) return;
    if (Object.keys(answers).length === 0) return;
    prevAnswersRef.current = currentJson;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveProgress(true);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [answers, token, progressLoaded]);

  const saveProgress = async (silent = false) => {
    if (Object.keys(answers).length === 0 && !silent) {
      toast.info('No answers to save yet.');
      return;
    }
    setSaving(true);
    const res = await base44.functions.invoke('publicSurvey', {
      action: 'save_progress',
      token,
      invite: inviteToken || '',
      response_id: responseId || undefined,
      responseData: { responses: answers },
    });
    if (res.data?.response_id) {
      setResponseId(res.data.response_id);
    }
    if (res.data?.resume_token) {
      setResumeToken(res.data.resume_token);
      localStorage.setItem(`survey_resume_${token}`, res.data.resume_token);
    }
    setSaving(false);
    const now = new Date();
    setLastSaved(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    if (!silent) {
      toast.success('Progress saved! You can close this page and return later.');
    }
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

  // Forward-declare sectionScores — computed after evaluateLogic is defined
  let sectionScores = {};

  // Check if a follow-up question should be visible based on section score rules
  const isFollowupVisible = (question) => {
    if (!question.is_followup) return true; // not a followup, normal visibility
    const rules = survey.section_followup_rules || [];
    for (const rule of rules) {
      if ((rule.followup_question_ids || []).includes(question.id)) {
        const sectionScore = sectionScores[rule.heading_id]?.score || 0;
        if (sectionScore >= rule.threshold_score) return true;
      }
    }
    return false; // followup question but no rule matched
  };

  // Skip/show logic evaluation
  const evaluateLogic = (question) => {
    // First check section-based follow-up rules
    if (!isFollowupVisible(question)) return false;

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

  // Calculate real-time section scores (must be after evaluateLogic)
  const calculateSectionScores = () => {
    if (!survey) return {};
    const questions = survey.questions || [];
    const headings = survey.headings || [];
    const scores = {};
    headings.forEach(h => { scores[h.id] = { score: 0, max: 0 }; });

    for (const q of questions) {
      if (!q.category_id || !scores[q.category_id]) continue;
      if (!evaluateLogic(q)) continue;

      const answer = answers[q.id];
      const weight = q.weight || 1;
      let qScore = 0;
      let qMax = 0;

      if (q.type === 'scale' && q.option_scores && Object.keys(q.option_scores).length > 0) {
        const vals = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
        qMax = vals.length > 0 ? Math.max(...vals) : (q.max_value || 10);
        const key = String(answer);
        if (answer != null && q.option_scores[key] !== undefined) qScore = Number(q.option_scores[key]) || 0;
      } else if ((q.type === 'radio' || q.type === 'dropdown') && q.option_scores && Object.keys(q.option_scores).length > 0) {
        const vals = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
        qMax = vals.length > 0 ? Math.max(...vals) : 0;
        if (answer && q.option_scores[answer] !== undefined) qScore = Number(q.option_scores[answer]) || 0;
      } else if (q.type === 'checkbox' && q.option_scores && Object.keys(q.option_scores).length > 0) {
        const vals = Object.values(q.option_scores).map(Number).filter(n => !isNaN(n));
        qMax = vals.reduce((s, v) => s + Math.max(0, v), 0);
        if (Array.isArray(answer)) answer.forEach(a => { if (q.option_scores[a] !== undefined) qScore += Number(q.option_scores[a]) || 0; });
      } else if (q.type === 'rating') {
        qMax = q.points || 5;
        qScore = Math.min(Number(answer) || 0, qMax);
      } else if (q.type === 'scale') {
        qMax = q.max_value || 10;
        qScore = Math.min(Number(answer) || 0, qMax);
      } else if (q.type === 'number') {
        qMax = q.points || 0;
        qScore = Math.min(Number(answer) || 0, qMax);
      }

      scores[q.category_id].score += qScore * weight;
      scores[q.category_id].max += qMax * weight;
    }
    return scores;
  };

  sectionScores = calculateSectionScores();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    await base44.functions.invoke('publicSurvey', {
      action: "submit",
      token,
      invite: inviteToken || "",
      response_id: responseId || undefined,
      responseData: {
        responses: answers,
        completion_time_seconds: Math.round((Date.now() - startTime) / 1000),
      },
    });

    // Clean up local resume token on successful submit
    localStorage.removeItem(`survey_resume_${token}`);

    setSubmitted(true);
    setSubmitting(false);

    if (survey.redirect_url) {
      setTimeout(() => { window.location.href = survey.redirect_url; }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#ea7924]" />
        <p className="text-sm text-slate-400">Loading survey...</p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Survey not found or no longer available.</p>
        <p className="text-xs text-slate-400">Token: {token || '(none)'} | Query: {window.location.search} | Error: {error?.message || '(none)'}</p>
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

  const surveyHeadings = survey.headings || [];
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
      <SurveyThankYouPage survey={survey} answers={answers} styling={styling} />
    );
  }

  // Show welcome page if enabled and not yet dismissed
  if (survey.welcome_page_enabled && showWelcome) {
    return (
      <SurveyWelcomePage survey={survey} styling={styling} onStart={() => setShowWelcome(false)} />
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
          <div className="w-full mb-6" style={{ borderRadius, overflow: 'hidden' }}>
            <img 
              src={styling.banner_image_url} 
              alt="Banner" 
              style={{
                display: 'block',
                width: '100%',
                ...(styling.banner_fit === 'auto'
                  ? { height: 'auto' }
                  : {
                      height: styling.banner_height || '200px',
                      objectFit: styling.banner_fit || 'cover',
                      objectPosition: styling.banner_position || 'center center',
                    }
                ),
              }}
            />
          </div>
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

        {/* Save progress banner */}
        <div className="mb-6">
          <SurveyProgressBanner
            saving={saving}
            lastSaved={lastSaved}
            onSave={() => saveProgress(false)}
            resumeUrl={resumeToken ? `${window.location.origin}/SurveyPublic?token=${token}&resume=${resumeToken}` : null}
            buttonColor={buttonColor}
            buttonTextColor={buttonTextColor}
            btnRadius={btnRadius}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {visibleQuestions.map((q, idx) => {
            // Show section heading before first question in each section
            const heading = surveyHeadings.find(h => h.id === q.category_id);
            const isFirstInSection = heading && (idx === 0 || visibleQuestions[idx - 1]?.category_id !== q.category_id);
            return (
            <React.Fragment key={q.id}>
            {isFirstInSection && (
              <div className="pt-4 pb-1">
                <h2 className="text-xl font-bold" style={{ color: headingColor, fontFamily: headingFont }}>{heading.title}</h2>
                {heading.description && <p className="text-sm mt-1" style={{ color: descColor || `${textColor}99` }}>{heading.description}</p>}
                <div className="h-px mt-3" style={{ backgroundColor: `${accentColor}30` }} />
              </div>
            )}
            <div className="p-6 shadow-sm survey-input" style={{ backgroundColor: cardBg, borderRadius, border: `1px solid ${cardBorder}` }}>
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
            </React.Fragment>
            );
          })}

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
      return <Input type={question.type === "text" ? "text" : question.type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={question.placeholder || ""} required={question.required} />;

    case "url":
      return <MultiUrlInput value={value} onChange={onChange} required={question.required} />;

    case "textarea":
      return <Textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={4} required={question.required} />;

    case "number":
      return <Input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)} min={question.min_value} max={question.max_value} required={question.required} />;

    case "date":
      return <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} required={question.required} />;

    case "radio": {
      const radioOpts = question.options || [];
      const radioIsOther = value !== undefined && value !== null && value !== "" && !radioOpts.includes(value);
      const radioSelectedValue = radioIsOther ? "__other__" : (value || "");
      return (
        <div className="space-y-2">
          <RadioGroup value={radioSelectedValue} onValueChange={(v) => {
            if (v === "__other__") onChange("__other__");
            else onChange(v);
          }}>
            {radioOpts.map((opt, i) => (
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
          {question.allow_other && (radioSelectedValue === "__other__" || radioIsOther) && (
            <Input
              placeholder="Please specify..."
              value={radioIsOther && value !== "__other__" ? value : ""}
              onChange={e => onChange(e.target.value || "__other__")}
              className="ml-6 max-w-xs"
              autoFocus
            />
          )}
        </div>
      );
    }

    case "checkbox": {
      const cbOptions = question.options || [];
      const cbValues = Array.isArray(value) ? value : [];
      const cbOtherText = cbValues.find(v => v !== "" && !cbOptions.includes(v) && v !== "__other__") || "";
      const cbOtherChecked = cbValues.some(v => !cbOptions.includes(v));
      return (
        <div className="space-y-2">
          {cbOptions.map((opt, i) => {
            const checked = cbValues.includes(opt);
            return (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    if (c) {
                      onChange([...cbValues, opt]);
                    } else {
                      onChange(cbValues.filter(v => v !== opt));
                    }
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
                    const known = cbValues.filter(v => cbOptions.includes(v));
                    if (c) {
                      onChange([...known, "__other__"]);
                    } else {
                      onChange(known);
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
                    const known = cbValues.filter(v => cbOptions.includes(v));
                    onChange([...known, e.target.value || "__other__"]);
                  }}
                  className="ml-6 max-w-xs mt-1"
                  autoFocus
                />
                )}
            </div>
          )}
        </div>
      );
    }

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

    case "ranking":
      return (
        <RankingInput
          options={question.options || []}
          value={value}
          onChange={onChange}
          accentColor={accentColor}
        />
      );

    default:
      return <Input value={value || ""} onChange={e => onChange(e.target.value)} />;
  }
}