import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const isVideo = (url) => /\.(mp4|mov|avi|webm|mkv)/i.test(url);

export default function MediaLightbox({ items, currentIndex, onClose, onNavigate }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < items.length - 1) onNavigate(currentIndex + 1);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [currentIndex, items.length, onClose, onNavigate]);

  const currentItem = items[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2 z-10"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {items.length > 1 && currentIndex > 0 && (
        <button
          className="absolute left-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2 z-10"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {items.length > 1 && currentIndex < items.length - 1 && (
        <button
          className="absolute right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2 z-10"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {isVideo(currentItem) ? (
        <video
          src={currentItem}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[90vh] rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={currentItem}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {items.length > 1 && (
        <div className="absolute bottom-4 text-white/60 text-sm">
          {currentIndex + 1} / {items.length}
        </div>
      )}
    </div>
  );
}