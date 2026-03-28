import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SAMPLE_DATA = {
  title: 'Kitchen & Bath Renovation — 123 Oak St',
  client: 'Sarah & David Thompson',
  source: 'Referral',
  estimated_precon_value: '$12,500',
  estimated_construction_value: '$385,000',
  notes: 'Homeowners are looking to fully renovate their kitchen and both bathrooms. Prefer modern farmhouse style. Timeline is flexible but hoping to start by summer.',
};

const FIELD_LABELS = {
  title: 'Lead Title',
  client: 'Client',
  source: 'Source',
  estimated_precon_value: 'Est. Precon Value',
  estimated_construction_value: 'Est. Construction Value',
  notes: 'Notes',
};

export default function LeadAlertEmailPreview({ selectedFields }) {
  const [showPreview, setShowPreview] = useState(true);

  const tableFields = selectedFields.filter(f => f !== 'notes');
  const showNotes = selectedFields.includes('notes');

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
      >
        {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {showPreview ? 'Hide Preview' : 'Show Email Preview'}
      </button>

      {showPreview && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400 ml-2">Email Preview</span>
            <span className="text-[10px] text-slate-400 ml-auto bg-white px-2 py-0.5 rounded-full">Sample Data</span>
          </div>

          <div className="p-4 space-y-2">
            {/* Email header */}
            <div className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">To:</span> john.smith@company.com
            </div>
            <div className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Subject:</span> 🎯 New Lead Assigned: {selectedFields.includes('title') ? SAMPLE_DATA.title : 'Untitled'}{selectedFields.includes('client') ? ` — ${SAMPLE_DATA.client}` : ''}
            </div>

            <div className="border-t border-slate-200 pt-3 mt-2">
              {/* Email body mockup */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                {/* Orange header */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4">
                  <p className="text-white font-bold text-sm">🎯 New Lead Assigned to You</p>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-sm text-slate-600">Hi John,</p>
                  <p className="text-sm text-slate-500">A new project lead has been assigned to you:</p>

                  {selectedFields.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No fields selected — nothing will appear in the email.</p>
                  ) : (
                    <>
                      {tableFields.length > 0 && (
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            {tableFields.map(key => (
                              <tr key={key}>
                                <td className="py-2 px-3 bg-slate-50 font-semibold text-slate-600 border border-slate-200 w-2/5">
                                  {FIELD_LABELS[key]}
                                </td>
                                <td className="py-2 px-3 border border-slate-200 text-slate-500">
                                  {SAMPLE_DATA[key]}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {showNotes && (
                        <div className="bg-slate-50 border-l-4 border-amber-500 p-3 rounded text-xs text-slate-500">
                          <span className="font-semibold text-slate-600">Notes:</span> {SAMPLE_DATA.notes}
                        </div>
                      )}
                    </>
                  )}

                  <p className="text-[11px] text-slate-400 pt-2">Log in to the app to view and manage this lead.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}