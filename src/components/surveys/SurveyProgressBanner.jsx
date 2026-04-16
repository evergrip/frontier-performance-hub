import React from 'react';
import { Save, Check, Loader2, BookmarkPlus, Link2 } from 'lucide-react';
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
    <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span>Saving progress...</span>
          </>
        ) : lastSaved ? (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span>Progress saved {lastSaved}</span>
          </>
        ) : (
          <>
            <BookmarkPlus className="w-4 h-4 text-slate-400" />
            <span>Your progress can be saved</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {resumeUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={copyResumeLink}
          >
            <Link2 className="w-3.5 h-3.5 mr-1" />
            Copy Resume Link
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="text-xs h-7"
          style={{ backgroundColor: buttonColor, color: buttonTextColor, borderRadius: btnRadius }}
          onClick={onSave}
          disabled={saving}
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Save & Continue Later
        </Button>
      </div>
    </div>
  );
}