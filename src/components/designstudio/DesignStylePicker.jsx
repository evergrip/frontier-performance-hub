import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DesignStylePicker({ imageUrl, analysis, selectedStyle, onSelectStyle, onGenerate, generating }) {
  return (
    <div className="space-y-6">
      {/* Original photo + room info */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <img
          src={imageUrl}
          alt="Your room"
          className="w-full sm:w-48 h-36 object-cover rounded-xl border border-slate-200"
        />
        <div className="flex-1">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Your {analysis.room_type || 'Room'}</p>
          <p className="text-sm text-slate-600 mt-1">{analysis.current_description}</p>
        </div>
      </div>

      {/* Style options */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Choose a Design Style</h3>
        <p className="text-sm text-slate-500 mb-4">Our AI analyzed your space and recommends these styles. Pick one to see your room transformed.</p>

        <div className="grid gap-3">
          {(analysis.styles || []).map((style, i) => {
            const isSelected = selectedStyle?.name === style.name;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectStyle(style)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{style.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{style.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{style.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(style.key_elements || []).map((el, j) => (
                        <span key={j} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{el}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={onGenerate}
        disabled={!selectedStyle || generating}
        className="w-full py-6 text-lg font-semibold rounded-xl"
        style={{ backgroundColor: '#ea7924' }}
      >
        {generating ? (
          <>
            <Sparkles className="w-5 h-5 animate-pulse mr-2" />
            Redesigning Your Space...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            {selectedStyle ? `Transform My Room → ${selectedStyle.name}` : 'Select a Style Above'}
          </>
        )}
      </Button>

      {generating && (
        <p className="text-center text-sm text-slate-400 animate-pulse">
          This may take 10-15 seconds — our AI is crafting your personalized design...
        </p>
      )}
    </div>
  );
}