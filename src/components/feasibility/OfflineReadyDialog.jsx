import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, Loader2, WifiOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cacheData, getCachedData } from '../../lib/offlineStorage';

export default function OfflineReadyDialog({ open, onOpenChange, studyId }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setStatus('loading');
    setError('');
    try {
      const [studies, clauses, selections] = await Promise.all([
        base44.entities.FeasibilityStudy.filter({ id: studyId }),
        base44.entities.FeasibilityClause.filter({ is_active: true }),
        base44.entities.FeasibilitySelection.filter({ study_id: studyId }),
      ]);
      cacheData(`study_${studyId}`, studies[0] || null);
      cacheData('clauses_all', clauses);
      cacheData(`selections_${studyId}`, selections);
      setStatus('ready');
    } catch (e) {
      setError('Failed to download data. Please check your connection and try again.');
      setStatus('error');
    }
  };

  const alreadyCached = !!getCachedData(`study_${studyId}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-amber-500" />
            Offline Mode
          </DialogTitle>
          <DialogDescription>
            Download this report's data to your device so you can fill it in without an internet connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {status === 'idle' && (
            <>
              {alreadyCached && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  This report was previously downloaded. You can re-download to get the latest data.
                </div>
              )}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm text-slate-600">
                <p className="font-medium text-slate-800">How it works:</p>
                <ul className="space-y-1.5 ml-1">
                  <li className="flex gap-2"><span className="text-slate-400">1.</span>Tap "Download" to save all report data locally</li>
                  <li className="flex gap-2"><span className="text-slate-400">2.</span>Fill in clauses even without reception</li>
                  <li className="flex gap-2"><span className="text-slate-400">3.</span>Changes auto-sync when you're back online</li>
                </ul>
              </div>
              <Button className="w-full gap-2" onClick={handleDownload}>
                <Download className="w-4 h-4" /> Download for Offline Use
              </Button>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600">Downloading report data…</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-900">Ready for offline use!</p>
              <p className="text-sm text-slate-500 mt-1">
                You can now close this and work without internet. Changes will sync automatically when you reconnect.
              </p>
              <Button className="mt-4" onClick={() => onOpenChange(false)}>
                Got it, let's go
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" onClick={handleDownload}>Try Again</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}