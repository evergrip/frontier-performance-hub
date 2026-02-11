import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_LABELS = {
  // Lead statuses
  new_project_lead: 'New Project Lead',
  initial_video_consult: 'Video Consult',
  initial_inperson_consultation: 'In-Person Consult',
  preconstruction_proposal: 'Proposal',
  followup: 'Follow-up',
  converted: 'Converted',
  disqualified: 'Disqualified',
  // Sale statuses
  feasibility: 'Feasibility',
  design_material_selections: 'Design & Materials',
  engineering_permits: 'Engineering & Permits',
  pending_construction_sale: 'Pending Construction',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  // Project statuses
  awaiting_to_be_scheduled: 'Awaiting to be Scheduled',
  mobilization: 'Mobilization',
  active_construction: 'Active Construction',
  substantial_completion_closeout: 'Substantial Completion & Closeout',
  closed: 'Closed',
};

export default function EditableTimeline({ history, onSave, isSaving }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDate, setEditDate] = useState('');

  const handleEdit = (index, currentDate) => {
    setEditingIndex(index);
    try {
      setEditDate(format(new Date(currentDate), "yyyy-MM-dd'T'HH:mm"));
    } catch {
      setEditDate('');
    }
  };

  const handleSave = (index) => {
    if (!editDate) return;
    const updated = history.map((entry, i) =>
      i === index ? { ...entry, entered_date: new Date(editDate).toISOString() } : entry
    );
    onSave(updated);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditDate('');
  };

  if (!history || history.length === 0) {
    return <p className="text-sm text-slate-400 italic">No phase history recorded</p>;
  }

  return (
    <div className="space-y-2">
      {history.map((entry, idx) => {
        const label = STATUS_LABELS[entry.status] || entry.status;
        const isEditing = editingIndex === idx;
        const enteredDate = new Date(entry.entered_date);
        const nextEntry = history[idx + 1];
        const isCurrent = idx === history.length - 1;

        let duration = '';
        const endDate = nextEntry ? new Date(nextEntry.entered_date) : new Date();
        const diffDays = Math.ceil(Math.abs(endDate - enteredDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) duration = `${diffDays}d`;
        else if (diffDays < 30) duration = `${Math.floor(diffDays / 7)}w`;
        else duration = `${Math.floor(diffDays / 30)}mo`;

        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${isCurrent ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{label}</span>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded-full">Current</span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">{duration}</span>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleSave(idx)} disabled={isSaving}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={handleCancel}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-500">
                      {format(enteredDate, 'MMM d, yyyy h:mm a')}
                    </p>
                    <button
                      onClick={() => handleEdit(idx, entry.entered_date)}
                      className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Edit date"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}