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
import { Upload, Loader2, X } from "lucide-react";
import BrandAssetPicker from "../common/BrandAssetPicker";
import WelcomePageEditor from "./WelcomePageEditor";
import ThankYouPageEditor from "./ThankYouPageEditor";
import FontSection from "./FontSection";
import AlertRecipientsTab from "./AlertRecipientsTab";

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

function ImageUploadField({ label, fieldKey, styling, updateStyling, openPicker, pickerType, previewClassName }) {
  const [uploading, setUploading] = useState(false);
  const value = styling[fieldKey] || "";

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateStyling(fieldKey, file_url);
    setUploading(false);
  };

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center mt-1">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button type="button" variant="outline" size="sm" className="text-xs pointer-events-none" asChild={false}>
            {uploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3 mr-1" /> Upload</>}
          </Button>
        </label>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => openPicker(pickerType, fieldKey)}>Brand</Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" className="text-red-500 text-xs h-7 px-2" onClick={() => updateStyling(fieldKey, "")}>
            <X className="w-3 h-3 mr-1" /> Remove
          </Button>
        )}
      </div>
      {value && <img src={value} alt={label} className={`mt-2 rounded ${previewClassName || "h-10"}`} />}
    </div>
  );
}

function ImageUploadSection({ styling, updateStyling, openPicker }) {
  return (
    <div className="space-y-3">
      <ImageUploadField label="Logo" fieldKey="logo_url" styling={styling} updateStyling={updateStyling} openPicker={openPicker} pickerType="logo" previewClassName="h-10" />
      <ImageUploadField label="Banner Image" fieldKey="banner_image_url" styling={styling} updateStyling={updateStyling} openPicker={openPicker} pickerType="banner" previewClassName="h-16 w-full object-cover" />
      {styling.banner_image_url && (
        <div>
          <Label className="text-xs">Banner Display Mode</Label>
          <Select value={styling.banner_fit || "cover"} onValueChange={v => updateStyling("banner_fit", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover (fills area, may crop)</SelectItem>
              <SelectItem value="contain">Contain (fits entire image)</SelectItem>
              <SelectItem value="auto">Original Size</SelectItem>
            </SelectContent>
          </Select>
          {styling.banner_fit !== "auto" && (
            <>
              <div className="mt-2">
                <Label className="text-xs">Banner Height</Label>
                <Select value={styling.banner_height || "200px"} onValueChange={v => updateStyling("banner_height", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="120px">Small (120px)</SelectItem>
                    <SelectItem value="160px">Medium (160px)</SelectItem>
                    <SelectItem value="200px">Large (200px)</SelectItem>
                    <SelectItem value="280px">Extra Large (280px)</SelectItem>
                    <SelectItem value="360px">Full (360px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2">
                <Label className="text-xs">Image Alignment</Label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {[
                    { value: "left top", label: "↖" },
                    { value: "center top", label: "↑" },
                    { value: "right top", label: "↗" },
                    { value: "left center", label: "←" },
                    { value: "center center", label: "●" },
                    { value: "right center", label: "→" },
                    { value: "left bottom", label: "↙" },
                    { value: "center bottom", label: "↓" },
                    { value: "right bottom", label: "↘" },
                  ].map(pos => (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => updateStyling("banner_position", pos.value)}
                      className={`h-8 rounded text-sm font-medium border transition-colors ${
                        (styling.banner_position || "center center") === pos.value
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Choose which part of the image stays visible in the crop area</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const STANDARD_BRANDING = {
  background_color: "#f8fafc",
  text_color: "#333645",
  heading_color: "#333645",
  description_color: "#64748b",
  accent_color: "#ea7924",
  progress_bar_color: "#ea7924",
  card_background_color: "#ffffff",
  card_border_color: "#e2e8f0",
  input_background_color: "#ffffff",
  input_border_color: "#e2e8f0",
  input_text_color: "#333645",
  button_color: "#ea7924",
  button_text_color: "#ffffff",
  button_hover_color: "#d66a1f",
  border_radius: "12px",
  button_border_radius: "12px",
  font_family: "'Work Sans', Helvetica, Arial, sans-serif",
  heading_font_family: "'Work Sans', Helvetica, Arial, sans-serif",
  font_url: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap",
  heading_font_url: "",
};

function StylingTab({ form, updateStyling, setForm }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState("logo");
  const [pickerTarget, setPickerTarget] = useState("logo_url");
  const [section, setSection] = useState("colors");

  const openPicker = (assetType, target) => {
    setPickerType(assetType);
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const applyStandardBranding = () => {
    setForm(prev => ({ ...prev, styling: { ...prev.styling, ...STANDARD_BRANDING } }));
  };

  const s = form.styling;

  return (
    <TabsContent value="styling" className="space-y-3 mt-4">
      {/* Apply standard branding */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#333645] to-[#ea7924] rounded-lg">
        <div>
          <p className="text-sm font-semibold text-white">Frontier Standard Branding</p>
          <p className="text-[10px] text-white/70">Apply company colors, fonts, and styling</p>
        </div>
        <Button type="button" size="sm" className="bg-white text-[#333645] hover:bg-white/90 text-xs h-7"
          onClick={applyStandardBranding}>
          Apply Standard
        </Button>
      </div>

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
        <FontSection styling={s} updateStyling={updateStyling} openPicker={openPicker} />
      )}

      {/* Images section */}
      {section === "images" && (
        <ImageUploadSection styling={s} updateStyling={updateStyling} openPicker={openPicker} />
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
    survey_type: "general",
    status: "draft",
    access_type: "link_only",
    allow_anonymous_responses: false,
    allow_multiple_responses: false,
    success_message: "Thank you for completing this survey!",
    redirect_url: "",
    styling: {},
    alert_recipients: [],
    alert_include_question_ids: [],
    alert_subject: '',
    alert_body: '',
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
        survey_type: survey.survey_type || "general",
        status: survey.status || "draft",
        access_type: survey.access_type || "link_only",
        allow_anonymous_responses: survey.allow_anonymous_responses || false,
        allow_multiple_responses: survey.allow_multiple_responses || false,
        success_message: survey.success_message || "Thank you for completing this survey!",
        redirect_url: survey.redirect_url || "",
        styling: survey.styling || {},
        alert_recipients: survey.alert_recipients || [],
        alert_include_question_ids: survey.alert_include_question_ids || [],
        alert_subject: survey.alert_subject || '',
        alert_body: survey.alert_body || '',
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
              <TabsTrigger value="alerts" className="flex-1">Alerts</TabsTrigger>
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
                <Label>Survey Type</Label>
                <Select value={form.survey_type || "general"} onValueChange={v => setForm(p => ({ ...p, survey_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Survey</SelectItem>
                    <SelectItem value="feasibility">Feasibility Study</SelectItem>
                    <SelectItem value="feedback">Feedback Form</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {form.survey_type === "feasibility" 
                    ? "Feasibility studies use tab navigation for sections with per-section progress tracking"
                    : "Sections are displayed as scroll-through groups"}
                </p>
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

            <AlertRecipientsTab form={form} setForm={setForm} questions={survey?.questions} />

            <StylingTab form={form} updateStyling={updateStyling} setForm={setForm} />
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