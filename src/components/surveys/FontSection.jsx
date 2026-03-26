import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const POPULAR_FONTS = [
  { name: "Work Sans", url: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap" },
  { name: "Lato", url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" },
  { name: "Raleway", url: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap" },
  { name: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
  { name: "Open Sans", url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" },
  { name: "Roboto", url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" },
  { name: "Montserrat", url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" },
  { name: "Playfair Display", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap" },
  { name: "Poppins", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" },
  { name: "Nunito", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" },
  { name: "Merriweather", url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap" },
  { name: "Oswald", url: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" },
];

function FontPicker({ label, familyKey, urlKey, styling, updateStyling, openPicker }) {
  const currentFamily = styling[familyKey] || "";
  // Extract just the font name (before any fallbacks like ", sans-serif")
  const cleanName = currentFamily.replace(/^'|'$/g, "").split(",")[0].trim();
  const matchedFont = POPULAR_FONTS.find(f => f.name === cleanName);

  const handleSelect = (fontName) => {
    if (fontName === "__custom__") {
      updateStyling(familyKey, "");
      updateStyling(urlKey, "");
      return;
    }
    const font = POPULAR_FONTS.find(f => f.name === fontName);
    if (font) {
      updateStyling(familyKey, `'${font.name}', sans-serif`);
      updateStyling(urlKey, font.url);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{label}</Label>
      <div>
        <Label className="text-[10px] text-slate-500">Quick Pick</Label>
        <Select value={matchedFont?.name || "__custom__"} onValueChange={handleSelect}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Choose a font..." />
          </SelectTrigger>
          <SelectContent>
            {POPULAR_FONTS.map(f => (
              <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
            ))}
            <SelectItem value="__custom__">Custom (enter manually)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px] text-slate-500">Font Family</Label>
        <div className="flex gap-2 items-center">
          <Input value={styling[familyKey] || ""} onChange={e => updateStyling(familyKey, e.target.value)} placeholder="e.g. 'Lato', sans-serif" className="flex-1 h-8 text-xs" />
          {openPicker && (
            <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs h-7" onClick={() => openPicker("font", familyKey)}>Brand</Button>
          )}
        </div>
      </div>
      <div>
        <Label className="text-[10px] text-slate-500">Google Fonts URL</Label>
        <Input value={styling[urlKey] || ""} onChange={e => updateStyling(urlKey, e.target.value)} placeholder="https://fonts.googleapis.com/css2?family=..." className="h-8 text-xs" />
      </div>
    </div>
  );
}

export default function FontSection({ styling, updateStyling, openPicker }) {
  return (
    <div className="space-y-4">
      <FontPicker
        label="Body Font"
        familyKey="font_family"
        urlKey="font_url"
        styling={styling}
        updateStyling={updateStyling}
        openPicker={openPicker}
      />

      <div className="h-px bg-slate-200" />

      <FontPicker
        label="Heading Font"
        familyKey="heading_font_family"
        urlKey="heading_font_url"
        styling={styling}
        updateStyling={updateStyling}
        openPicker={openPicker}
      />

      {/* Preview */}
      {(styling.font_family || styling.heading_font_family) && (
        <div className="bg-slate-50 rounded-lg p-3 border">
          <p className="text-[10px] text-slate-400 mb-2">Preview</p>
          {styling.font_url && <link href={styling.font_url} rel="stylesheet" />}
          {styling.heading_font_url && <link href={styling.heading_font_url} rel="stylesheet" />}
          <p className="text-lg font-bold mb-1" style={{ fontFamily: styling.heading_font_family || styling.font_family || "inherit" }}>Survey Heading</p>
          <p className="text-sm" style={{ fontFamily: styling.font_family || "inherit" }}>This is how your body text will look with the selected fonts.</p>
        </div>
      )}
    </div>
  );
}