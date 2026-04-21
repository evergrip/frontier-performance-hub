import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Pencil, Archive, RotateCcw } from 'lucide-react';
import PreconStageFormDialog from '@/components/precon/PreconStageFormDialog';

export default function PreconStagesAdmin() {
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['precon-stages'],
    queryFn: () => base44.entities.PreconStage.list('stage_order', 200),
  });

  const activeStages = stages.filter(s => s.is_active !== false).sort((a, b) => a.stage_order - b.stage_order);
  const archivedStages = stages.filter(s => s.is_active === false).sort((a, b) => a.stage_order - b.stage_order);

  const reorderMutation = useMutation({
    mutationFn: async (updates) => {
      for (const { id, stage_order } of updates) {
        await base44.entities.PreconStage.update(id, { stage_order });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['precon-stages']),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PreconStage.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['precon-stages']),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = [...activeStages];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const updates = items.map((s, i) => ({ id: s.id, stage_order: i + 1 }));
    reorderMutation.mutate(updates);
  };

  const gateColors = {
    'DG': 'bg-blue-100 text-blue-700',
    'IA': 'bg-purple-100 text-purple-700',
    'CS': 'bg-emerald-100 text-emerald-700',
    'AR': 'bg-amber-100 text-amber-700',
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Precon Stages</h1>
          <p className="text-lg text-slate-500">Admin-managed 34-stage pre-construction process. Drag to reorder.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="w-4 h-4 mr-2" />
            {showArchived ? 'Hide' : 'Show'} Archived ({archivedStages.length})
          </Button>
          <Button onClick={() => { setEditingStage(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Stage
          </Button>
        </div>
      </div>

      {/* Active stages table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="w-10 p-3"></th>
                  <th className="w-10 p-3 text-left text-xs font-semibold text-slate-500">#</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Stage Name</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Purpose</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Main Deliverable</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Gate</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">R / A / C / I</th>
                  <th className="w-20 p-3"></th>
                </tr>
              </thead>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="stages">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {activeStages.map((stage, index) => (
                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border-b hover:bg-slate-50 transition-colors ${snapshot.isDragging ? 'bg-blue-50 shadow-lg' : ''}`}
                            >
                              <td className="p-3" {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                              </td>
                              <td className="p-3 font-mono text-xs text-slate-400">{stage.stage_order}</td>
                              <td className="p-3 font-medium text-slate-900">{stage.stage_name}</td>
                              <td className="p-3 text-slate-600 max-w-[200px] truncate">{stage.purpose}</td>
                              <td className="p-3 text-slate-600 max-w-[200px] truncate">{stage.main_deliverable}</td>
                              <td className="p-3">
                                {stage.approval_gate && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gateColors[stage.approval_gate] || 'bg-slate-100 text-slate-600'}`}>
                                    {stage.approval_gate}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-xs text-slate-500">
                                <span className="font-medium text-blue-600">{stage.raci_responsible || '-'}</span>
                                {' / '}
                                <span className="font-medium text-purple-600">{stage.raci_accountable || '-'}</span>
                                {' / '}
                                <span>{stage.raci_consulted || '-'}</span>
                                {' / '}
                                <span>{stage.raci_informed || '-'}</span>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingStage(stage); setFormOpen(true); }}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => archiveMutation.mutate({ id: stage.id, is_active: false })}>
                                    <Archive className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </tbody>
                  )}
                </Droppable>
              </DragDropContext>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Archived stages */}
      {showArchived && archivedStages.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-slate-500 mb-3">Archived Stages</p>
            <div className="space-y-2">
              {archivedStages.map(stage => (
                <div key={stage.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-mono text-xs text-slate-400 mr-2">#{stage.stage_order}</span>
                    <span className="text-sm font-medium text-slate-600">{stage.stage_name}</span>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => archiveMutation.mutate({ id: stage.id, is_active: true })}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <PreconStageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        stage={editingStage}
        nextOrder={activeStages.length + 1}
      />
    </div>
  );
}