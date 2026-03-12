import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Building2, ChevronRight, ChevronLeft, GripVertical, CheckCircle, Archive, Pencil } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import EmptyState from '../components/common/EmptyState';
import EditableTimeline from '../components/common/EditableTimeline';
import AuditItemFixer from '../components/common/AuditItemFixer';
import EditProjectDetailDialog from '../components/projects/EditProjectDetailDialog';
import ConstructionForecast from '../components/projects/ConstructionForecast';
import PreconAllocationDialog from '../components/projects/PreconAllocationDialog';
import SubAllocationDialog from '../components/projects/SubAllocationDialog';
import { getFiscalYearLabel } from '../components/utils/fiscalYear';
import { createPageUrl } from '../utils';

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const [filterSalesperson, setFilterSalesperson] = useState('all');
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [closeoutDialogOpen, setCloseoutDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    actual_costs: '',
    actual_margin: '',
    variance_explanation: '',
    margin_variance_explanation: '',
    client_id: '',
    project_manager_id: ''
  });
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [monthlyAllocations, setMonthlyAllocations] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [sendBackPhase, setSendBackPhase] = useState('');
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [closeoutAuditPassed, setCloseoutAuditPassed] = useState(false);
  const [editDetailDialogOpen, setEditDetailDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [preconAllocDialogOpen, setPreconAllocDialogOpen] = useState(false);
  const [allocatingSale, setAllocatingSale] = useState(null);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subDialogProject, setSubDialogProject] = useState(null);

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

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings[0];
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: commissionTransactions = [] } = useQuery({
    queryKey: ['commission-transactions'],
    queryFn: () => base44.entities.CommissionTransaction.list(),
    initialData: [],
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: ({ projectId, status, actual_costs, actual_margin, color, client_id, status_history, monthly_revenue_allocations, notes, project_manager_id }) => {
      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (actual_costs !== undefined) updateData.actual_costs = actual_costs;
      if (actual_margin !== undefined) updateData.actual_margin = actual_margin;
      if (color !== undefined) updateData.color = color;
      if (client_id !== undefined) updateData.client_id = client_id;
      if (status_history !== undefined) updateData.status_history = status_history;
      if (monthly_revenue_allocations !== undefined) updateData.monthly_revenue_allocations = monthly_revenue_allocations;
      if (notes !== undefined) updateData.notes = notes;
      if (project_manager_id !== undefined) updateData.project_manager_id = project_manager_id;
      return base44.entities.Project.update(projectId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setAdvanceDialogOpen(false);
      setCloseoutDialogOpen(false);
      setProjectForm({ actual_costs: '', actual_margin: '', variance_explanation: '', margin_variance_explanation: '', client_id: '', project_manager_id: '' });
      toast.success('Project updated');
    }
  });

  const updateProjectHistoryMutation = useMutation({
    mutationFn: ({ projectId, status_history }) =>
      base44.entities.Project.update(projectId, { status_history }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['projects']);
      // Update selectedProject so the timeline reflects the saved changes immediately
      if (selectedProject && selectedProject.id === variables.projectId) {
        setSelectedProject(prev => ({ ...prev, status_history: variables.status_history }));
      }
      toast.success('Timeline dates updated');
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
      if (client) return client.company_name || client.contact_name;
    }
    
    // Fall back to linked sale's client_id
    if (project.sale_id) {
      const sale = sales.find(s => s.id === project.sale_id);
      if (sale?.client_id) {
        const client = clients.find(c => c.id === sale.client_id);
        if (client) return client.company_name || client.contact_name;
      }
    }
    
    return 'Unknown Client';
  };

  // Non-admin users only see projects where they are the project manager or the linked sale is assigned to them
  const scopedProjects = isAdmin ? projects : projects.filter(p => {
    if (p.project_manager_id === currentUser?.id) return true;
    const sale = sales.find(s => s.id === p.sale_id);
    return sale?.assigned_to === currentUser?.id;
  });
  const filteredProjects = isAdmin && filterSalesperson !== 'all'
    ? scopedProjects.filter(p => {
        const sale = sales.find(s => s.id === p.sale_id);
        return sale?.assigned_to === filterSalesperson || p.project_manager_id === filterSalesperson;
      })
    : scopedProjects;
  const activeProjects = filteredProjects.filter(p => !['closed'].includes(p.status));
  const closedProjects = filteredProjects.filter(p => p.status === 'closed');
  const salespeopleWithProjects = [...new Set(projects.map(p => {
    const sale = sales.find(s => s.id === p.sale_id);
    return sale?.assigned_to || p.project_manager_id;
  }).filter(Boolean))];

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
      actual_margin: project.actual_margin || 45,
      project_manager_id: project.project_manager_id || ''
    });
    
    // Initialize monthly allocations if advancing TO mobilization
    const nextStatus = getNextStatus(project.status);
    if (nextStatus === 'mobilization') {
      const now = new Date();
      const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentFiscalYear = fiscalStartMonth === 1 ? currentYear : (currentMonth >= fiscalStartMonth ? currentYear + 1 : currentYear);
      setSelectedFiscalYear(currentFiscalYear);
      
      // Initialize allocations or use existing
      if (project.monthly_revenue_allocations?.length > 0) {
        setMonthlyAllocations(project.monthly_revenue_allocations);
      } else {
        const allocations = [];
        for (let i = 0; i < 12; i++) {
          const month = ((fiscalStartMonth - 1 + i) % 12) + 1;
          const yr = fiscalStartMonth === 1 ? currentFiscalYear : (month >= fiscalStartMonth ? currentFiscalYear - 1 : currentFiscalYear);
          allocations.push({ year: yr, month, percentage: 0 });
        }
        setMonthlyAllocations(allocations);
      }
    }
    
    setAdvanceDialogOpen(true);
  };

  const openCloseoutDialog = (project) => {
    setSelectedProject(project);
    setProjectForm({
      actual_costs: project.actual_costs || project.contract_value || '',
      actual_margin: project.actual_margin || 45,
      variance_explanation: ''
    });
    
    // Determine current fiscal year based on company settings
    // FY convention: fiscalYear = the calendar year in which the FY ENDS
    // e.g. FY 2026 = Oct 2025 – Sep 2026
    const now = new Date();
    const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // If we're on or after the fiscal start month, the FY ends next calendar year
    // If we're before the fiscal start month, the FY ends this calendar year
    const currentFiscalYear = currentMonth >= fiscalStartMonth ? currentYear + 1 : currentYear;
    // Special case: if fiscal year starts in January, FY ends same year
    const adjustedFiscalYear = fiscalStartMonth === 1 ? currentYear : currentFiscalYear;
    setSelectedFiscalYear(adjustedFiscalYear);
    
    // Initialize monthly allocations for the current fiscal year
    // FY ends in adjustedFiscalYear, so months >= fiscalStartMonth are in (adjustedFiscalYear - 1), months < fiscalStartMonth are in adjustedFiscalYear
    const allocations = [];
    for (let i = 0; i < 12; i++) {
      const month = ((fiscalStartMonth - 1 + i) % 12) + 1;
      const year = month >= fiscalStartMonth ? adjustedFiscalYear - 1 : adjustedFiscalYear;
      // Special case: if fiscal starts in Jan, all months are in the same year
      const adjustedYear = fiscalStartMonth === 1 ? adjustedFiscalYear : year;
      allocations.push({ year: adjustedYear, month, percentage: 0 });
    }
    setMonthlyAllocations(allocations);
    setCloseoutDialogOpen(true);
  };

  const openEditDialog = (project) => {
    // If project is closed, navigate to audit tool instead
    if (project.status === 'closed') {
      handleAuditProject(project);
      return;
    }
    
    setSelectedProject(project);
    setProjectForm({
      actual_costs: project.actual_costs || project.contract_value || '',
      actual_margin: project.actual_margin || 45,
      client_id: project.client_id || ''
    });
    
    // Load allocations for all active statuses including awaiting_to_be_scheduled
    if (['awaiting_to_be_scheduled', 'mobilization', 'active_construction', 'substantial_completion_closeout'].includes(project.status)) {
      const now = new Date();
      const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentFiscalYear = fiscalStartMonth === 1 ? currentYear : (currentMonth >= fiscalStartMonth ? currentYear + 1 : currentYear);
      setSelectedFiscalYear(currentFiscalYear);
      
      // Build a clean set of month slots for the current fiscal year
      const buildFYSlots = (fy) => {
        const slots = [];
        for (let i = 0; i < 12; i++) {
          const month = ((fiscalStartMonth - 1 + i) % 12) + 1;
          const yr = fiscalStartMonth === 1 ? fy : (month >= fiscalStartMonth ? fy - 1 : fy);
          slots.push({ year: yr, month, percentage: 0 });
        }
        return slots;
      };
      
      const existingAllocs = (project.monthly_revenue_allocations || []).filter(a => a.year && a.month);
      const hasProperFields = existingAllocs.length > 0;
      
      if (hasProperFields) {
        // Merge existing allocations into fiscal year slots
        // Determine which fiscal years are covered
        const fySet = new Set();
        existingAllocs.forEach(a => {
          const afy = fiscalStartMonth === 1 ? a.year : (a.month >= fiscalStartMonth ? a.year + 1 : a.year);
          fySet.add(afy);
        });
        fySet.add(currentFiscalYear);
        
        let allSlots = [];
        fySet.forEach(fy => {
          const slots = buildFYSlots(fy);
          slots.forEach(slot => {
            if (!allSlots.find(s => s.year === slot.year && s.month === slot.month)) {
              allSlots.push(slot);
            }
          });
        });
        
        // Apply existing percentages
        existingAllocs.forEach(a => {
          const slot = allSlots.find(s => s.year === a.year && s.month === a.month);
          if (slot) slot.percentage = a.percentage || 0;
        });
        
        setMonthlyAllocations(allSlots);
      } else {
        // No valid allocations — start fresh
        setMonthlyAllocations(buildFYSlots(currentFiscalYear));
      }
      setAllocationDialogOpen(true);
    }
    
    setEditDialogOpen(true);
  };

  const handleAuditProject = (project) => {
    // Find the lead associated with this project through its sale
    const sale = sales.find(s => s.id === project.sale_id);
    const lead = sale ? leads.find(l => l.id === sale.lead_id) : null;
    
    if (lead) {
      navigate(createPageUrl('ImportHistoricalData') + `?tab=audit&lead_id=${lead.id}`);
    } else {
      toast.error('Could not find lead associated with this project');
    }
  };

  const handleAdvanceStatus = async (e) => {
    e.preventDefault();
    const nextStatus = getNextStatus(selectedProject.status);
    if (!nextStatus) return;

    // Require project manager when advancing to mobilization
    if (nextStatus === 'mobilization' && !projectForm.project_manager_id) {
      toast.error('A Project Manager must be assigned before moving to Mobilization.');
      return;
    }
    
    // Update phase-based commission availability
    await base44.functions.invoke('updatePhaseCommission', {
      project_id: selectedProject.id,
      phase: nextStatus,
      type: 'construction'
    });
    
    // Build status history — tag with source: 'project'
    const currentHistory = selectedProject.status_history || [];
    const newHistory = [...currentHistory, { status: nextStatus, entered_date: new Date().toISOString(), source: 'project' }];

    // Save allocations if advancing TO mobilization or later
    const updateData = {
      projectId: selectedProject.id,
      status: nextStatus,
      status_history: newHistory,
      actual_costs: parseFloat(projectForm.actual_costs) || 0,
      actual_margin: parseFloat(projectForm.actual_margin) || 0
    };

    // Save project manager if set
    if (projectForm.project_manager_id) {
      updateData.project_manager_id = projectForm.project_manager_id;
    }
    
    if (nextStatus === 'mobilization' && monthlyAllocations.length > 0) {
      updateData.monthly_revenue_allocations = monthlyAllocations
        .filter(a => a.year && a.month && parseFloat(a.percentage) > 0)
        .map(a => ({ year: Number(a.year), month: Number(a.month), period: `${a.year}-${String(a.month).padStart(2, '0')}`, percentage: Number(a.percentage) }));
    }
    
    updateProjectStatusMutation.mutate(updateData);
  };

  const handleCloseoutProject = async (e) => {
    e.preventDefault();
    
    const actualCosts = parseFloat(projectForm.actual_costs) || 0;
    const contractValue = selectedProject.contract_value || 0;
    const variancePercent = Math.abs(((actualCosts - contractValue) / contractValue) * 100);
    const threshold = companySettings?.project_closeout_variance_threshold || 3;
    
    if (variancePercent > threshold && !projectForm.variance_explanation.trim()) {
      toast.error(`Variance exceeds ${threshold}%. Please explain the difference.`);
      return;
    }

    // Check margin variance vs estimated margin from linked sale
    const linkedSale = sales.find(s => s.id === selectedProject.sale_id);
    const estimatedMargin = linkedSale?.estimated_margin;
    const actualMargin = parseFloat(projectForm.actual_margin) || 0;
    if (estimatedMargin != null && Math.abs(actualMargin - estimatedMargin) > 2 && !projectForm.margin_variance_explanation?.trim()) {
      toast.error('Actual margin differs from estimated margin by more than 2%. Please explain why.');
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
      const actualCostsVal = parseFloat(projectForm.actual_costs) || 0;
      const actualMarginVal = parseFloat(projectForm.actual_margin) || 0;
      const actualGrossRevenue = actualMarginVal < 100 ? actualCostsVal / (1 - (actualMarginVal / 100)) : actualCostsVal;
      await base44.functions.invoke('processCommission', {
        sale_id: selectedProject.sale_id,
        sale_type: 'construction',
        final_amount: actualGrossRevenue,
        is_update: true
      });
    }
    
    // Add 'closed' to status_history
    const closedHistory = [...(selectedProject.status_history || []), { status: 'closed', entered_date: new Date().toISOString(), source: 'project' }];

    updateProjectStatusMutation.mutate({
      projectId: selectedProject.id,
      status: 'closed',
      status_history: closedHistory,
      actual_costs: parseFloat(projectForm.actual_costs) || 0,
      actual_margin: parseFloat(projectForm.actual_margin) || 0,
      monthly_revenue_allocations: monthlyAllocations
        .filter(a => a.year && a.month && parseFloat(a.percentage) > 0)
        .map(a => ({ year: Number(a.year), month: Number(a.month), period: `${a.year}-${String(a.month).padStart(2, '0')}`, percentage: Number(a.percentage) })),
      notes: (() => {
        let n = selectedProject.notes || '';
        if (projectForm.variance_explanation) n = `${n}\n\nCloseout Variance Explanation: ${projectForm.variance_explanation}`.trim();
        if (projectForm.margin_variance_explanation) n = `${n}\n\nMargin Variance Explanation: ${projectForm.margin_variance_explanation}`.trim();
        return n || selectedProject.notes;
      })()
    });
  };

  const handleUpdateProject = (e) => {
    e.preventDefault();
    
    const updateData = {
      projectId: selectedProject.id,
      status: selectedProject.status,
      actual_costs: parseFloat(projectForm.actual_costs) || 0,
      actual_margin: parseFloat(projectForm.actual_margin) || 0,
      client_id: projectForm.client_id || selectedProject.client_id
    };
    
    // Always replace the full allocation array with clean objects
    if (monthlyAllocations.length > 0) {
      const cleanAllocations = monthlyAllocations
        .filter(a => a.year && a.month && parseFloat(a.percentage) > 0)
        .map(a => ({ year: Number(a.year), month: Number(a.month), period: `${a.year}-${String(a.month).padStart(2, '0')}`, percentage: Number(a.percentage) }));
      updateData.monthly_revenue_allocations = cleanAllocations;
    } else {
      updateData.monthly_revenue_allocations = [];
    }
    
    updateProjectStatusMutation.mutate(updateData);
    setEditDialogOpen(false);
    setAllocationDialogOpen(false);
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

    // If dragging to mobilization and no project manager, open the advance dialog instead
    if (newStatus === 'mobilization' && !project?.project_manager_id) {
      toast.error('A Project Manager must be assigned before moving to Mobilization. Use the advance dialog.');
      openAdvanceDialog(project);
      return;
    }
    
    // Build status history — tag with source: 'project'
    const currentHistory = project?.status_history || [];
    const newHistory = [...currentHistory, { status: newStatus, entered_date: new Date().toISOString(), source: 'project' }];

    // Generate random color when moving away from awaiting_to_be_scheduled
    const updates = { status: newStatus, status_history: newHistory };
    if (project?.status === 'awaiting_to_be_scheduled' && newStatus !== 'awaiting_to_be_scheduled') {
      updates.color = generateRandomColor();
    }
    
    // Wipe allocations when moving back to awaiting_to_be_scheduled
    if (newStatus === 'awaiting_to_be_scheduled') {
      updates.monthly_revenue_allocations = [];
      updates.monthly_work_allocations = [];
      updates.color = null;
    }
    
    updateProjectStatusMutation.mutate({
      projectId,
      ...updates
    });
  };

  const preconPhases = [
    { value: 'feasibility', label: 'Feasibility' },
    { value: 'design_material_selections', label: 'Design & Materials' },
    { value: 'engineering_permits', label: 'Engineering & Permits' },
    { value: 'pending_construction_sale', label: 'Pending Construction' },
  ];

  const sendBackToPreconMutation = useMutation({
    mutationFn: async ({ project, targetPhase }) => {
      // Find the linked construction sale
      const constructionSale = sales.find(s => s.id === project.sale_id);
      if (!constructionSale) throw new Error('No linked construction sale found');
      
      // Find the linked precon sale
      const preconSale = sales.find(s => s.id === constructionSale.linked_precon_sale_id);
      if (!preconSale) throw new Error('No linked pre-construction sale found');

      // Add note to construction commission transactions
      const constructionTransactions = await base44.entities.CommissionTransaction.filter({ sale_id: constructionSale.id });
      const sendBackNote = `SENT BACK: Project "${project.title}" sent back from construction to pre-construction phase "${targetPhase}" on ${new Date().toLocaleDateString()}. Construction sale deleted.`;
      for (const txn of constructionTransactions) {
        const existingNotes = txn.notes || '';
        await base44.entities.CommissionTransaction.update(txn.id, {
          notes: existingNotes ? `${existingNotes}\n\n${sendBackNote}` : sendBackNote
        });
      }

      // Add note to precon commission transactions
      const preconTransactions = await base44.entities.CommissionTransaction.filter({ sale_id: preconSale.id });
      const preconNote = `SENT BACK: Associated construction project "${project.title}" sent back to pre-construction phase "${targetPhase}" on ${new Date().toLocaleDateString()}. Pre-con sale reopened.`;
      for (const txn of preconTransactions) {
        const existingNotes = txn.notes || '';
        await base44.entities.CommissionTransaction.update(txn.id, {
          notes: existingNotes ? `${existingNotes}\n\n${preconNote}` : preconNote
        });
      }

      // Reopen the precon sale at the target phase
      const preconHistory = [...(preconSale.phase_history || []), {
        status: targetPhase,
        entered_date: new Date().toISOString(),
        source: 'sale'
      }];
      await base44.entities.Sale.update(preconSale.id, {
        status: targetPhase,
        phase_history: preconHistory,
        commission_processed: false
      });

      // Delete the construction sale
      await base44.entities.Sale.delete(constructionSale.id);

      // Delete the project
      await base44.entities.Project.delete(project.id);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['sales']);
      setSendBackDialogOpen(false);
      setSendBackPhase('');
      toast.success('Sent back to pre-construction');
    }
  });

  const reopenProjectMutation = useMutation({
    mutationFn: ({ project }) => {
      const newHistory = [...(project.status_history || []), {
        status: 'substantial_completion_closeout',
        entered_date: new Date().toISOString(),
        source: 'project'
      }];
      return base44.entities.Project.update(project.id, {
        status: 'substantial_completion_closeout',
        status_history: newHistory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setReopenDialogOpen(false);
      setSelectedProject(null);
      toast.success('Project reopened');
    }
  });

  const totalValue = activeProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Construction Projects</h1>
        <p className="text-lg text-slate-500">Active construction projects — created when a pre-construction sale is converted. Drag cards to advance through stages.</p>
      </div>

      {/* Salesperson Filter - admin only */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Filter by Salesperson:</span>
          <Select value={filterSalesperson} onValueChange={setFilterSalesperson}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Salespeople" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salespeople</SelectItem>
              {salespeopleWithProjects.map(userId => {
                const u = users.find(u => u.id === userId);
                return (
                  <SelectItem key={userId} value={userId}>
                    {u?.full_name || 'Unknown'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

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
            <div className="text-2xl font-bold text-emerald-600">${totalValue.toLocaleString()}</div>
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

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Projects</TabsTrigger>
          <TabsTrigger value="closed">
            <Archive className="w-4 h-4 mr-2" />
            Past Projects ({closedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
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
                        {columnProjects.map((project, index) => (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                               {(provided, snapshot) => (
                                 <Card 
                                   ref={provided.innerRef}
                                   {...provided.draggableProps}
                                   {...provided.dragHandleProps}
                                   style={{
                                      ...provided.draggableProps.style,
                                      ...(project.color ? { borderColor: project.color, borderWidth: '2px', backgroundColor: project.color + '18' } : {})
                                    }}
                                    className={`border ${!project.color ? column.color : ''} transition-all cursor-pointer group ${
                                    snapshot.isDragging ? 'shadow-2xl rotate-2' : 'hover:shadow-md'
                                    }`}
                                   onClick={() => openEditDialog(project)}
                                 >
                                  <CardContent className="px-3 py-2">
                                   <div className="flex items-start justify-between gap-2">
                                     <div className="min-w-0 flex-1">
                                       <p className="font-medium text-slate-900 text-sm truncate">{project.title}</p>
                                       <p className="text-xs text-slate-500 truncate">{getProjectClientName(project)}</p>
                                     </div>
                                     <div className="flex items-center gap-1 shrink-0">
                                       <button
                                         className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/60"
                                         title="Edit project details"
                                         onClick={(e) => { e.stopPropagation(); setEditingProject(project); setEditDetailDialogOpen(true); }}
                                       >
                                         <Pencil className="w-3 h-3 text-slate-400" />
                                       </button>
                                       <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                                         ${((project.contract_value || 0) / 1000).toFixed(0)}k
                                       </span>
                                     </div>
                                   </div>
                                   {(() => {
                                      const allocs = project.monthly_revenue_allocations || [];
                                      const totalPct = allocs.reduce((s, a) => s + (Number(a.percentage) || 0), 0);
                                      const isFullyAllocated = totalPct >= 99.9;
                                      const hasAny = allocs.length > 0 && totalPct > 0;
                                      return (
                                        <p className={`text-[10px] mt-0.5 font-medium ${isFullyAllocated ? 'text-emerald-600' : hasAny ? 'text-amber-600' : 'text-red-400'}`}>
                                          {isFullyAllocated ? '● Fully Allocated' : hasAny ? `◐ ${totalPct.toFixed(0)}% Allocated` : '○ Not Allocated'}
                                        </p>
                                      );
                                    })()}
                                    {project.crew_assignment && project.crew_assignment !== 'unassigned' && (
                                      <p className="text-[10px] text-slate-500 mt-0.5">{project.crew_assignment.replace('_', ' ').toUpperCase()}</p>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                        ))}
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
              description="Construction projects are created from the Pre-Construction page. When a sale reaches 'Pending Construction', click Convert to Construction. The project will then appear here."
              actionLabel="Go to Pre-Construction"
              onAction={() => navigate(createPageUrl('Sales'))}
            />
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          <Card>
            <CardContent className="p-6">
              {closedProjects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Contract Value</TableHead>
                      <TableHead>Actual Costs</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Completion Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedProjects.map((project) => (
                      <TableRow 
                        key={project.id} 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => openEditDialog(project)}
                      >
                        <TableCell className="font-medium">{project.title}</TableCell>
                        <TableCell>{getProjectClientName(project)}</TableCell>
                        <TableCell>${((project.contract_value || 0) / 1000).toFixed(0)}k</TableCell>
                        <TableCell>${((project.actual_costs || 0) / 1000).toFixed(0)}k</TableCell>
                        <TableCell>
                          <span className={`font-medium ${(project.actual_margin || 0) >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {(project.actual_margin || 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {project.actual_completion_date ? format(new Date(project.actual_completion_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={(e) => { e.stopPropagation(); setSelectedProject(project); setReopenDialogOpen(true); }}
                          >
                            Reopen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Archive}
                  title="No closed projects"
                  description="Closed projects will appear here once you complete project closeouts"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Construction Forecast */}
      <ConstructionForecast
        projects={filteredProjects}
        clients={clients}
        sales={sales}
        companySettings={companySettings}
        preconSales={sales.filter(s => s.sale_type === 'preconstruction' && !['closed_won', 'closed_lost'].includes(s.status))}
        onProjectClick={(projectId) => {
          const project = projects.find(p => p.id === projectId);
          if (project) openEditDialog(project);
        }}
        onPreconSaleClick={(saleId) => {
          const sale = sales.find(s => s.id === saleId);
          if (sale) { setAllocatingSale(sale); setPreconAllocDialogOpen(true); }
        }}
      />

      {/* Sub Allocation Dialog for active projects */}
      <SubAllocationDialog
        open={subDialogOpen}
        onOpenChange={setSubDialogOpen}
        entity={subDialogProject}
        entityType="project"
        companySettings={companySettings}
      />

      {/* Pre-Con Allocation Dialog */}
      <PreconAllocationDialog
        open={preconAllocDialogOpen}
        onOpenChange={setPreconAllocDialogOpen}
        sale={allocatingSale}
        companySettings={companySettings}
      />

      {/* Edit Project Detail Dialog */}
      <EditProjectDetailDialog
        open={editDetailDialogOpen}
        onOpenChange={setEditDetailDialogOpen}
        project={editingProject}
        clients={clients}
        users={users}
      />

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

            {/* Project Manager — required for mobilization */}
            {getNextStatus(selectedProject?.status) === 'mobilization' && (
              <div>
                <Label className="text-amber-700">Project Manager *</Label>
                <p className="text-xs text-amber-600 mb-2">
                  A project manager must be assigned before moving to Mobilization.
                </p>
                <Select
                  value={projectForm.project_manager_id}
                  onValueChange={(value) => setProjectForm({...projectForm, project_manager_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            {/* Show revenue allocation UI if advancing TO mobilization */}
            {getNextStatus(selectedProject?.status) === 'mobilization' && (
              <div className="border-t pt-4 mt-4">
                <Label className="block mb-2">Revenue Forecast (Optional)</Label>
                <p className="text-xs text-slate-500 mb-3">
                  Start forecasting monthly revenue for this ${(parseFloat(projectForm.actual_costs) || 0).toLocaleString()} project. You can adjust this anytime during construction.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAllocationDialogOpen(!allocationDialogOpen)}
                  className="mb-3"
                >
                  {allocationDialogOpen ? 'Hide' : 'Show'} Revenue Schedule
                </Button>
                
                {allocationDialogOpen && (
                  <>
                    <div className="mb-3">
                     <Label className="text-xs mb-1">Fiscal Year</Label>
                     <div className="flex items-center gap-2">
                       <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                         const newFY = selectedFiscalYear - 1;
                         setSelectedFiscalYear(newFY);
                         const fsm = companySettings?.fiscal_year_start_month || 1;
                         const newMonths = [];
                         for (let i = 0; i < 12; i++) { const month = ((fsm - 1 + i) % 12) + 1; const yr = fsm === 1 ? newFY : (month >= fsm ? newFY - 1 : newFY); newMonths.push({ year: yr, month, percentage: 0 }); }
                         setMonthlyAllocations(prev => { const merged = [...prev]; newMonths.forEach(nm => { if (!merged.find(a => a.year === nm.year && a.month === nm.month)) merged.push(nm); }); return merged; });
                       }}><span className="text-xs">◀</span></Button>
                       <span className="text-sm font-semibold text-center flex-1">{getFiscalYearLabel(selectedFiscalYear, companySettings?.fiscal_year_start_month || 10)}</span>
                       <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                         const newFY = selectedFiscalYear + 1;
                         setSelectedFiscalYear(newFY);
                         const fsm = companySettings?.fiscal_year_start_month || 1;
                         const newMonths = [];
                         for (let i = 0; i < 12; i++) { const month = ((fsm - 1 + i) % 12) + 1; const yr = fsm === 1 ? newFY : (month >= fsm ? newFY - 1 : newFY); newMonths.push({ year: yr, month, percentage: 0 }); }
                         setMonthlyAllocations(prev => { const merged = [...prev]; newMonths.forEach(nm => { if (!merged.find(a => a.year === nm.year && a.month === nm.month)) merged.push(nm); }); return merged; });
                       }}><span className="text-xs">▶</span></Button>
                     </div>
                       </div>

                        <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
                        {monthlyAllocations
                        .filter(alloc => {
                         const fsm = companySettings?.fiscal_year_start_month || 1;
                         if (fsm === 1) return alloc.year === selectedFiscalYear;
                         return (alloc.month >= fsm && alloc.year === selectedFiscalYear - 1) ||
                                (alloc.month < fsm && alloc.year === selectedFiscalYear);
                        })
                        .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year)
                        .map((alloc) => {
                         const monthName = new Date(alloc.year, alloc.month - 1).toLocaleString('default', { month: 'short' });
                         return (
                           <div key={`${alloc.year}-${alloc.month}`}>
                             <label className="text-xs text-slate-600">{monthName} {alloc.year}</label>
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
                        Total (all years): <span className="font-semibold">
                        {monthlyAllocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0).toFixed(1)}%
                        </span> (flexible during construction)
                        </div>
                        </>
                        )}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Project Metrics</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedProject?.title}</p>
            </div>

            {/* Action Buttons */}
            {selectedProject && selectedProject.status !== 'closed' && (
              <div className="grid grid-cols-2 gap-2">
                {getNextStatus(selectedProject.status) && (
                  <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => { setEditDialogOpen(false); setAllocationDialogOpen(false); openAdvanceDialog(selectedProject); }}>
                    <ChevronRight className="w-3 h-3 mr-1" /> Move to Next Phase
                  </Button>
                )}
                {selectedProject.status === 'substantial_completion_closeout' && (
                  <Button type="button" size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditDialogOpen(false); setAllocationDialogOpen(false); openCloseoutDialog(selectedProject); }}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Close Out Project
                  </Button>
                )}
                {selectedProject.sale_id && (
                  <Button type="button" size="sm" variant="outline" className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => { setEditDialogOpen(false); setAllocationDialogOpen(false); setSendBackPhase(''); setSendBackDialogOpen(true); }}>
                    <ChevronLeft className="w-3 h-3 mr-1" /> Send Back to Pre-Con
                  </Button>
                )}
              </div>
            )}

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

            {/* Phase Timeline */}
            {selectedProject && (
              <div className="border-t pt-4 mt-4">
                <Label className="block mb-2">Phase Timeline</Label>
                <EditableTimeline
                  history={selectedProject.status_history?.length > 0
                    ? selectedProject.status_history
                    : [{ status: selectedProject.status, entered_date: selectedProject.created_date }]}
                  onSave={(updated) => updateProjectHistoryMutation.mutate({ projectId: selectedProject.id, status_history: updated })}
                  isSaving={updateProjectHistoryMutation.isPending}
                />
              </div>
            )}

            {/* Show revenue allocation for all active projects */}
            {selectedProject && ['awaiting_to_be_scheduled', 'mobilization', 'active_construction', 'substantial_completion_closeout'].includes(selectedProject.status) && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Revenue Allocation</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAllocationDialogOpen(!allocationDialogOpen)}
                  >
                    {allocationDialogOpen ? 'Hide' : 'Edit'} Schedule
                  </Button>
                </div>
                {(!selectedProject.monthly_revenue_allocations || selectedProject.monthly_revenue_allocations.length === 0) ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                    <p className="text-xs text-amber-800 font-medium">No revenue allocated yet</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Allocate monthly percentages so this project's revenue appears in reports before closeout.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-3">
                    <p className="text-xs text-emerald-800 font-medium">
                      {selectedProject.monthly_revenue_allocations.reduce((sum, a) => sum + (a.percentage || 0), 0).toFixed(1)}% allocated across {selectedProject.monthly_revenue_allocations.filter(a => a.percentage > 0).length} months
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Revenue: ${(((parseFloat(projectForm.actual_costs) || 0) * selectedProject.monthly_revenue_allocations.reduce((sum, a) => sum + (a.percentage || 0), 0) / 100)).toLocaleString(undefined, {maximumFractionDigits: 0})} of ${(parseFloat(projectForm.actual_costs) || 0).toLocaleString()} recognized
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-500 mb-3">
                  Distribute revenue across months for reporting. Update anytime — finalized at closeout.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs text-orange-700 border-orange-300 hover:bg-orange-50 mb-3"
                  onClick={() => { setSubDialogProject(selectedProject); setSubDialogOpen(true); }}
                >
                  Sub/In-House Split
                </Button>
                
                {allocationDialogOpen && (
                  <>
                    <div className="mb-3">
                      <Label className="text-xs mb-1">Fiscal Year</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                          const newFY = selectedFiscalYear - 1;
                          setSelectedFiscalYear(newFY);
                          const fsm = companySettings?.fiscal_year_start_month || 1;
                          const newMonths = [];
                          for (let i = 0; i < 12; i++) { const month = ((fsm - 1 + i) % 12) + 1; const yr = fsm === 1 ? newFY : (month >= fsm ? newFY - 1 : newFY); newMonths.push({ year: yr, month, percentage: 0 }); }
                          setMonthlyAllocations(prev => { const merged = [...prev]; newMonths.forEach(nm => { if (!merged.find(a => a.year === nm.year && a.month === nm.month)) merged.push(nm); }); return merged; });
                        }}><span className="text-xs">◀</span></Button>
                        <span className="text-sm font-semibold text-center flex-1">{getFiscalYearLabel(selectedFiscalYear, companySettings?.fiscal_year_start_month || 10)}</span>
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                          const newFY = selectedFiscalYear + 1;
                          setSelectedFiscalYear(newFY);
                          const fsm = companySettings?.fiscal_year_start_month || 1;
                          const newMonths = [];
                          for (let i = 0; i < 12; i++) { const month = ((fsm - 1 + i) % 12) + 1; const yr = fsm === 1 ? newFY : (month >= fsm ? newFY - 1 : newFY); newMonths.push({ year: yr, month, percentage: 0 }); }
                          setMonthlyAllocations(prev => { const merged = [...prev]; newMonths.forEach(nm => { if (!merged.find(a => a.year === nm.year && a.month === nm.month)) merged.push(nm); }); return merged; });
                        }}><span className="text-xs">▶</span></Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
                      {monthlyAllocations
                        .filter(alloc => {
                          const fsm = companySettings?.fiscal_year_start_month || 1;
                          if (fsm === 1) return alloc.year === selectedFiscalYear;
                          return (alloc.month >= fsm && alloc.year === selectedFiscalYear - 1) ||
                                 (alloc.month < fsm && alloc.year === selectedFiscalYear);
                        })
                        .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year)
                        .map((alloc) => {
                          const monthName = new Date(alloc.year, alloc.month - 1).toLocaleString('default', { month: 'short' });
                          return (
                            <div key={`${alloc.year}-${alloc.month}`}>
                              <label className="text-xs text-slate-600">{monthName} {alloc.year}</label>
                              <input
                                type="number"
                                min="0"
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
                      Total (all years): <span className="font-semibold">
                        {monthlyAllocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0).toFixed(1)}%
                      </span> (flexible until closeout)
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setAllocationDialogOpen(false); }}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {(() => {
            const linkedSale = selectedProject ? sales.find(s => s.id === selectedProject.sale_id) : null;
            const linkedLead = linkedSale ? leads.find(l => l.id === linkedSale.lead_id) : null;
            const linkedClient = selectedProject ? clients.find(c => c.id === selectedProject.client_id) : null;
            const saleTxns = linkedSale ? commissionTransactions.filter(t => t.sale_id === linkedSale.id) : [];
            return (<>
          <DialogHeader>
            <DialogTitle>Close Out Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseoutProject} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedProject?.title}</p>
              <p className="text-xs text-slate-500">{getClientName(selectedProject?.client_id)}</p>
              <p className="text-xs text-amber-600 mt-2">Finalizing this project will remove it from the scheduler and active projects</p>
            </div>

            <AuditItemFixer
              sale={linkedSale}
              project={selectedProject}
              lead={linkedLead}
              client={linkedClient}
              users={users}
              commissionTransactions={saleTxns}
              mode="construction_closeout"
              onAuditStatusChange={setCloseoutAuditPassed}
              onDataUpdated={() => {
                queryClient.invalidateQueries(['projects']);
                queryClient.invalidateQueries(['clients']);
                queryClient.invalidateQueries(['sales']);
                queryClient.invalidateQueries(['leads']);
                queryClient.invalidateQueries(['commission-transactions']);
              }}
            />

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

            {selectedProject && projectForm.actual_costs && projectForm.actual_margin && (() => {
              const actualCosts = parseFloat(projectForm.actual_costs) || 0;
              const variance = Math.abs(((actualCosts - selectedProject.contract_value) / selectedProject.contract_value) * 100);
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

            {/* Margin variance vs estimated margin from linked Sale */}
            {selectedProject && projectForm.actual_margin && (() => {
              const linkedSale = sales.find(s => s.id === selectedProject.sale_id);
              const estimatedMargin = linkedSale?.estimated_margin;
              if (estimatedMargin == null) return null;
              const actualMargin = parseFloat(projectForm.actual_margin) || 0;
              const marginDiff = Math.abs(actualMargin - estimatedMargin);
              if (marginDiff <= 2) return null;
              return (
                <div>
                  <Label className="text-amber-700">Margin Variance Explanation *</Label>
                  <p className="text-xs text-amber-600 mb-2">
                    Actual gross margin ({actualMargin.toFixed(1)}%) differs from estimated margin ({estimatedMargin.toFixed(1)}%) by {marginDiff.toFixed(1)}%. Please explain why.
                  </p>
                  <Input
                    type="text"
                    value={projectForm.margin_variance_explanation}
                    onChange={(e) => setProjectForm({...projectForm, margin_variance_explanation: e.target.value})}
                    placeholder="Explain the difference between estimated and actual gross margin"
                    required
                  />
                </div>
              );
            })()}

            {/* Fiscal Year Selector */}
            <div>
              <Label className="block mb-2">Fiscal Year for Revenue Allocation *</Label>
              <p className="text-xs text-slate-500 mb-2">
                Select which fiscal year this project's revenue should be allocated to
              </p>
              <Select 
                value={selectedFiscalYear?.toString()} 
                onValueChange={(value) => {
                  const newFiscalYear = parseInt(value);
                  setSelectedFiscalYear(newFiscalYear);
                  
                  // Merge new fiscal year months without wiping existing allocations
                  const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
                  const newMonths = [];
                  for (let i = 0; i < 12; i++) {
                    const month = ((fiscalStartMonth - 1 + i) % 12) + 1;
                    const yr = fiscalStartMonth === 1 ? newFiscalYear : (month >= fiscalStartMonth ? newFiscalYear - 1 : newFiscalYear);
                    newMonths.push({ year: yr, month, percentage: 0 });
                  }
                  setMonthlyAllocations(prev => {
                    const merged = [...prev];
                    newMonths.forEach(nm => {
                      if (!merged.find(a => a.year === nm.year && a.month === nm.month)) {
                        merged.push(nm);
                      }
                    });
                    return merged;
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fiscal year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(selectedFiscalYear - 2).toString()}>{getFiscalYearLabel(selectedFiscalYear - 2, companySettings?.fiscal_year_start_month || 10)}</SelectItem>
                  <SelectItem value={(selectedFiscalYear - 1).toString()}>{getFiscalYearLabel(selectedFiscalYear - 1, companySettings?.fiscal_year_start_month || 10)}</SelectItem>
                  <SelectItem value={selectedFiscalYear?.toString()}>{getFiscalYearLabel(selectedFiscalYear, companySettings?.fiscal_year_start_month || 10, true)}</SelectItem>
                  <SelectItem value={(selectedFiscalYear + 1).toString()}>{getFiscalYearLabel(selectedFiscalYear + 1, companySettings?.fiscal_year_start_month || 10)}</SelectItem>
                  <SelectItem value={(selectedFiscalYear + 2).toString()}>{getFiscalYearLabel(selectedFiscalYear + 2, companySettings?.fiscal_year_start_month || 10)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Monthly Revenue Allocation */}
            <div>
              <Label className="block mb-2">Monthly Revenue Allocation *</Label>
              <p className="text-xs text-slate-500 mb-3">
                Distribute the ${(parseFloat(projectForm.actual_costs) || 0).toLocaleString()} gross revenue across months. Must total 100%. Switch fiscal years to allocate across multiple years.
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
                {monthlyAllocations
                  .filter(alloc => {
                    const fsm = companySettings?.fiscal_year_start_month || 1;
                    if (fsm === 1) return alloc.year === selectedFiscalYear;
                    return (alloc.month >= fsm && alloc.year === selectedFiscalYear - 1) ||
                           (alloc.month < fsm && alloc.year === selectedFiscalYear);
                  })
                  .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year)
                  .map((alloc) => {
                    const monthName = new Date(alloc.year, alloc.month - 1).toLocaleString('default', { month: 'short' });
                    return (
                      <div key={`${alloc.year}-${alloc.month}`}>
                        <label className="text-xs text-slate-600">{monthName} {alloc.year}</label>
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
                Total (all years): <span className={`font-semibold ${monthlyAllocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0) === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
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
                   <span>Actual Project Costs:</span>
                   <span className="font-semibold">${(parseFloat(projectForm.actual_costs) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between">
                   <span>Actual Gross Revenue:</span>
                   <span className="font-semibold">${((parseFloat(projectForm.actual_costs) / (1 - (parseFloat(projectForm.actual_margin) / 100))) / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-300 pt-1 mt-1">
                   <span className="font-bold">Gross Profit:</span>
                   <span className="font-bold text-emerald-700">
                     ${(((parseFloat(projectForm.actual_costs) / (1 - (parseFloat(projectForm.actual_margin) / 100))) - parseFloat(projectForm.actual_costs)) / 1000).toFixed(0)}k
                   </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Margin:</span>
                    <span className="font-bold text-emerald-700">{parseFloat(projectForm.actual_margin).toFixed(2)}%</span>
                  </div>
                  {(() => {
                    const actualCosts = parseFloat(projectForm.actual_costs) || 0;
                    const variance = Math.abs(((actualCosts - selectedProject.contract_value) / selectedProject.contract_value) * 100);
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
              <Button type="submit" disabled={updateProjectStatusMutation.isPending || !closeoutAuditPassed} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Close Out Project
              </Button>
              {!closeoutAuditPassed && (
                <p className="text-xs text-red-600 mt-1">Resolve or skip all audit items before closing</p>
              )}
            </div>
          </form>
            </>);
          })()}
        </DialogContent>
      </Dialog>
      {/* Reopen Project Dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedProject?.title}</p>
              <p className="text-xs text-slate-500">{getProjectClientName(selectedProject)}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                This will move the project back to <strong>Substantial Completion & Closeout</strong> and return it to the active board.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setReopenDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                disabled={reopenProjectMutation.isPending}
                onClick={() => reopenProjectMutation.mutate({ project: selectedProject })}
              >
                Reopen Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Back to Pre-Con Dialog */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back to Pre-Construction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{selectedProject?.title}</p>
              <p className="text-xs text-amber-700 mt-1">
                This will delete the construction project and sale, and reopen the pre-construction sale at the selected phase.
              </p>
            </div>

            <div>
              <Label>Send back to which phase?</Label>
              <Select value={sendBackPhase} onValueChange={setSendBackPhase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {preconPhases.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setSendBackDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!sendBackPhase || sendBackToPreconMutation.isPending}
                onClick={() => sendBackToPreconMutation.mutate({ project: selectedProject, targetPhase: sendBackPhase })}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Send Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}