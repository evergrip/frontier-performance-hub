import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Network } from 'lucide-react';
import EntityRelationshipView from '../components/relationships/EntityRelationshipView';

export default function Relationships() {
  const [selectedEntityType, setSelectedEntityType] = useState('Client');
  const [selectedEntityId, setSelectedEntityId] = useState(null);

  const { data: entities = [] } = useQuery({
    queryKey: [selectedEntityType.toLowerCase()],
    queryFn: () => base44.entities[selectedEntityType].list('-created_date'),
    initialData: [],
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntityId) {
      setSelectedEntityId(entities[0].id);
    }
  }, [entities]);

  useEffect(() => {
    setSelectedEntityId(null);
  }, [selectedEntityType]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Network className="w-10 h-10 text-amber-600" />
          Entity Relationships
        </h1>
        <p className="text-lg text-slate-500">
          Visualize data flow with AI-powered insights and validation
        </p>
      </div>

      {/* Entity Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Entity Type</Label>
              <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Sale">Sale</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Entity</Label>
              <Select value={selectedEntityId || ''} onValueChange={setSelectedEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.title || entity.company_name || entity.name || 'Untitled'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relationship View */}
      {selectedEntityId && (
        <EntityRelationshipView 
          entityType={selectedEntityType}
          entityId={selectedEntityId}
        />
      )}
    </div>
  );
}