import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, ArrowRightLeft, Plus } from 'lucide-react';
import moment from 'moment';

export default function LeadAlertLogDialog({ open, onOpenChange }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['lead-alert-logs'],
    queryFn: () => base44.entities.LeadAlertLog.list('-created_date', 100),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Lead Alert History
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No alerts have been sent yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  log.trigger_type === 'reassigned' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  {log.trigger_type === 'reassigned' 
                    ? <ArrowRightLeft className="w-4 h-4" />
                    : <Plus className="w-4 h-4" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {log.lead_title || 'Untitled Lead'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Sent to <span className="font-medium text-slate-700">{log.sent_to_name || log.sent_to_email}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      log.trigger_type === 'reassigned' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {log.trigger_type === 'reassigned' ? 'Reassigned' : 'New Lead'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {moment(log.created_date).format('MMM D, YYYY h:mm A')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}