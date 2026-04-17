import React, { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReportBugFeatureDialog from './ReportBugFeatureDialog';

export default function FloatingReportButton() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-all hover:scale-110 flex items-center justify-center"
        title="Report Bug or Request Feature"
      >
        <Bug className="w-5 h-5" />
      </button>
      <ReportBugFeatureDialog open={open} onOpenChange={setOpen} user={user} />
    </>
  );
}