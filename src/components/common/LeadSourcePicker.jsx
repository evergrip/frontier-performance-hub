import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadSourcePicker({ value, onChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const queryClient = useQueryClient();

  const { data: customSources = [] } = useQuery({
    queryKey: ['leadSources'],
    queryFn: () => base44.entities.LeadSource.list('name'),
    initialData: [],
  });

  const handleAddSource = async () => {
    const name = newSourceName.trim();
    if (!name) return;
    
    const sourceValue = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    // Check for duplicates
    if (customSources.some(s => s.value === sourceValue)) {
      toast.error('This source already exists');
      return;
    }

    await base44.entities.LeadSource.create({ name, value: sourceValue });
    queryClient.invalidateQueries(['leadSources']);
    onChange(sourceValue);
    setNewSourceName('');
    setIsAdding(false);
    toast.success(`"${name}" added as a lead source`);
  };

  return (
    <div className="space-y-2">
      {!isAdding ? (
        <div className="flex gap-2">
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select source..." />
            </SelectTrigger>
            <SelectContent>
              {customSources.map(source => (
                <SelectItem key={source.id} value={source.value}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsAdding(true)}
            title="Add custom source"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            placeholder="e.g., Social Media, Trade Show..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddSource(); }
              if (e.key === 'Escape') { setIsAdding(false); setNewSourceName(''); }
            }}
          />
          <Button type="button" size="sm" onClick={handleAddSource} disabled={!newSourceName.trim()}>
            Add
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => { setIsAdding(false); setNewSourceName(''); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}