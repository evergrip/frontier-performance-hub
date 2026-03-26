import React, { useState } from "react";
import { Loader2 } from "lucide-react";

export default function SurveyWelcomePage({ survey, styling, onStart }) {
  const bgColor = styling.background_color || "#f8fafc";
  const textColor = styling.text_color || "#1e293b";
  const headingColor = styling.heading_color || textColor;
  const descColor = styling.description_color || undefined;
  const buttonColor = styling.button_color || "#ea7924";
  const buttonTextColor = styling.button_text_color || "#ffffff";
  const btnRadius = styling.button_border_radius || "12px";
  const btnHover = styling.button_hover_color || undefined;
  const borderRadius = styling.border_radius || "12px";
  const bodyFont = styling.font_family || undefined;
  const headingFont = styling.heading_font_family || styling.font_family || undefined;
  const cardBg = styling.card_background_color || "#ffffff";
  const cardBorder = styling.card_border_color || "#e2e8f0";

  const [hovered, setHovered] = useState(false);
  const fontImports = [styling.font_url, styling.heading_font_url].filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4" style={{ backgroundColor: bgColor, fontFamily: bodyFont }}>
      {fontImports.map((url, i) => <link key={i} href={url} rel="stylesheet" />)}
      <div className="w-full max-w-2xl">
        {styling.logo_url && (
          <img src={styling.logo_url} alt="Logo" className="h-12 mb-6 mx-auto" />
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

        <div className="p-8 shadow-sm" style={{ backgroundColor: cardBg, borderRadius, border: `1px solid ${cardBorder}` }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: headingColor, fontFamily: headingFont }}>
            {survey.title}
          </h1>
          {survey.description && (
            <p className="text-lg mb-6" style={{ color: descColor || `${textColor}cc` }}>
              {survey.description}
            </p>
          )}

          {survey.welcome_page_content && (
            <div
              className="prose prose-sm max-w-none mb-8"
              style={{ color: textColor }}
              dangerouslySetInnerHTML={{ __html: survey.welcome_page_content }}
            />
          )}

          <button
            type="button"
            onClick={onStart}
            className="w-full py-4 text-lg font-semibold transition-colors"
            style={{
              backgroundColor: hovered && btnHover ? btnHover : buttonColor,
              color: buttonTextColor,
              borderRadius: btnRadius,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {survey.welcome_page_button_text || "Start Survey"}
          </button>
        </div>
      </div>
    </div>
  );
}