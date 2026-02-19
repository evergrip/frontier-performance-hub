import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, History, Target } from 'lucide-react';

export default function PreviousBusinessSection({ items, users, kpis, onUpdate, onRemove }) {
  if (!items || items.length === 0) return null;

  const getUserName = (id) => users?.find(u => u.id === id)?.full_name || id;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-blue-600" />
        <Label className="text-base font-semibold text-blue-900">Previous Business</Label>
        <Badge className="bg-blue-100 text-blue-700 text-xs">{items.length} item{items.length !== 1 ? 's' : ''}</Badge>
      </div>
      <p className="text-xs text-slate-500 mb-2">Carried forward from the previous meeting. You can reassign or update these.</p>
      {items.map((item, idx) => (
        <div key={idx} className="border-l-4 border-blue-400 rounded-lg p-3 mb-2 space-y-2 bg-blue-50/40">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                value={item.description}
                onChange={e => onUpdate(idx, 'description', e.target.value)}
                placeholder="Task description"
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(idx)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={item.assigned_to_user_id || ''} onValueChange={v => onUpdate(idx, 'assigned_to_user_id', v)}>
              <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={item.due_date || ''} onChange={e => onUpdate(idx, 'due_date', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={item.linked_kpi_id || 'none'} onValueChange={v => onUpdate(idx, 'linked_kpi_id', v === 'none' ? '' : v)}>
              <SelectTrigger className="text-xs">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-indigo-500" />
                  <SelectValue placeholder="Link KPI..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No KPI Link</SelectItem>
                {kpis.filter(k => k.is_active !== false).map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.name} ({k.category})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item.linked_kpi_id && (
              <Input
                type="number"
                value={item.kpi_impact_value || 1}
                onChange={e => onUpdate(idx, 'kpi_impact_value', parseFloat(e.target.value) || 0)}
                placeholder="Impact value"
                className="text-xs"
              />
            )}
          </div>
          {item.source_meeting_id && (
            <p className="text-[10px] text-slate-400 italic">Carried from previous meeting</p>
          )}
        </div>
      ))}
    </div>
  );
}