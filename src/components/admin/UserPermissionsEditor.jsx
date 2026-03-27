import React from 'react';
import { PERMISSION_SECTIONS } from '@/lib/permissions';
import { Shield } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function UserPermissionsEditor({ permissions, onChange, isAdmin }) {
  const toggle = (key) => {
    const current = permissions || [];
    const updated = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    onChange(updated);
  };

  const selectAll = () => onChange(PERMISSION_SECTIONS.map(s => s.key));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3 p-3 bg-violet-50 rounded-lg border border-violet-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-600" />
          <Label className="text-sm font-medium">Section Access</Label>
        </div>
        {!isAdmin && (
          <div className="flex gap-2">
            <button type="button" onClick={selectAll} className="text-xs text-violet-600 hover:underline">All</button>
            <span className="text-xs text-slate-300">|</span>
            <button type="button" onClick={clearAll} className="text-xs text-violet-600 hover:underline">None</button>
          </div>
        )}
      </div>

      {isAdmin ? (
        <p className="text-xs text-violet-600">Admins have full access to all sections automatically.</p>
      ) : (
        <div className="space-y-2">
          {PERMISSION_SECTIONS.map(section => {
            const checked = (permissions || []).includes(section.key);
            return (
              <label
                key={section.key}
                className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                  checked ? 'bg-violet-100 border-violet-300' : 'bg-white border-transparent hover:bg-violet-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(section.key)}
                  className="rounded border-slate-300 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800">{section.label}</span>
                  <p className="text-xs text-slate-500">{section.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}