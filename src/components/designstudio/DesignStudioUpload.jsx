import React, { useRef } from 'react';
import { Upload, Camera, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DesignStudioUpload({ onFileSelected, uploading }) {
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) onFileSelected(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="text-center space-y-6">
      <div className="space-y-3">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
          <Camera className="w-10 h-10 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Upload a Photo of Your Space</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Snap a photo of any room in your home — kitchen, living room, bathroom, bedroom — and our AI will suggest design styles tailored to your space.
        </p>
      </div>

      <div
        className="border-2 border-dashed border-slate-300 rounded-2xl p-10 hover:border-orange-400 hover:bg-orange-50/30 transition-all cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        <div className="space-y-3">
          <Upload className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <p className="font-medium text-slate-700">
              {uploading ? 'Uploading...' : 'Drag & drop your photo here'}
            </p>
            <p className="text-sm text-slate-400 mt-1">or click to browse • JPG, PNG, HEIC</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 justify-center text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Image className="w-3.5 h-3.5" />
          <span>Works with any room</span>
        </div>
        <span>•</span>
        <span>100% free</span>
        <span>•</span>
        <span>Takes ~30 seconds</span>
      </div>
    </div>
  );
}