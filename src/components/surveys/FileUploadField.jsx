import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, X, FileImage, FileVideo, Music, Loader2 } from "lucide-react";
import ImageLightbox from "./ImageLightbox";

const ACCEPT_MAP = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

function getFileIcon(url) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) return FileImage;
  if (/\.(mp4|mov|avi|webm)/i.test(url)) return FileVideo;
  if (/\.(mp3|wav|ogg|aac)/i.test(url)) return Music;
  return Upload;
}

export default function FileUploadField({ value = [], onChange, allowedTypes = [], maxFiles = 5 }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const acceptString = allowedTypes.map(t => ACCEPT_MAP[t]).filter(Boolean).join(",");

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const remaining = maxFiles - value.length;
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    const newUrls = [];

    for (const file of toUpload) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(file_url);
    }

    onChange([...value, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  };

  const removeFile = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url);
  const isVideo = (url) => /\.(mp4|mov|avi|webm)/i.test(url);
  const isAudio = (url) => /\.(mp3|wav|ogg|aac)/i.test(url);

  return (
    <div className="space-y-3">
      {/* Uploaded files */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((url, i) => (
            <div key={i} className="relative group rounded-lg border bg-slate-50 overflow-hidden">
              {isImage(url) ? (
                <img
                  src={url}
                  alt=""
                  className="w-full h-24 object-cover cursor-pointer"
                  onClick={() => setLightboxIndex(i)}
                />
              ) : isVideo(url) ? (
                <video src={url} className="w-full h-24 object-cover" />
              ) : isAudio(url) ? (
                <div className="h-24 flex items-center justify-center">
                  <Music className="w-8 h-8 text-slate-400" />
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 bg-white/90 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(i)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {value.length < maxFiles && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
          <input
            type="file"
            accept={acceptString}
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
              <span className="text-sm text-slate-500">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-500">
                Click to upload ({value.length}/{maxFiles})
              </span>
              <span className="text-xs text-slate-400 mt-1">
                {allowedTypes.join(", ")} files accepted
              </span>
            </>
          )}
        </label>
      )}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={value.filter(u => isImage(u))}
          currentIndex={(() => {
            const imageUrls = value.filter(u => isImage(u));
            return imageUrls.indexOf(value[lightboxIndex]);
          })()}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(idx) => {
            const imageUrls = value.filter(u => isImage(u));
            const originalIdx = value.indexOf(imageUrls[idx]);
            setLightboxIndex(originalIdx);
          }}
        />
      )}
    </div>
  );
}