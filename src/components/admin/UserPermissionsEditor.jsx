import React from 'react';
import { PERMISSION_SECTIONS } from '@/lib/permissions';
import { Shield } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function UserPermissionsEditor({ permissions, onChange, isAdmin }) {
  // Clean legacy 'pipeline' key out of stored permissions when toggling
  const cleanPerms = (perms) => perms.filter(k => k !== 'pipeline');

  const toggle = (key) => {
    const current = cleanPerms(permissions || []);
    const updated = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    onChange(updated);
  };

  const toggleGroup = (groupKeys, allChecked) => {
    const current = cleanPerms(permissions || []);
    const updated = allChecked
      ? current.filter(k => !groupKeys.includes(k))
      : [...new Set([...current, ...groupKeys])];
    onChange(updated);
  };

  const selectAll = () => onChange(PERMISSION_SECTIONS.map(s => s.key));
  const clearAll = () => onChange([]);

  // Group sections by their group property
  const groups = [];
  const seen = new Set();
  for (const section of PERMISSION_SECTIONS) {
    const groupName = section.group || null;
    const groupKey = groupName || section.key;
    if (!seen.has(groupKey)) {
      seen.add(groupKey);
      if (groupName) {
        groups.push({ type: 'group', label: groupName, sections: PERMISSION_SECTIONS.filter(s => s.group === groupName) });
      } else {
        groups.push({ type: 'single', section });
      }
    }
  }

  // Expand legacy 'pipeline' for display purposes
  const expandedPerms = [...(permissions || [])];
  if (expandedPerms.includes('pipeline')) {
    expandedPerms.push('pipeline_clients', 'pipeline_leads', 'pipeline_precon', 'pipeline_projects');
  }
  const isChecked = (key) => expandedPerms.includes(key);

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
          {groups.map((g, i) => {
            if (g.type === 'group') {
              const groupKeys = g.sections.map(s => s.key);
              const allChecked = groupKeys.every(k => isChecked(k));
              const someChecked = groupKeys.some(k => isChecked(k));
              return (
                <div key={i} className="space-y-1">
                  <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${someChecked ? 'bg-violet-100 border-violet-300' : 'bg-white border-transparent hover:bg-violet-50'}`}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                      onChange={() => toggleGroup(groupKeys, allChecked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-800">{g.label} (All)</span>
                  </label>
                  <div className="ml-6 space-y-1">
                    {g.sections.map(section => (
                      <label key={section.key} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${isChecked(section.key) ? 'bg-violet-50 border-violet-200' : 'bg-white border-transparent hover:bg-violet-50'}`}>
                        <input type="checkbox" checked={isChecked(section.key)} onChange={() => toggle(section.key)} className="rounded border-slate-300 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-slate-700">{section.label.replace(`${g.label} — `, '')}</span>
                          <p className="text-xs text-slate-500">{section.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
            const section = g.section;
            return (
              <label key={section.key} className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${isChecked(section.key) ? 'bg-violet-100 border-violet-300' : 'bg-white border-transparent hover:bg-violet-50'}`}>
                <input type="checkbox" checked={isChecked(section.key)} onChange={() => toggle(section.key)} className="rounded border-slate-300 mt-0.5" />
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