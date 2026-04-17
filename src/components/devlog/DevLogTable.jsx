import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import moment from 'moment';

const TYPE_LABELS = {
  feature_added: 'Feature Added',
  bug_repaired: 'Bug Repaired',
  bug_feature_request: 'Request',
};
const TYPE_COLORS = {
  feature_added: 'bg-emerald-100 text-emerald-800',
  bug_repaired: 'bg-blue-100 text-blue-800',
  bug_feature_request: 'bg-amber-100 text-amber-800',
};
const STATUS_LABELS = {
  new_request: 'New Request',
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  verified: 'Verified',
  rejected: 'Rejected',
};
const STATUS_COLORS = {
  new_request: 'bg-purple-100 text-purple-800',
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  verified: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};
const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function DevLogTable({ items, users, onEdit, onDelete, isAdmin }) {
  const getUserName = (id) => (users || []).find(u => u.id === id)?.full_name || '';

  return (
    <div className="border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Reported By</TableHead>
            <TableHead>Date</TableHead>
            {isAdmin && <TableHead className="w-20">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-slate-400 py-8">No entries found</TableCell></TableRow>
          )}
          {items.map(item => (
            <TableRow key={item.id} className="hover:bg-slate-50/50">
              <TableCell>
                <div className="font-medium text-sm">{item.title}</div>
                {item.description && <div className="text-xs text-slate-500 truncate max-w-xs">{item.description}</div>}
              </TableCell>
              <TableCell><Badge className={TYPE_COLORS[item.type]}>{TYPE_LABELS[item.type]}</Badge></TableCell>
              <TableCell><Badge className={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Badge></TableCell>
              <TableCell><Badge className={PRIORITY_COLORS[item.priority]}>{item.priority}</Badge></TableCell>
              <TableCell className="text-sm text-slate-600">{item.related_area || '—'}</TableCell>
              <TableCell className="text-sm text-slate-600">{item.reported_by_name || getUserName(item.reported_by) || '—'}</TableCell>
              <TableCell className="text-sm text-slate-500">{item.resolution_date || moment(item.created_date).format('MMM D, YYYY')}</TableCell>
              {isAdmin && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => onDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}