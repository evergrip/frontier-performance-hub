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

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function StylingTab({ form, updateStyling }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState("logo");
  const [pickerTarget, setPickerTarget] = useState("logo_url");

  const openPicker = (assetType, target) => {
    setPickerType(assetType);
    setPickerTarget(target);
    setPickerOpen(true);
  };

  return (
    <TabsContent value="styling" className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Background Color", key: "background_color", default: "#ffffff" },
          { label: "Text Color", key: "text_color", default: "#1e293b" },
          { label: "Accent Color", key: "accent_color", default: "#ea7924" },
          { label: "Button Color", key: "button_color", default: "#ea7924" },
        ].map(c => (
          <div key={c.key}>
            <Label>{c.label}</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.styling[c.key] || c.default} onChange={e => updateStyling(c.key, e.target.value)} className="w-10 h-9 rounded cursor-pointer" />
              <Input value={form.styling[c.key] || ""} onChange={e => updateStyling(c.key, e.target.value)} placeholder={c.default} className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => openPicker("color", c.key)}>
                <Image className="w-3 h-3 mr-1" /> Brand
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label>Logo</Label>
        <div className="flex gap-2 items-center">
          <Input value={form.styling.logo_url || ""} onChange={e => updateStyling("logo_url", e.target.value)} placeholder="https://..." className="flex-1" />
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => openPicker("logo", "logo_url")}>
            <Image className="w-3.5 h-3.5 mr-1" /> Brand
          </Button>
        </div>
        {form.styling.logo_url && <img src={form.styling.logo_url} alt="logo" className="h-10 mt-2 rounded" />}
      </div>

      <div>
        <Label>Banner Image</Label>
        <div className="flex gap-2 items-center">
          <Input value={form.styling.banner_image_url || ""} onChange={e => updateStyling("banner_image_url", e.target.value)} placeholder="https://..." className="flex-1" />
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => openPicker("banner", "banner_image_url")}>
            <Image className="w-3.5 h-3.5 mr-1" /> Brand
          </Button>
        </div>
        {form.styling.banner_image_url && <img src={form.styling.banner_image_url} alt="banner" className="h-16 mt-2 rounded" />}
      </div>

      <div>
        <Label>Font Family</Label>
        <div className="flex gap-2 items-center">
          <Input value={form.styling.font_family || ""} onChange={e => updateStyling("font_family", e.target.value)} placeholder="e.g. Work Sans" className="flex-1" />
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => openPicker("font", "font_family")}>
            <Image className="w-3.5 h-3.5 mr-1" /> Brand
          </Button>
        </div>
      </div>

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

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "draft",
    access_type: "link_only",
    allow_anonymous_responses: false,
    allow_multiple_responses: false,
    success_message: "Thank you for completing this survey!",
    redirect_url: "",
    styling: {},
  });

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
      });
    } else {
      setForm({
        title: "",
        description: "",
        status: "draft",
        access_type: "link_only",
        allow_anonymous_responses: false,
        allow_multiple_responses: false,
        success_message: "Thank you for completing this survey!",
        redirect_url: "",
        styling: {},
      });
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Survey" : "Create New Survey"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="general">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
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
              <div>
                <Label>Success Message</Label>
                <Textarea value={form.success_message} onChange={e => setForm(p => ({ ...p, success_message: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Redirect URL (optional)</Label>
                <Input value={form.redirect_url} onChange={e => setForm(p => ({ ...p, redirect_url: e.target.value }))} placeholder="https://..." />
              </div>
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