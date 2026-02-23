import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Image, Palette, Type, Star, Upload, X } from "lucide-react";

const TYPE_CONFIG = {
  logo: { label: "Logos", icon: Image, color: "bg-blue-100 text-blue-700" },
  banner: { label: "Banners", icon: Image, color: "bg-purple-100 text-purple-700" },
  color: { label: "Colors", icon: Palette, color: "bg-green-100 text-green-700" },
  font: { label: "Fonts", icon: Type, color: "bg-orange-100 text-orange-700" },
};

function AssetCard({ asset, onDelete }) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={TYPE_CONFIG[asset.type]?.color}>{asset.type}</Badge>
            {asset.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600" onClick={() => onDelete(asset.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {(asset.type === "logo" || asset.type === "banner") && asset.file_url && (
          <div className={`rounded-lg overflow-hidden bg-slate-100 mb-2 flex items-center justify-center ${asset.type === "banner" ? "h-20" : "h-16 w-16"}`}>
            <img src={asset.file_url} alt={asset.name} className="max-h-full max-w-full object-contain" />
          </div>
        )}

        {asset.type === "color" && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg border border-slate-200 shadow-inner" style={{ backgroundColor: asset.color_value }} />
            <span className="text-sm font-mono text-slate-600">{asset.color_value}</span>
          </div>
        )}

        {asset.type === "font" && (
          <div className="mb-2 p-2 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-700" style={{ fontFamily: asset.font_family }}>{asset.font_family}</p>
          </div>
        )}

        <p className="text-sm font-medium text-slate-800 truncate">{asset.name}</p>
        {asset.notes && <p className="text-xs text-slate-500 truncate mt-1">{asset.notes}</p>}
        {asset.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddAssetDialog({ open, onOpenChange, onSave, isPending }) {
  const [form, setForm] = useState({ name: "", type: "logo", file_url: "", color_value: "#ea7924", font_family: "", font_url: "", tags: "", is_default: false, notes: "" });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, file_url }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      type: form.type,
      is_default: form.is_default,
      notes: form.notes,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    if (form.type === "logo" || form.type === "banner") data.file_url = form.file_url;
    if (form.type === "color") data.color_value = form.color_value;
    if (form.type === "font") { data.font_family = form.font_family; data.font_url = form.font_url; }
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Brand Asset</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Asset Type</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logo">Logo</SelectItem>
                <SelectItem value="banner">Banner</SelectItem>
                <SelectItem value="color">Color</SelectItem>
                <SelectItem value="font">Font</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Primary Logo" />
          </div>

          {(form.type === "logo" || form.type === "banner") && (
            <div>
              <Label>Upload Image</Label>
              {form.file_url ? (
                <div className="relative inline-block mt-1">
                  <img src={form.file_url} alt="preview" className="max-h-24 rounded-lg border" />
                  <button type="button" onClick={() => setForm(p => ({ ...p, file_url: "" }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">{uploading ? "Uploading..." : "Choose file..."}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              )}
            </div>
          )}

          {form.type === "color" && (
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 items-center mt-1">
                <input type="color" value={form.color_value} onChange={e => setForm(p => ({ ...p, color_value: e.target.value }))} className="w-10 h-9 rounded cursor-pointer" />
                <Input value={form.color_value} onChange={e => setForm(p => ({ ...p, color_value: e.target.value }))} placeholder="#ea7924" />
              </div>
            </div>
          )}

          {form.type === "font" && (
            <>
              <div>
                <Label>Font Family Name</Label>
                <Input value={form.font_family} onChange={e => setForm(p => ({ ...p, font_family: e.target.value }))} placeholder="e.g. Work Sans" />
              </div>
              <div>
                <Label>Font URL (Google Fonts or custom)</Label>
                <Input value={form.font_url} onChange={e => setForm(p => ({ ...p, font_url: e.target.value }))} placeholder="https://fonts.googleapis.com/css2?family=..." />
              </div>
            </>
          )}

          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="primary, dark, header" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Set as Default</Label>
            <Switch checked={form.is_default} onCheckedChange={v => setForm(p => ({ ...p, is_default: v }))} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Usage notes..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#ea7924] hover:bg-[#d66a1f]" disabled={isPending}>{isPending ? "Saving..." : "Add Asset"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BrandingRepository() {
  const [addOpen, setAddOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["brandAssets"],
    queryFn: () => base44.entities.BrandAsset.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BrandAsset.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["brandAssets"] }); setAddOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BrandAsset.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brandAssets"] }),
  });

  const filtered = filterType === "all" ? assets : assets.filter(a => a.type === filterType);

  const typeCounts = { logo: 0, banner: 0, color: 0, font: 0 };
  assets.forEach(a => { if (typeCounts[a.type] !== undefined) typeCounts[a.type]++; });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Brand Assets</h2>
          <p className="text-sm text-slate-500">Manage logos, banners, colors, and fonts for consistent branding</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-[#ea7924] hover:bg-[#d66a1f]">
          <Plus className="w-4 h-4 mr-2" /> Add Asset
        </Button>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>
          All ({assets.length})
        </Button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <Button key={key} variant={filterType === key ? "default" : "outline"} size="sm" onClick={() => setFilterType(key)}>
            <cfg.icon className="w-3.5 h-3.5 mr-1" /> {cfg.label} ({typeCounts[key]})
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Palette className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No brand assets yet</p>
          <p className="text-sm text-slate-400 mb-4">Upload logos, set brand colors, and add fonts</p>
          <Button onClick={() => setAddOpen(true)} className="bg-[#ea7924] hover:bg-[#d66a1f]">
            <Plus className="w-4 h-4 mr-2" /> Add First Asset
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(asset => (
            <AssetCard key={asset.id} asset={asset} onDelete={(id) => { if (confirm("Delete this asset?")) deleteMutation.mutate(id); }} />
          ))}
        </div>
      )}

      <AddAssetDialog open={addOpen} onOpenChange={setAddOpen} onSave={(data) => createMutation.mutate(data)} isPending={createMutation.isPending} />
    </div>
  );
}