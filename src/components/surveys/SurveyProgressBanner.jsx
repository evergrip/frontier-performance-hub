import React from 'react';
import { Save, Check, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SurveyProgressBanner({ 
  saving, 
  lastSaved, 
  onSave, 
  resumeUrl, 
  buttonColor, 
  buttonTextColor, 
  btnRadius 
}) {
  const copyResumeLink = () => {
    if (resumeUrl) {
      navigator.clipboard.writeText(resumeUrl);
      toast.success('Resume link copied! Bookmark or share this link to continue later.');
    }
  };

  return (
    <div className="sticky top-0 z-30">
      <div 
        className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 rounded-xl shadow-md border"
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span>Saved {lastSaved}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {resumeUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={copyResumeLink}
            >
              <Link2 className="w-3.5 h-3.5 mr-1" />
              Copy Resume Link
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            style={{ backgroundColor: buttonColor, color: buttonTextColor, borderRadius: btnRadius }}
            onClick={onSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save & Continue Later
          </Button>
        </div>
      </div>
    </div>
  );
}