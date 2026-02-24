import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image } from "lucide-react";
import BrandAssetPicker from "../common/BrandAssetPicker";
import WelcomePageEditor from "./WelcomePageEditor";
import ThankYouPageEditor from "./ThankYouPageEditor";

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function ColorField({ label, fieldKey, defaultVal, styling, updateStyling, openPicker }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1.5 items-center">
        <input type="color" value={styling[fieldKey] || defaultVal} onChange={e => updateStyling(fieldKey, e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
        <Input value={styling[fieldKey] || ""} onChange={e => updateStyling(fieldKey, e.target.value)} placeholder={defaultVal} className="flex-1 h-8 text-xs" />
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[10px] h-7 px-2" onClick={() => openPicker("color", fieldKey)}>
          Brand
        </Button>
      </div>
    </div>
  );
}

function StylingTab({ form, updateStyling }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState("logo");
  const [pickerTarget, setPickerTarget] = useState("logo_url");
  const [section, setSection] = useState("colors");

  const openPicker = (assetType, target) => {
    setPickerType(assetType);
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const s = form.styling;

  return (
    <TabsContent value="styling" className="space-y-3 mt-4">
      {/* Section tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {[
          { id: "colors", label: "Colors" },
          { id: "typography", label: "Typography" },
          { id: "images", label: "Images" },
          { id: "shape", label: "Shape" },
        ].map(tab => (
          <button key={tab.id} type="button" onClick={() => setSection(tab.id)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${section === tab.id ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Colors section */}
      {section === "colors" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600">Page Colors</p>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" fieldKey="background_color" defaultVal="#ffffff" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Text" fieldKey="text_color" defaultVal="#1e293b" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Heading" fieldKey="heading_color" defaultVal="#0f172a" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Description" fieldKey="description_color" defaultVal="#64748b" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Accent" fieldKey="accent_color" defaultVal="#ea7924" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Progress Bar" fieldKey="progress_bar_color" defaultVal="#ea7924" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
          </div>

          <p className="text-xs font-semibold text-slate-600 pt-2">Card Colors</p>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Card Background" fieldKey="card_background_color" defaultVal="#ffffff" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Card Border" fieldKey="card_border_color" defaultVal="#e2e8f0" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
          </div>

          <p className="text-xs font-semibold text-slate-600 pt-2">Input Colors</p>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Input Background" fieldKey="input_background_color" defaultVal="#ffffff" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Input Border" fieldKey="input_border_color" defaultVal="#e2e8f0" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Input Text" fieldKey="input_text_color" defaultVal="#1e293b" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
          </div>

          <p className="text-xs font-semibold text-slate-600 pt-2">Button Colors</p>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Button" fieldKey="button_color" defaultVal="#ea7924" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Button Text" fieldKey="button_text_color" defaultVal="#ffffff" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
            <ColorField label="Button Hover" fieldKey="button_hover_color" defaultVal="#d66a1f" styling={s} updateStyling={updateStyling} openPicker={openPicker} />
          </div>
        </div>
      )}

      {/* Typography section */}
      {section === "typography" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Body Font Family</Label>
            <div className="flex gap-2 items-center">
              <Input value={s.font_family || ""} onChange={e => updateStyling("font_family", e.target.value)} placeholder="e.g. Inter, Work Sans" className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => openPicker("font", "font_family")}>Brand</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Body Font URL (Google Fonts)</Label>
            <Input value={s.font_url || ""} onChange={e => updateStyling("font_url", e.target.value)} placeholder="https://fonts.googleapis.com/css2?family=..." className="text-xs" />
            <p className="text-[10px] text-slate-400 mt-1">Paste a Google Fonts import URL to load a custom font</p>
          </div>
          <div>
            <Label className="text-xs">Heading Font Family</Label>
            <div className="flex gap-2 items-center">
              <Input value={s.heading_font_family || ""} onChange={e => updateStyling("heading_font_family", e.target.value)} placeholder="e.g. Playfair Display" className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => openPicker("font", "heading_font_family")}>Brand</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Heading Font URL (Google Fonts)</Label>
            <Input value={s.heading_font_url || ""} onChange={e => updateStyling("heading_font_url", e.target.value)} placeholder="https://fonts.googleapis.com/css2?family=..." className="text-xs" />
          </div>

          {/* Preview */}
          {(s.font_family || s.heading_font_family) && (
            <div className="bg-slate-50 rounded-lg p-3 border">
              <p className="text-[10px] text-slate-400 mb-2">Preview</p>
              {s.font_url && <link href={s.font_url} rel="stylesheet" />}
              {s.heading_font_url && <link href={s.heading_font_url} rel="stylesheet" />}
              <p className="text-lg font-bold mb-1" style={{ fontFamily: s.heading_font_family || s.font_family || "inherit" }}>Survey Heading</p>
              <p className="text-sm" style={{ fontFamily: s.font_family || "inherit" }}>This is how your body text will look with the selected fonts.</p>
            </div>
          )}
        </div>
      )}

      {/* Images section */}
      {section === "images" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Logo</Label>
            <div className="flex gap-2 items-center">
              <Input value={s.logo_url || ""} onChange={e => updateStyling("logo_url", e.target.value)} placeholder="https://..." className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => openPicker("logo", "logo_url")}>Brand</Button>
            </div>
            {s.logo_url && <img src={s.logo_url} alt="logo" className="h-10 mt-2 rounded" />}
          </div>
          <div>
            <Label className="text-xs">Banner Image</Label>
            <div className="flex gap-2 items-center">
              <Input value={s.banner_image_url || ""} onChange={e => updateStyling("banner_image_url", e.target.value)} placeholder="https://..." className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => openPicker("banner", "banner_image_url")}>Brand</Button>
            </div>
            {s.banner_image_url && <img src={s.banner_image_url} alt="banner" className="h-16 mt-2 rounded w-full object-cover" />}
          </div>
        </div>
      )}

      {/* Shape section */}
      {section === "shape" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Card Border Radius</Label>
            <Select value={s.border_radius || "12px"} onValueChange={v => updateStyling("border_radius", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">Sharp (0px)</SelectItem>
                <SelectItem value="4px">Subtle (4px)</SelectItem>
                <SelectItem value="8px">Rounded (8px)</SelectItem>
                <SelectItem value="12px">More Rounded (12px)</SelectItem>
                <SelectItem value="16px">Very Rounded (16px)</SelectItem>
                <SelectItem value="24px">Pill (24px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Button Border Radius</Label>
            <Select value={s.button_border_radius || "12px"} onValueChange={v => updateStyling("button_border_radius", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">Sharp (0px)</SelectItem>
                <SelectItem value="4px">Subtle (4px)</SelectItem>
                <SelectItem value="8px">Rounded (8px)</SelectItem>
                <SelectItem value="12px">More Rounded (12px)</SelectItem>
                <SelectItem value="24px">Pill (24px)</SelectItem>
                <SelectItem value="9999px">Full Pill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shape preview */}
          <div className="bg-slate-50 rounded-lg p-3 border">
            <p className="text-[10px] text-slate-400 mb-2">Preview</p>
            <div className="p-3 bg-white border mb-2" style={{ borderRadius: s.border_radius || "12px" }}>
              <p className="text-xs text-slate-600">Card preview</p>
            </div>
            <button className="px-4 py-1.5 text-xs text-white" style={{
              backgroundColor: s.button_color || "#ea7924",
              borderRadius: s.button_border_radius || "12px",
            }}>Button preview</button>
          </div>
        </div>
      )}

      <BrandAssetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        assetType={pickerType}
        onSelect={(value) => updateStyling(pickerTarget, value)}
      />
    </TabsContent>
  );
}

export default function SurveyFormDialog({ open, onOpenChange, survey }) {
  const queryClient = useQueryClient();
  const isEditing = !!survey;

  const defaultForm = {
    title: "",
    description: "",
    status: "draft",
    access_type: "link_only",
    allow_anonymous_responses: false,
    allow_multiple_responses: false,
    success_message: "Thank you for completing this survey!",
    redirect_url: "",
    styling: {},
    welcome_page_enabled: false,
    welcome_page_content: "",
    welcome_page_button_text: "Start Survey",
    thank_you_page_content: "",
    thank_you_show_social_share: false,
  };

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (survey) {
      setForm({
        title: survey.title || "",
        description: survey.description || "",
        status: survey.status || "draft",
        access_type: survey.access_type || "link_only",
        allow_anonymous_responses: survey.allow_anonymous_responses || false,
        allow_multiple_responses: survey.allow_multiple_responses || false,
        success_message: survey.success_message || "Thank you for completing this survey!",
        redirect_url: survey.redirect_url || "",
        styling: survey.styling || {},
        welcome_page_enabled: survey.welcome_page_enabled || false,
        welcome_page_content: survey.welcome_page_content || "",
        welcome_page_button_text: survey.welcome_page_button_text || "Start Survey",
        thank_you_page_content: survey.thank_you_page_content || "",
        thank_you_show_social_share: survey.thank_you_show_social_share || false,
      });
    } else {
      setForm(defaultForm);
    }
  }, [survey, open]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return base44.entities.Survey.update(survey.id, data);
      }
      return base44.entities.Survey.create({ ...data, share_token: generateToken(), questions: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const updateStyling = (key, value) => {
    setForm(prev => ({ ...prev, styling: { ...prev.styling, [key]: value } }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Survey" : "Create New Survey"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="general">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
              <TabsTrigger value="welcome" className="flex-1">Welcome</TabsTrigger>
              <TabsTrigger value="thankyou" className="flex-1">Thank You</TabsTrigger>
              <TabsTrigger value="access" className="flex-1">Access</TabsTrigger>
              <TabsTrigger value="styling" className="flex-1">Styling</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="welcome" className="mt-4">
              <WelcomePageEditor form={form} setForm={setForm} />
            </TabsContent>

            <TabsContent value="thankyou" className="mt-4">
              <ThankYouPageEditor form={form} setForm={setForm} />
            </TabsContent>

            <TabsContent value="access" className="space-y-4 mt-4">
              <div>
                <Label>Access Type</Label>
                <Select value={form.access_type} onValueChange={v => setForm(p => ({ ...p, access_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="link_only">Link Only</SelectItem>
                    <SelectItem value="invite_only">Invite Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Anonymous Responses</Label>
                <Switch checked={form.allow_anonymous_responses} onCheckedChange={v => setForm(p => ({ ...p, allow_anonymous_responses: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Multiple Responses</Label>
                <Switch checked={form.allow_multiple_responses} onCheckedChange={v => setForm(p => ({ ...p, allow_multiple_responses: v }))} />
              </div>
            </TabsContent>

            <StylingTab form={form} updateStyling={updateStyling} />
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#ea7924] hover:bg-[#d66a1f]" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}