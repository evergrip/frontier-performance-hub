import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Building2, ChevronRight, GripVertical, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import EmptyState from '../components/common/EmptyState';

export default function Projects() {
  const queryClient = useQueryClient();
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [closeoutDialogOpen, setCloseoutDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    actual_costs: '',
    actual_margin: '',
    variance_explanation: '',
    client_id: ''
  });
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [monthlyAllocations, setMonthlyAllocations] = useState([]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings[0];
    }
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: ({ projectId, status, actual_costs, actual_margin, color, client_id }) => 
      base44.entities.Project.update(projectId, { 
        status, 
        actual_costs: actual_costs !== undefined ? actual_costs : undefined,
        actual_margin: actual_margin !== undefined ? actual_margin : undefined,
        color: color !== undefined ? color : undefined,
        client_id: client_id !== undefined ? client_id : undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setAdvanceDialogOpen(false);
      setCloseoutDialogOpen(false);
      setProjectForm({ actual_costs: '', actual_margin: '' });
      toast.success('Project updated');
    }
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Unknown Client';
  };

  const getProjectClientName = (project) => {
    if (!project) return 'Unknown Client';
    
    // First try direct client_id
    if (project.client_id) {
      const client = clients.find(c => c.id === project.client_id);
      if (client?.company_name) return client.company_name;
    }
    
    // Fall back to linked sale's client_id
    if (project.sale_id) {
      const sale = sales.find(s => s.id === project.sale_id);
      if (sale?.client_id) {
        const client = clients.find(c => c.id === sale.client_id);
        if (client?.company_name) return client.company_name;
      }
    }
    
    return 'Unknown Client';
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

  const openAdvanceDialog = (project) => {
    setSelectedProject(project);
    setProjectForm({
      actual_costs: project.actual_costs || project.contract_value || '',
      actual_margin: project.actual_margin || 45
    });
    setAdvanceDialogOpen(true);
  };

  const openCloseoutDialog = (project) => {
    setSelectedProject(project);
    setProjectForm({
      actual_costs: project.actual_costs || project.contract_value || '',
      actual_margin: project.actual_margin || 45,
      variance_explanation: ''
    });
    // Initialize monthly allocations from current year
    const now = new Date();
    const currentYear = now.getFullYear();
    const allocations = [];
    for (let month = 1; month <= 12; month++) {
      allocations.push({ year: currentYear, month, percentage: 0 });
    }
    setMonthlyAllocations(allocations);
    setCloseoutDialogOpen(true);
  };

  const openEditDialog = (project) => {
    setSelectedProject(project);
    setProjectForm({
      actual_costs: project.actual_costs || project.contract_value || '',
      actual_margin: project.actual_margin || 45,
      client_id: project.client_id || ''
    });
    setEditDialogOpen(true);
  };

  const handleAdvanceStatus = async (e) => {
    e.preventDefault();
    const nextStatus = getNextStatus(selectedProject.status);
    if (!nextStatus) return;
    
    // Update phase-based commission availability
    try {
      await base44.functions.invoke('updatePhaseCommission', {
        project_id: selectedProject.id,
        phase: nextStatus,
        type: 'construction'
      });
    } catch (error) {
      console.error('Phase commission update failed:', error);
    }
    
    updateProjectStatusMutation.mutate({
      projectId: selectedProject.id,
      status: nextStatus,
      actual_costs: parseFloat(projectForm.actual_costs) || 0,
      actual_margin: parseFloat(projectForm.actual_margin) || 0
    });
  };

  const handleCloseoutProject = async (e) => {
    e.preventDefault();
    
    const actualGrossRevenue = parseFloat(projectForm.actual_costs) || 0;
    const contractValue = selectedProject.contract_value || 0;
    const variancePercent = Math.abs(((actualGrossRevenue - contractValue) / contractValue) * 100);
    const threshold = companySettings?.project_closeout_variance_threshold || 3;
    
    if (variancePercent > threshold && !projectForm.variance_explanation.trim()) {
      toast.error(`Variance exceeds ${threshold}%. Please explain the difference.`);
      return;
    }
    
    // Validate that monthly allocations sum to 100%
    const totalPercent = monthlyAllocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0);
    if (totalPercent !== 100) {
      toast.error(`Monthly allocations must total 100% (currently ${totalPercent}%)`);
      return;
    }
    
    // Update commission with actual construction cost
    if (selectedProject.sale_id) {
      try {
        await base44.functions.invoke('processCommission', {
          sale_id: selectedProject.sale_id,
          sale_type: 'construction',
          final_amount: actualGrossRevenue,
          is_update: true
        });
      } catch (error) {
        console.error('Commission update failed:', error);
      }
    }
    
    updateProjectStatusMutation.mutate({
      projectId: selectedProject.id,
      status: 'closed',
      actual_costs: parseFloat(projectForm.actual_costs) || 0,
      actual_margin: parseFloat(projectForm.actual_margin) || 0,
      monthly_revenue_allocations: monthlyAllocations.filter(a => parseFloat(a.percentage) > 0),
      notes: projectForm.variance_explanation ? 
        `${selectedProject.notes || ''}\n\nCloseout Variance Explanation: ${projectForm.variance_explanation}`.trim() :
        selectedProject.notes
    });
  };

  const handleUpdateProject = (e) => {
    e.preventDefault();
    
    updateProjectStatusMutation.mutate({
      projectId: selectedProject.id,
      status: selectedProject.status,
      actual_costs: parseFloat(projectForm.actual_costs) || 0,
      actual_margin: parseFloat(projectForm.actual_margin) || 0,
      client_id: projectForm.client_id || selectedProject.client_id
    });
    setEditDialogOpen(false);
  };

  const generateRandomColor = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#82E0AA'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;
    
    const newStatus = destination.droppableId;
    const projectId = draggableId;
    const project = projects.find(p => p.id === projectId);
    
    // Generate random color when moving away from awaiting_to_be_scheduled
    const updates = { status: newStatus };
    if (project?.status === 'awaiting_to_be_scheduled' && newStatus !== 'awaiting_to_be_scheduled') {
      updates.color = generateRandomColor();
    }
    
    updateProjectStatusMutation.mutate({
      projectId,
      ...updates
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
                                   style={project.color ? { borderColor: project.color, borderWidth: '2px' } : {}}
                                   className={`border-2 ${!project.color ? column.color : ''} transition-all cursor-pointer ${
                                     snapshot.isDragging ? 'shadow-2xl rotate-2' : 'hover:shadow-lg'
                                   }`}
                                   onClick={() => openEditDialog(project)}
                                 >
                                  <CardContent className="p-4">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="flex items-center gap-2 mb-2 cursor-grab active:cursor-grabbing"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                      <h4 className="font-semibold text-slate-900 flex-1">{project.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2 ml-6">{getProjectClientName(project)}</p>
                          
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

                                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                      {nextStatus && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-xs"
                                          onClick={() => openAdvanceDialog(project)}
                                        >
                                          <ChevronRight className="w-3 h-3 mr-1" />
                                          Move to Next Phase
                                        </Button>
                                      )}
                                      {project.status === 'substantial_completion_closeout' && (
                                        <Button
                                          size="sm"
                                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-700"
                                          onClick={() => openCloseoutDialog(project)}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Close Out Project
                                        </Button>
                                      )}
                                    </div>
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

      {/* Advance Phase Dialog */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Project Metrics & Advance Phase</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdvanceStatus} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedProject?.title}</p>
              <p className="text-xs text-slate-500">{getProjectClientName(selectedProject)}</p>
            </div>

            <div>
              <Label>Actual Project Costs *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Current total costs incurred for this project
              </p>
              <Input
                type="number"
                value={projectForm.actual_costs}
                onChange={(e) => setProjectForm({...projectForm, actual_costs: e.target.value})}
                placeholder="650000"
                required
              />
            </div>

            <div>
              <Label>Actual Gross Margin (%) *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Current margin percentage based on actual costs
              </p>
              <Input
                type="number"
                step="0.01"
                value={projectForm.actual_margin}
                onChange={(e) => setProjectForm({...projectForm, actual_margin: e.target.value})}
                placeholder="15.5"
                required
              />
            </div>

            {selectedProject && projectForm.actual_costs && projectForm.actual_margin && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Original Contract Value:</span>
                    <span className="font-semibold">${((selectedProject.contract_value || 0) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Gross Revenue:</span>
                    <span className="font-semibold">${(parseFloat(projectForm.actual_costs) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Profit:</span>
                    <span className="font-semibold text-emerald-700">
                      ${((parseFloat(projectForm.actual_costs) * (parseFloat(projectForm.actual_margin) / 100)) / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setAdvanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProjectStatusMutation.isPending}>
                <ChevronRight className="w-4 h-4 mr-2" />
                Update & Advance Phase
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Project Metrics</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedProject?.title}</p>
            </div>

            <div>
              <Label>Client</Label>
              <Select value={projectForm.client_id} onValueChange={(value) => setProjectForm({...projectForm, client_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                   {clients.map(client => (
                     <SelectItem key={client.id} value={client.id}>
                       {client.company_name || client.contact_name}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Actual Project Costs</Label>
              <p className="text-xs text-slate-500 mb-2">
                Current total costs incurred for this project
              </p>
              <Input
                type="number"
                value={projectForm.actual_costs}
                onChange={(e) => setProjectForm({...projectForm, actual_costs: e.target.value})}
                placeholder="650000"
              />
            </div>

            <div>
              <Label>Actual Gross Margin (%)</Label>
              <p className="text-xs text-slate-500 mb-2">
                Current margin percentage based on actual costs
              </p>
              <Input
                type="number"
                step="0.01"
                value={projectForm.actual_margin}
                onChange={(e) => setProjectForm({...projectForm, actual_margin: e.target.value})}
                placeholder="15.5"
              />
            </div>

            {selectedProject && projectForm.actual_costs && projectForm.actual_margin && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Original Contract Value:</span>
                    <span className="font-semibold">${((selectedProject.contract_value || 0) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Gross Revenue:</span>
                    <span className="font-semibold">${(parseFloat(projectForm.actual_costs) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Profit:</span>
                    <span className="font-semibold text-emerald-700">
                      ${((parseFloat(projectForm.actual_costs) * (parseFloat(projectForm.actual_margin) / 100)) / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProjectStatusMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Closeout Dialog */}
      <Dialog open={closeoutDialogOpen} onOpenChange={setCloseoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Out Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseoutProject} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedProject?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedProject?.client_id)}</p>
              <p className="text-xs text-amber-600 mt-2">Finalizing this project will remove it from the scheduler and active projects</p>
            </div>

            <div>
              <Label>Final Project Costs *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Total actual costs incurred for this project
              </p>
              <Input
                type="number"
                value={projectForm.actual_costs}
                onChange={(e) => setProjectForm({...projectForm, actual_costs: e.target.value})}
                placeholder="720000"
                required
              />
            </div>

            <div>
              <Label>Final Gross Margin (%) *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Final margin percentage based on actual costs
              </p>
              <Input
                type="number"
                step="0.01"
                value={projectForm.actual_margin}
                onChange={(e) => setProjectForm({...projectForm, actual_margin: e.target.value})}
                placeholder="13.2"
                required
              />
            </div>

            {selectedProject && projectForm.actual_costs && (() => {
              const variance = Math.abs(((parseFloat(projectForm.actual_costs) - selectedProject.contract_value) / selectedProject.contract_value) * 100);
              const threshold = companySettings?.project_closeout_variance_threshold || 3;
              return variance > threshold ? (
                <div>
                  <Label className="text-amber-700">Variance Explanation *</Label>
                  <p className="text-xs text-amber-600 mb-2">
                    Revenue variance of {variance.toFixed(2)}% exceeds the {threshold}% threshold. Please explain.
                  </p>
                  <Input
                    type="text"
                    value={projectForm.variance_explanation}
                    onChange={(e) => setProjectForm({...projectForm, variance_explanation: e.target.value})}
                    placeholder="Explain the difference between contract value and actual revenue"
                    required
                  />
                </div>
              ) : null;
            })()}

            {/* Monthly Revenue Allocation */}
            <div>
              <Label className="block mb-2">Monthly Revenue Allocation *</Label>
              <p className="text-xs text-slate-500 mb-3">
                Distribute the ${(parseFloat(projectForm.actual_costs) || 0).toLocaleString()} gross revenue across months. Must total 100%.
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
                {monthlyAllocations.map((alloc) => {
                  const monthName = new Date(alloc.year, alloc.month - 1).toLocaleString('default', { month: 'short' });
                  return (
                    <div key={`${alloc.year}-${alloc.month}`}>
                      <label className="text-xs text-slate-600">{monthName}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={alloc.percentage}
                        onChange={(e) => setMonthlyAllocations(monthlyAllocations.map(a => 
                          a.month === alloc.month && a.year === alloc.year 
                            ? { ...a, percentage: parseFloat(e.target.value) || 0 }
                            : a
                        ))}
                        className="w-full px-2 py-1 border rounded text-xs"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-xs mt-2 p-2 bg-blue-50 rounded">
                Total: <span className={`font-semibold ${monthlyAllocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0) === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {monthlyAllocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0).toFixed(1)}%
                </span>
              </div>
            </div>

            {selectedProject && projectForm.actual_costs && projectForm.actual_margin && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Final Project Summary</h4>
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Original Contract Value:</span>
                    <span className="font-semibold">${((selectedProject.contract_value || 0) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Gross Revenue:</span>
                    <span className="font-semibold">${(parseFloat(projectForm.actual_costs) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-300 pt-1 mt-1">
                    <span className="font-bold">Gross Profit:</span>
                    <span className="font-bold text-emerald-700">
                      ${((parseFloat(projectForm.actual_costs) * (parseFloat(projectForm.actual_margin) / 100)) / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Margin:</span>
                    <span className="font-bold text-emerald-700">{parseFloat(projectForm.actual_margin).toFixed(2)}%</span>
                  </div>
                  {(() => {
                    const variance = Math.abs(((parseFloat(projectForm.actual_costs) - selectedProject.contract_value) / selectedProject.contract_value) * 100);
                    const threshold = companySettings?.project_closeout_variance_threshold || 3;
                    return variance > threshold ? (
                      <div className="flex justify-between text-amber-600 border-t border-amber-300 pt-1 mt-1">
                        <span className="font-bold">Variance:</span>
                        <span className="font-bold">{variance.toFixed(2)}% (exceeds {threshold}%)</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setCloseoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProjectStatusMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Close Out Project
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}