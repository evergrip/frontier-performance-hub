import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ImportActionItemsDialog({ open, onOpenChange, meetings, users, currentMeeting, onImport }) {
  const [filter, setFilter] = useState('incomplete'); // 'all', 'incomplete', 'overdue'
  const [selectedPersonId, setSelectedPersonId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Build list of previous meetings (exclude current)
  const previousMeetings = useMemo(() => {
    return meetings
      .filter(m => m.id !== currentMeeting?.id && (m.action_items || []).length > 0)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  }, [meetings, currentMeeting]);

  // Get all action items from previous meetings
  const allItems = useMemo(() => {
    const items = [];
    previousMeetings.forEach(m => {
      (m.action_items || []).forEach((item, idx) => {
        items.push({
          ...item,
          meetingId: m.id,
          meetingTitle: m.title,
          meetingDate: m.start_date,
          meetingType: m.meeting_type,
          originalIndex: idx,
          _key: `${m.id}-${idx}`,
        });
      });
    });
    return items;
  }, [previousMeetings]);

  // Filter action items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (filter === 'incomplete' && item.is_completed) return false;
      if (filter === 'overdue' && (item.is_completed || !item.due_date || new Date(item.due_date) >= new Date())) return false;
      if (selectedPersonId !== 'all' && item.assigned_to_user_id !== selectedPersonId) return false;
      if (searchQuery && !item.description.toLowerCase().includes(searchQuery.toLowerCase()) && !item.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allItems, filter, selectedPersonId, searchQuery]);

  // Get unique assigned users
  const assignedUsers = useMemo(() => {
    const ids = [...new Set(allItems.map(i => i.assigned_to_user_id))];
    return ids.map(id => users.find(u => u.id === id)).filter(Boolean);
  }, [allItems, users]);

  const toggleItem = (key) => {
    setSelectedItems(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    const allKeys = filteredItems.map(i => i._key);
    setSelectedItems(allKeys);
  };

  const handleImport = () => {
    const itemsToImport = allItems
      .filter(i => selectedItems.includes(i._key))
      .map(({ description, assigned_to_user_id, due_date, linked_kpi_id, kpi_impact_value }) => ({
        description,
        assigned_to_user_id,
        due_date: due_date || '',
        is_completed: false,
        completed_date: null,
        linked_kpi_id: linked_kpi_id || '',
        kpi_impact_value: kpi_impact_value || 1,
      }));
    onImport(itemsToImport);
    setSelectedItems([]);
    onOpenChange(false);
  };

  const getUserName = (id) => users.find(u => u.id === id)?.full_name || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#ea7924]" />
            Import Action Items from Previous Meetings
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tasks or meeting titles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All People" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              {assignedUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select all */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found · {selectedItems.length} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No action items match your filters</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isOverdue = !item.is_completed && item.due_date && new Date(item.due_date) < new Date();
              const isSelected = selectedItems.includes(item._key);
              return (
                <div
                  key={item._key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => toggleItem(item._key)}
                >
                  <Checkbox checked={isSelected} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.is_completed ? 'line-through text-slate-400' : ''}`}>
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                      <span>From: <span className="font-medium">{item.meetingTitle}</span></span>
                      <span>({format(new Date(item.meetingDate), 'MMM d')})</span>
                      <span>→ {getUserName(item.assigned_to_user_id)}</span>
                      {item.due_date && (
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          Due: {format(new Date(item.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOverdue && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  {item.is_completed && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={selectedItems.length === 0}>
            Import {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}