import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Clock, User } from 'lucide-react';

export default function EditLogViewer({ entityType, entityId }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['edit-logs', entityType, entityId],
    queryFn: () => base44.entities.EditLog.filter({ entity_type: entityType, entity_id: entityId }, '-created_date', 50),
    enabled: !!entityId,
  });

  if (logs.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-2">No edit history</div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {logs.map((log) => (
        <div key={log.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3 h-3 text-slate-400" />
            <span className="font-medium text-slate-700">{log.edited_by_name || 'Unknown'}</span>
            <Clock className="w-3 h-3 text-slate-400 ml-auto" />
            <span className="text-slate-500">{format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}</span>
          </div>
          <ul className="space-y-0.5 ml-5">
            {(log.changes || []).map((change, idx) => (
              <li key={idx} className="text-slate-600">
                <span className="font-medium">{change.field_label || change.field}</span>:&nbsp;
                <span className="text-red-500 line-through">{change.old_value || '(empty)'}</span>
                &nbsp;→&nbsp;
                <span className="text-emerald-600">{change.new_value || '(empty)'}</span>
              </li>
            ))}
          </ul>
          {log.notes && <p className="text-slate-500 mt-1 ml-5 italic">{log.notes}</p>}
        </div>
      ))}
    </div>
  );
}