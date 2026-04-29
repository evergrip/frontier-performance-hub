import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, X, FileImage, FileVideo, Music, Loader2, Camera, Video } from "lucide-react";
import MediaLightbox from "./MediaLightbox";

const ACCEPT_MAP = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

function getFileIcon(url) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) return FileImage;
  if (/\.(mp4|mov|avi|webm|mkv)/i.test(url)) return FileVideo;
  if (/\.(mp3|wav|ogg|aac)/i.test(url)) return Music;
  return Upload;
}

export default function FileUploadField({ value = [], onChange, allowedTypes = [], maxFiles = 5 }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const fileInputRef = useRef(null);
  const capturePhotoRef = useRef(null);
  const captureVideoRef = useRef(null);

  const acceptString = allowedTypes.map(t => ACCEPT_MAP[t]).filter(Boolean).join(",");
  const canUploadMore = value.length < maxFiles;
  const allowsImages = allowedTypes.includes("image");
  const allowsVideo = allowedTypes.includes("video");

  const processFiles = async (files) => {
    if (files.length === 0) return;
    const remaining = maxFiles - value.length;
    const toUpload = Array.from(files).slice(0, remaining);

    setUploading(true);
    const newUrls = [];
    for (const file of toUpload) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(file_url);
    }
    onChange([...value, ...newUrls]);
    setUploading(false);
  };

  const handleUpload = async (e) => {
    await processFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url);
  const isVideoFile = (url) => /\.(mp4|mov|avi|webm|mkv)/i.test(url);
  const isAudio = (url) => /\.(mp3|wav|ogg|aac)/i.test(url);

  // For lightbox: only images and videos
  const mediaUrls = value.filter(u => isImage(u) || isVideoFile(u));

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
                  onClick={() => setLightboxIndex(mediaUrls.indexOf(url))}
                />
              ) : isVideoFile(url) ? (
                <div
                  className="relative cursor-pointer"
                  onClick={() => setLightboxIndex(mediaUrls.indexOf(url))}
                >
                  <video src={url} className="w-full h-24 object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-white/90 rounded-full p-1.5">
                      <Video className="w-4 h-4 text-slate-700" />
                    </div>
                  </div>
                </div>
              ) : isAudio(url) ? (
                <div className="h-24 flex flex-col items-center justify-center gap-1 p-2">
                  <Music className="w-6 h-6 text-slate-400" />
                  <audio src={url} controls className="w-full h-6" />
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

      {/* Upload controls */}
      {canUploadMore && (
        <div className="space-y-2">
          {/* Main file picker */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
            <input
              ref={fileInputRef}
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
                  Tap to choose from device ({value.length}/{maxFiles})
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {allowedTypes.join(", ")} files accepted
                </span>
              </>
            )}
          </label>

          {/* Camera capture buttons (mobile-friendly) */}
          {(allowsImages || allowsVideo) && !uploading && (
            <div className="flex gap-2">
              {allowsImages && (
                <label className="flex-1 flex items-center justify-center gap-2 border border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    ref={capturePhotoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Camera className="w-5 h-5 text-slate-500" />
                  <span className="text-sm text-slate-600 font-medium">Take Photo</span>
                </label>
              )}
              {allowsVideo && (
                <label className="flex-1 flex items-center justify-center gap-2 border border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    ref={captureVideoRef}
                    type="file"
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Video className="w-5 h-5 text-slate-500" />
                  <span className="text-sm text-slate-600 font-medium">Record Video</span>
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {lightboxIndex !== null && lightboxIndex >= 0 && (
        <MediaLightbox
          items={mediaUrls}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  );
}