import React from "react";
import { CheckCircle2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SocialShareButtons({ surveyUrl, surveyTitle }) {
  const encodedUrl = encodeURIComponent(surveyUrl);
  const encodedTitle = encodeURIComponent(surveyTitle);

  const platforms = [
    { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: "#1877F2" },
    { name: "X", url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, color: "#000000" },
    { name: "LinkedIn", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, color: "#0A66C2" },
    { name: "Email", url: `mailto:?subject=${encodedTitle}&body=Check out this survey: ${encodedUrl}`, color: "#6B7280" },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {platforms.map(p => (
        <a
          key={p.name}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: p.color }}
        >
          {p.name}
        </a>
      ))}
    </div>
  );
}

export default function SurveyThankYouPage({ survey, answers, styling }) {
  const bgColor = styling.background_color || "#f8fafc";
  const textColor = styling.text_color || "#1e293b";
  const headingColor = styling.heading_color || textColor;
  const descColor = styling.description_color || "#64748b";
  const accentColor = styling.accent_color || "#ea7924";
  const cardBg = styling.card_background_color || "#ffffff";
  const cardBorder = styling.card_border_color || "#e2e8f0";
  const borderRadius = styling.border_radius || "12px";
  const bodyFont = styling.font_family || undefined;
  const headingFont = styling.heading_font_family || styling.font_family || undefined;

  const fontImports = [styling.font_url, styling.heading_font_url].filter(Boolean);

  // Piped text replacement
  const pipedText = (text) => {
    if (!text) return text;
    return text.replace(/\{\{(q_[a-z0-9]+)\}\}/g, (match, qId) => {
      const val = answers?.[qId];
      if (val === undefined || val === null || val === "") return match;
      return Array.isArray(val) ? val.join(", ") : String(val);
    });
  };

  const hasRichContent = survey.thank_you_page_content && survey.thank_you_page_content.replace(/<[^>]*>/g, "").trim().length > 0;
  const surveyUrl = window.location.href;

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4" style={{ backgroundColor: bgColor, fontFamily: bodyFont }}>
      {fontImports.map((url, i) => <link key={i} href={url} rel="stylesheet" />)}
      <div className="w-full max-w-2xl text-center">
        {styling.logo_url && (
          <img src={styling.logo_url} alt="Logo" className="h-12 mb-6 mx-auto" />
        )}

        <div className="p-8 shadow-sm" style={{ backgroundColor: cardBg, borderRadius, border: `1px solid ${cardBorder}` }}>
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: accentColor }} />

          {hasRichContent ? (
            <div
              className="prose prose-sm max-w-none text-left"
              style={{ color: textColor }}
              dangerouslySetInnerHTML={{ __html: pipedText(survey.thank_you_page_content) }}
            />
          ) : (
            <h2 className="text-2xl font-bold mb-2" style={{ color: headingColor, fontFamily: headingFont }}>
              {pipedText(survey.success_message || "Thank you!")}
            </h2>
          )}

          {survey.thank_you_show_social_share && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: cardBorder }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Share2 className="w-4 h-4" style={{ color: descColor }} />
                <span className="text-sm font-medium" style={{ color: descColor }}>Share this survey</span>
              </div>
              <SocialShareButtons surveyUrl={surveyUrl} surveyTitle={survey.title} />
            </div>
          )}

          {survey.redirect_url && (
            <p className="text-sm mt-4" style={{ color: descColor }}>Redirecting...</p>
          )}
        </div>
      </div>
    </div>
  );
}