import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Check, Upload } from "lucide-react";

export default function BrandAssetPicker({ open, onOpenChange, assetType, onSelect }) {
  const { data: assets = [] } = useQuery({
    queryKey: ["brandAssets"],
    queryFn: () => base44.entities.BrandAsset.list("-created_date"),
    enabled: open,
  });

  const filtered = assets.filter(a => a.type === assetType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select {assetType === "logo" ? "Logo" : assetType === "banner" ? "Banner" : assetType === "color" ? "Color" : "Font"}</DialogTitle>
        </DialogHeader>

        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No {assetType} assets found.</p>
            <p className="text-xs text-slate-400 mt-1">Add them in Marketing → Brand Assets</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(asset => (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  if (assetType === "logo" || assetType === "banner") onSelect(asset.file_url);
                  else if (assetType === "color") onSelect(asset.color_value);
                  else if (assetType === "font") onSelect(asset.font_family);
                  onOpenChange(false);
                }}
                className="p-3 rounded-lg border border-slate-200 hover:border-[#ea7924] hover:bg-orange-50 transition-colors text-left"
              >
                {(assetType === "logo" || assetType === "banner") && asset.file_url && (
                  <div className={`rounded bg-slate-100 mb-2 flex items-center justify-center overflow-hidden ${assetType === "banner" ? "h-16" : "h-14 w-14"}`}>
                    <img src={asset.file_url} alt={asset.name} className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                {assetType === "color" && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded border" style={{ backgroundColor: asset.color_value }} />
                    <span className="text-xs font-mono text-slate-500">{asset.color_value}</span>
                  </div>
                )}
                {assetType === "font" && (
                  <p className="text-sm mb-1" style={{ fontFamily: asset.font_family }}>{asset.font_family}</p>
                )}
                <p className="text-sm font-medium text-slate-700 truncate">{asset.name}</p>
                {asset.is_default && <Badge className="mt-1 text-xs bg-amber-100 text-amber-700">Default</Badge>}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}