import React from 'react';
import { WifiOff, Wifi, CloudUpload, Loader2 } from 'lucide-react';

export default function OfflineStatusBar({ isOnline, pendingCount, isSyncing }) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
      isOnline
        ? 'bg-blue-50 text-blue-700 border-b border-blue-100'
        : 'bg-amber-50 text-amber-700 border-b border-amber-100'
    }`}>
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You're offline — changes are being saved locally</span>
          {pendingCount > 0 && (
            <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs ml-1">
              {pendingCount} pending
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingCount} offline change{pendingCount !== 1 ? 's' : ''}…</span>
        </>
      ) : (
        <>
          <CloudUpload className="w-4 h-4" />
          <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} waiting to sync</span>
        </>
      )}
    </div>
  );
}