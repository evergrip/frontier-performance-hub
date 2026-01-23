import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ChevronRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import EmptyState from '../components/common/EmptyState';

export default function Projects() {
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: ({ projectId, status }) => 
      base44.entities.Project.update(projectId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project status updated');
    }
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Unknown Client';
  };

  const activeProjects = projects.filter(p => !['closed'].includes(p.status));
  const closedProjects = projects.filter(p => p.status === 'closed');

  const statusColumns = [
    { status: 'awaiting_to_be_scheduled', label: 'Awaiting to be Scheduled', color: 'bg-slate-100 border-slate-200', description: 'New projects' },
    { status: 'mobilization', label: 'Mobilization', color: 'bg-blue-100 border-blue-200', description: 'Getting ready' },
    { status: 'active_construction', label: 'Active Construction', color: 'bg-green-100 border-green-200', description: 'Under construction' },
    { status: 'substantial_completion_closeout', label: 'Substantial Completion & Closeout', color: 'bg-amber-100 border-amber-200', description: 'Finishing up' },
  ];

  const getNextStatus = (currentStatus) => {
    const statuses = ['awaiting_to_be_scheduled', 'mobilization', 'active_construction', 'substantial_completion_closeout'];
    const currentIndex = statuses.indexOf(currentStatus);
    return currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : null;
  };

  const handleAdvanceStatus = (projectId, currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return;
    
    updateProjectStatusMutation.mutate({
      projectId,
      status: nextStatus
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;
    
    const newStatus = destination.droppableId;
    const projectId = draggableId;
    
    updateProjectStatusMutation.mutate({
      projectId,
      status: newStatus
    });
  };

  const totalValue = activeProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Projects</h1>
        <p className="text-lg text-slate-500">Track construction projects through mobilization, construction, and closeout</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{activeProjects.length}</div>
            <div className="text-sm text-slate-500">Active Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">${(totalValue / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-slate-500">Pipeline Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">{closedProjects.length}</div>
            <div className="text-sm text-slate-500">Closed Projects</div>
          </CardContent>
        </Card>
      </div>

      {activeProjects.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statusColumns.map(column => {
              const columnProjects = activeProjects.filter(p => p.status === column.status);
              const columnValue = columnProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
              
              return (
                <div key={column.status}>
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900">{column.label}</h3>
                    <p className="text-xs text-slate-500">{column.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-slate-600">{columnProjects.length} projects</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        ${(columnValue / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                  <Droppable droppableId={column.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? 'bg-slate-100' : ''
                        }`}
                      >
                        {columnProjects.map((project, index) => {
                          const nextStatus = getNextStatus(project.status);
                          return (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                              {(provided, snapshot) => (
                                <Card 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border-2 ${column.color} transition-all ${
                                    snapshot.isDragging ? 'shadow-2xl rotate-2' : 'hover:shadow-lg'
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="flex items-center gap-2 mb-2 cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                      <h4 className="font-semibold text-slate-900 flex-1">{project.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2 ml-6">{getClientName(project.client_id)}</p>
                          
                                    <div className="space-y-1 mb-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Contract Value</span>
                                        <span className="text-sm font-bold text-slate-700">
                                          ${((project.contract_value || 0) / 1000).toFixed(0)}k
                                        </span>
                                      </div>
                                      {project.start_date && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-slate-500">Start Date</span>
                                          <span className="text-xs text-slate-600">
                                            {format(new Date(project.start_date), 'MMM d, yyyy')}
                                          </span>
                                        </div>
                                      )}
                                      {project.target_completion_date && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-slate-500">Target Completion</span>
                                          <span className="text-xs text-slate-600">
                                            {format(new Date(project.target_completion_date), 'MMM d, yyyy')}
                                          </span>
                                        </div>
                                      )}
                                      {project.crew_assignment && project.crew_assignment !== 'unassigned' && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-slate-500">Crew</span>
                                          <span className="text-xs font-medium text-slate-700">
                                            {project.crew_assignment.replace('_', ' ').toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {nextStatus && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-xs"
                                        onClick={() => handleAdvanceStatus(project.id, project.status)}
                                      >
                                        <ChevronRight className="w-3 h-3 mr-1" />
                                        Move to Next Phase
                                      </Button>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Building2}
              title="No active projects"
              description="Convert construction sales to projects to start tracking construction work"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}