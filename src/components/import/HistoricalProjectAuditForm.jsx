import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HistoricalProjectAuditForm({ preselectedLeadId }) {
    const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId || null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const queryClient = useQueryClient();

    // Update selected lead when preselected changes
    useEffect(() => {
        if (preselectedLeadId) {
            setSelectedLeadId(preselectedLeadId);
        }
    }, [preselectedLeadId]);

    // Fetch all leads
    const { data: leads = [], isLoading: leadsLoading } = useQuery({
        queryKey: ['leads'],
        queryFn: () => base44.entities.Lead.list()
    });

    // Fetch all clients
    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: () => base44.entities.Client.list()
    });

    // Fetch all sales
    const { data: sales = [] } = useQuery({
        queryKey: ['sales'],
        queryFn: () => base44.entities.Sale.list()
    });

    // Fetch all projects
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => base44.entities.Project.list()
    });

    // Fetch commission transactions
    const { data: commissionTransactions = [] } = useQuery({
        queryKey: ['commissionTransactions'],
        queryFn: () => base44.entities.CommissionTransaction.list()
    });

    // Fetch users for dropdowns
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list()
    });

    // Filter sales users
    const salesUsers = users.filter(user => 
        user.department === 'Sales' || 
        user.departments?.includes('Sales') || 
        user.departments?.includes('sales')
    );

    const [leadStatusHistory, setLeadStatusHistory] = useState([]);
    const [saleStatusHistory, setSaleStatusHistory] = useState([]);
    const [projectStatusHistory, setProjectStatusHistory] = useState([]);
    const [relatedCommissions, setRelatedCommissions] = useState([]);

    const { register, handleSubmit, setValue, reset, watch } = useForm();

    // When a lead is selected, auto-fill all related data
    useEffect(() => {
        if (!selectedLeadId) return;

        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return;

        const client = clients.find(c => c.id === lead.client_id);
        const sale = sales.find(s => s.lead_id === lead.id);
        const project = sale ? projects.find(p => p.sale_id === sale.id) : null;

        // Find related commission transactions
        const saleCommissions = sale ? commissionTransactions.filter(t => t.sale_id === sale.id) : [];
        setRelatedCommissions(saleCommissions);

        // Client data
        if (client) {
            setValue('client_company_name', client.company_name || '');
            setValue('client_contact_name', client.contact_name || '');
            setValue('client_email', client.email || '');
            setValue('client_phone', client.phone || '');
            setValue('client_address', client.address || '');
            setValue('client_notes', client.notes || '');
        } else {
            setValue('client_company_name', '');
            setValue('client_contact_name', '');
            setValue('client_email', '');
            setValue('client_phone', '');
            setValue('client_address', '');
            setValue('client_notes', '');
        }

        // Lead data
        setValue('lead_title', lead.title || '');
        setValue('lead_source', lead.source || 'referral');
        setValue('lead_score', lead.lead_score || 50);
        setValue('estimated_precon_value', lead.estimated_precon_value || '');
        setValue('estimated_construction_value', lead.estimated_construction_value || '');
        setValue('lead_assigned_to', lead.assigned_to || '');
        setValue('lead_notes', lead.notes || '');
        
        // Set lead status history with all default phases if empty
        const leadHistory = lead.status_history && lead.status_history.length > 0 
            ? lead.status_history 
            : [
                { status: 'new_project_lead', entered_date: '' },
                { status: 'initial_video_consult', entered_date: '' },
                { status: 'initial_inperson_consultation', entered_date: '' },
                { status: 'preconstruction_proposal', entered_date: '' },
                { status: 'converted', entered_date: '' }
            ];
        setLeadStatusHistory(leadHistory);

        // Sale data
        if (sale) {
            setValue('sale_type', sale.sale_type || 'construction');
            setValue('sale_title', sale.title || '');
            setValue('contract_value', sale.contract_value || '');
            setValue('estimated_margin', sale.estimated_margin || '');
            setValue('close_date', sale.close_date || '');
            setValue('sale_assigned_to', sale.assigned_to || '');
            setValue('sale_notes', sale.notes || '');
            
            // Set sale status history with all default phases if empty
            const saleHistory = sale.phase_history && sale.phase_history.length > 0 
                ? sale.phase_history 
                : [
                    { status: 'feasibility', entered_date: '' },
                    { status: 'design_material_selections', entered_date: '' },
                    { status: 'engineering_permits', entered_date: '' },
                    { status: 'pending_construction_sale', entered_date: '' },
                    { status: 'closed_won', entered_date: '' }
                ];
            setSaleStatusHistory(saleHistory);
        } else {
            setSaleStatusHistory([
                { status: 'feasibility', entered_date: '' },
                { status: 'design_material_selections', entered_date: '' },
                { status: 'engineering_permits', entered_date: '' },
                { status: 'pending_construction_sale', entered_date: '' },
                { status: 'closed_won', entered_date: '' }
            ]);
        }

        // Project data
        if (project) {
            setValue('project_type', project.project_type || 'construction');
            setValue('project_title', project.title || '');
            setValue('actual_costs', project.actual_costs || '');
            setValue('actual_margin', project.actual_margin || '');
            setValue('start_date', project.start_date || '');
            setValue('actual_completion_date', project.actual_completion_date || '');
            setValue('project_manager', project.project_manager_id || '');
            setValue('crew_assignment', project.crew_assignment || 'crew_a');
            setValue('color', project.color || '#3B82F6');
            setValue('project_notes', project.notes || '');
            
            // Set project status history with all default phases if empty
            const projectHistory = project.phases && project.phases.length > 0 
                ? project.phases 
                : [
                    { status: 'awaiting_to_be_scheduled', entered_date: '' },
                    { status: 'mobilization', entered_date: '' },
                    { status: 'active_construction', entered_date: '' },
                    { status: 'substantial_completion_closeout', entered_date: '' }
                ];
            setProjectStatusHistory(projectHistory);
        } else {
            setProjectStatusHistory([
                { status: 'awaiting_to_be_scheduled', entered_date: '' },
                { status: 'mobilization', entered_date: '' },
                { status: 'active_construction', entered_date: '' },
                { status: 'substantial_completion_closeout', entered_date: '' }
            ]);
        }
    }, [selectedLeadId, leads, clients, sales, projects, commissionTransactions, setValue]);

    const updateLeadMutation = useMutation({
        mutationFn: (data) => base44.entities.Lead.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['leads'])
    });

    const updateClientMutation = useMutation({
        mutationFn: (data) => base44.entities.Client.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['clients'])
    });

    const updateSaleMutation = useMutation({
        mutationFn: (data) => base44.entities.Sale.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['sales'])
    });

    const updateProjectMutation = useMutation({
        mutationFn: (data) => base44.entities.Project.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['projects'])
    });

    const updateCommissionMutation = useMutation({
        mutationFn: (data) => base44.entities.CommissionTransaction.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['commissionTransactions'])
    });

    const addLeadStatus = () => {
        setLeadStatusHistory([...leadStatusHistory, { status: 'initial_video_consult', entered_date: '' }]);
    };

    const removeLeadStatus = (index) => {
        setLeadStatusHistory(leadStatusHistory.filter((_, i) => i !== index));
    };

    const addSaleStatus = () => {
        setSaleStatusHistory([...saleStatusHistory, { status: 'design_material_selections', entered_date: '' }]);
    };

    const removeSaleStatus = (index) => {
        setSaleStatusHistory(saleStatusHistory.filter((_, i) => i !== index));
    };

    const addProjectStatus = () => {
        setProjectStatusHistory([...projectStatusHistory, { status: 'awaiting_to_be_scheduled', entered_date: '' }]);
    };

    const removeProjectStatus = (index) => {
        setProjectStatusHistory(projectStatusHistory.filter((_, i) => i !== index));
    };

    const onSubmit = async (data) => {
        if (!selectedLeadId) {
            toast.error('Please select a lead to audit');
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            const lead = leads.find(l => l.id === selectedLeadId);
            const client = clients.find(c => c.id === lead?.client_id);
            const sale = sales.find(s => s.lead_id === lead?.id);
            const project = sale ? projects.find(p => p.sale_id === sale.id) : null;

            // Update client
            if (client) {
                await updateClientMutation.mutateAsync({
                    id: client.id,
                    company_name: data.client_company_name,
                    contact_name: data.client_contact_name,
                    email: data.client_email,
                    phone: data.client_phone,
                    address: data.client_address,
                    notes: data.client_notes
                });
            }

            // Update lead
            await updateLeadMutation.mutateAsync({
                id: selectedLeadId,
                title: data.lead_title,
                source: data.lead_source,
                lead_score: data.lead_score ? parseFloat(data.lead_score) : 50,
                status_history: leadStatusHistory.filter(h => h.entered_date),
                estimated_precon_value: data.estimated_precon_value ? parseFloat(data.estimated_precon_value) : undefined,
                estimated_construction_value: data.estimated_construction_value ? parseFloat(data.estimated_construction_value) : undefined,
                assigned_to: data.lead_assigned_to,
                notes: data.lead_notes
            });

            // Update sale
            if (sale) {
                await updateSaleMutation.mutateAsync({
                    id: sale.id,
                    sale_type: data.sale_type,
                    title: data.sale_title,
                    phase_history: saleStatusHistory.filter(h => h.entered_date),
                    contract_value: data.contract_value ? parseFloat(data.contract_value) : sale.contract_value,
                    estimated_margin: data.estimated_margin ? parseFloat(data.estimated_margin) : undefined,
                    close_date: data.close_date || sale.close_date,
                    assigned_to: data.sale_assigned_to || sale.assigned_to,
                    notes: data.sale_notes
                });
            }

            // Update project
            if (project) {
                await updateProjectMutation.mutateAsync({
                    id: project.id,
                    project_type: data.project_type || project.project_type,
                    title: data.project_title || project.title,
                    contract_value: data.contract_value ? parseFloat(data.contract_value) : project.contract_value,
                    actual_costs: data.actual_costs ? parseFloat(data.actual_costs) : project.actual_costs,
                    actual_margin: data.actual_margin ? parseFloat(data.actual_margin) : project.actual_margin,
                    start_date: data.start_date || project.start_date,
                    actual_completion_date: data.actual_completion_date || project.actual_completion_date,
                    project_manager_id: data.project_manager || project.project_manager_id,
                    crew_assignment: data.crew_assignment || project.crew_assignment,
                    color: data.color || project.color,
                    notes: data.project_notes
                });
            }

            // Update commission transactions
            for (const commission of relatedCommissions) {
                await updateCommissionMutation.mutateAsync({
                    id: commission.id,
                    user_id: commission.user_id,
                    amount: commission.amount,
                    commission_rate: commission.commission_rate,
                    sale_amount: commission.sale_amount,
                    status: commission.status,
                    notes: commission.notes
                });
            }

            setResult({ success: true });
            toast.success('Historical data updated successfully!');
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
            setResult({ success: false, error: errorMessage });
            toast.error('Failed to update data: ' + errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Lead Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Lead to Audit</CardTitle>
                    <CardDescription>Choose a lead to review and edit its associated data</CardDescription>
                </CardHeader>
                <CardContent>
                    <Label>Lead</Label>
                    <Select value={selectedLeadId || undefined} onValueChange={setSelectedLeadId} disabled={leadsLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder={leadsLoading ? "Loading leads..." : "Select a lead"} />
                        </SelectTrigger>
                        <SelectContent>
                            {leads.map(lead => (
                                <SelectItem key={lead.id} value={lead.id}>
                                    {lead.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedLeadId && (
                <>
                    {/* Client Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                            <CardDescription>Review and edit client details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Company Name</Label>
                                    <Input {...register('client_company_name')} placeholder="Client Company Name" />
                                </div>
                                <div>
                                    <Label>Contact Name *</Label>
                                    <Input {...register('client_contact_name')} placeholder="Contact Person" required />
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input {...register('client_email')} type="email" placeholder="client@example.com" />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input {...register('client_phone')} placeholder="123-456-7890" />
                                </div>
                            </div>
                            <div>
                                <Label>Address</Label>
                                <Input {...register('client_address')} placeholder="123 Main St, City, State" />
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea {...register('client_notes')} placeholder="Any client-specific notes" rows={2} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lead Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Lead Information</CardTitle>
                            <CardDescription>Review and edit lead details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Lead Title *</Label>
                                    <Input {...register('lead_title')} placeholder="e.g., Basement Renovation" required />
                                </div>
                                <div>
                                    <Label>Source</Label>
                                    <Select value={watch('lead_source')} onValueChange={(value) => setValue('lead_source', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="referral">Referral</SelectItem>
                                            <SelectItem value="website">Website</SelectItem>
                                            <SelectItem value="cold_call">Cold Call</SelectItem>
                                            <SelectItem value="networking">Networking</SelectItem>
                                            <SelectItem value="advertisement">Advertisement</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Estimated Precon Value</Label>
                                    <Input {...register('estimated_precon_value')} type="number" placeholder="5000" />
                                </div>
                                <div>
                                    <Label>Estimated Construction Value</Label>
                                    <Input {...register('estimated_construction_value')} type="number" placeholder="150000" />
                                </div>
                                <div>
                                    <Label>Lead Score (0-100)</Label>
                                    <Input {...register('lead_score')} type="number" min="0" max="100" placeholder="50" />
                                </div>
                                <div>
                                    <Label>Assigned To</Label>
                                    <Select value={watch('lead_assigned_to')} onValueChange={(value) => setValue('lead_assigned_to', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select salesperson" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salesUsers.map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.full_name} ({user.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Lead Notes</Label>
                                <Textarea {...register('lead_notes')} placeholder="Any lead-specific notes" rows={2} />
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Lead Status History</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addLeadStatus}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Status
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {leadStatusHistory.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Select 
                                                value={item.status}
                                                onValueChange={(value) => {
                                                    const updated = [...leadStatusHistory];
                                                    updated[index].status = value;
                                                    setLeadStatusHistory(updated);
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="new_project_lead">New Project Lead</SelectItem>
                                                    <SelectItem value="initial_video_consult">Initial Video Consult</SelectItem>
                                                    <SelectItem value="initial_inperson_consultation">Initial In-Person Consultation</SelectItem>
                                                    <SelectItem value="preconstruction_proposal">Preconstruction Proposal</SelectItem>
                                                    <SelectItem value="followup">Follow-up</SelectItem>
                                                    <SelectItem value="converted">Converted</SelectItem>
                                                    <SelectItem value="disqualified">Disqualified</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input 
                                                type="datetime-local"
                                                value={item.entered_date}
                                                onChange={(e) => {
                                                    const updated = [...leadStatusHistory];
                                                    updated[index].entered_date = e.target.value;
                                                    setLeadStatusHistory(updated);
                                                }}
                                                className="flex-1"
                                            />
                                            {leadStatusHistory.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLeadStatus(index)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sale Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Sale Information</CardTitle>
                            <CardDescription>Review and edit sale details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Sale Type *</Label>
                                    <Select value={watch('sale_type')} onValueChange={(value) => setValue('sale_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="preconstruction">Preconstruction</SelectItem>
                                            <SelectItem value="construction">Construction</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Sale Title *</Label>
                                    <Input {...register('sale_title')} placeholder="e.g., Construction Project - Basement Renovation" required />
                                </div>
                                <div>
                                    <Label>Contract Value *</Label>
                                    <Input {...register('contract_value')} type="number" placeholder="150000" required />
                                </div>
                                <div>
                                    <Label>Estimated Margin (%)</Label>
                                    <Input {...register('estimated_margin')} type="number" step="0.01" placeholder="45.00" />
                                </div>
                                <div>
                                    <Label>Close Date *</Label>
                                    <Input {...register('close_date')} type="date" required />
                                </div>
                                <div>
                                    <Label>Assigned To</Label>
                                    <Select value={watch('sale_assigned_to')} onValueChange={(value) => setValue('sale_assigned_to', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select salesperson" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salesUsers.map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.full_name} ({user.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Sale Notes</Label>
                                <Textarea {...register('sale_notes')} placeholder="Any sale-specific notes" rows={2} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Sale Status History</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addSaleStatus}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Status
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {saleStatusHistory.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Select 
                                                value={item.status}
                                                onValueChange={(value) => {
                                                    const updated = [...saleStatusHistory];
                                                    updated[index].status = value;
                                                    setSaleStatusHistory(updated);
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="feasibility">Feasibility</SelectItem>
                                                    <SelectItem value="design_material_selections">Design & Material Selections</SelectItem>
                                                    <SelectItem value="engineering_permits">Engineering & Permits</SelectItem>
                                                    <SelectItem value="pending_construction_sale">Pending Construction Sale</SelectItem>
                                                    <SelectItem value="closed_won">Closed Won</SelectItem>
                                                    <SelectItem value="closed_lost">Closed Lost</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input 
                                                type="datetime-local"
                                                value={item.entered_date}
                                                onChange={(e) => {
                                                    const updated = [...saleStatusHistory];
                                                    updated[index].entered_date = e.target.value;
                                                    setSaleStatusHistory(updated);
                                                }}
                                                className="flex-1"
                                            />
                                            {saleStatusHistory.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSaleStatus(index)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Information</CardTitle>
                            <CardDescription>Review and edit project details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Project Type *</Label>
                                    <Select value={watch('project_type')} onValueChange={(value) => setValue('project_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="preconstruction">Preconstruction</SelectItem>
                                            <SelectItem value="construction">Construction</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Project Title *</Label>
                                    <Input {...register('project_title')} placeholder="e.g., Main Project - Basement Renovation" required />
                                </div>
                                <div>
                                    <Label>Actual Costs *</Label>
                                    <Input {...register('actual_costs')} type="number" placeholder="130000" required />
                                </div>
                                <div>
                                    <Label>Actual Margin (%) *</Label>
                                    <Input {...register('actual_margin')} type="number" step="0.01" placeholder="45.00" required />
                                </div>
                                <div>
                                    <Label>Start Date *</Label>
                                    <Input {...register('start_date')} type="date" required />
                                </div>
                                <div>
                                    <Label>Completion Date *</Label>
                                    <Input {...register('actual_completion_date')} type="date" required />
                                </div>
                                <div>
                                    <Label>Project Manager</Label>
                                    <Select value={watch('project_manager')} onValueChange={(value) => setValue('project_manager', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select project manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.full_name} ({user.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Crew Assignment</Label>
                                    <Select value={watch('crew_assignment')} onValueChange={(value) => setValue('crew_assignment', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="crew_a">Crew A</SelectItem>
                                            <SelectItem value="crew_b">Crew B</SelectItem>
                                            <SelectItem value="crew_c">Crew C</SelectItem>
                                            <SelectItem value="crew_d">Crew D</SelectItem>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Project Color</Label>
                                    <Input {...register('color')} type="color" />
                                </div>
                            </div>
                            <div>
                                <Label>Project Notes</Label>
                                <Textarea {...register('project_notes')} placeholder="Any project-specific notes" rows={2} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Project Status History</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addProjectStatus}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Status
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {projectStatusHistory.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Select 
                                                value={item.status}
                                                onValueChange={(value) => {
                                                    const updated = [...projectStatusHistory];
                                                    updated[index].status = value;
                                                    setProjectStatusHistory(updated);
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="awaiting_to_be_scheduled">Awaiting to be Scheduled</SelectItem>
                                                    <SelectItem value="mobilization">Mobilization</SelectItem>
                                                    <SelectItem value="active_construction">Active Construction</SelectItem>
                                                    <SelectItem value="substantial_completion_closeout">Substantial Completion/Closeout</SelectItem>
                                                    <SelectItem value="closed">Closed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input 
                                                type="datetime-local"
                                                value={item.entered_date}
                                                onChange={(e) => {
                                                    const updated = [...projectStatusHistory];
                                                    updated[index].entered_date = e.target.value;
                                                    setProjectStatusHistory(updated);
                                                }}
                                                className="flex-1"
                                            />
                                            {projectStatusHistory.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeProjectStatus(index)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Commission Records */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Commission Records</CardTitle>
                            <CardDescription>Edit commission transactions for this project</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {relatedCommissions.length > 0 ? (
                                <div className="space-y-4">
                                    {relatedCommissions.map((commission, index) => (
                                        <div key={commission.id} className="p-4 border rounded-lg space-y-3">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{commission.sale_type === 'preconstruction' ? 'Preconstruction' : 'Construction'} Commission</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Assigned To</Label>
                                                    <Select 
                                                        value={commission.user_id}
                                                        onValueChange={(value) => {
                                                            const updated = [...relatedCommissions];
                                                            updated[index].user_id = value;
                                                            setRelatedCommissions(updated);
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {salesUsers.map(user => (
                                                                <SelectItem key={user.id} value={user.id}>
                                                                    {user.full_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Status</Label>
                                                    <Select 
                                                        value={commission.status}
                                                        onValueChange={(value) => {
                                                            const updated = [...relatedCommissions];
                                                            updated[index].status = value;
                                                            setRelatedCommissions(updated);
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="pending">Pending</SelectItem>
                                                            <SelectItem value="banked">Banked</SelectItem>
                                                            <SelectItem value="available">Available</SelectItem>
                                                            <SelectItem value="paid">Paid</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Commission Amount ($)</Label>
                                                    <Input 
                                                        type="number"
                                                        step="0.01"
                                                        value={commission.amount || ''}
                                                        onChange={(e) => {
                                                            const updated = [...relatedCommissions];
                                                            updated[index].amount = parseFloat(e.target.value);
                                                            setRelatedCommissions(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Commission Rate (%)</Label>
                                                    <Input 
                                                        type="number"
                                                        step="0.01"
                                                        value={commission.commission_rate || ''}
                                                        onChange={(e) => {
                                                            const updated = [...relatedCommissions];
                                                            updated[index].commission_rate = parseFloat(e.target.value);
                                                            setRelatedCommissions(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Sale Amount ($)</Label>
                                                    <Input 
                                                        type="number"
                                                        step="0.01"
                                                        value={commission.sale_amount || ''}
                                                        onChange={(e) => {
                                                            const updated = [...relatedCommissions];
                                                            updated[index].sale_amount = parseFloat(e.target.value);
                                                            setRelatedCommissions(updated);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Notes</Label>
                                                <Textarea 
                                                    value={commission.notes || ''}
                                                    onChange={(e) => {
                                                        const updated = [...relatedCommissions];
                                                        updated[index].notes = e.target.value;
                                                        setRelatedCommissions(updated);
                                                    }}
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-4">No commission records found for this project</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => {
                            setSelectedLeadId(null);
                            reset();
                            setLeadStatusHistory([]);
                            setSaleStatusHistory([]);
                            setProjectStatusHistory([]);
                        }}>
                            Clear Selection
                        </Button>
                        <Button type="submit" disabled={submitting} className="min-w-32">
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Data'
                            )}
                        </Button>
                    </div>

                    {/* Result Display */}
                    {result && (
                        <Alert variant={result.success ? 'default' : 'destructive'}>
                            <div className="flex items-start gap-2">
                                {result.success ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 mt-0.5" />
                                )}
                                <div>
                                    <p className="font-semibold">
                                        {result.success ? 'Update Successful' : 'Update Failed'}
                                    </p>
                                    {result.error && <p className="text-sm mt-1">{result.error}</p>}
                                </div>
                            </div>
                        </Alert>
                    )}
                </>
            )}
        </form>
    );
}