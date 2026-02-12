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

    const [unifiedTimeline, setUnifiedTimeline] = useState([]);
    const [relatedCommissions, setRelatedCommissions] = useState([]);

    const { register, handleSubmit, setValue, reset, watch } = useForm();

    // Convert ISO date string to datetime-local input format (YYYY-MM-DDTHH:mm)
    const toDatetimeLocal = (dateStr) => {
        if (!dateStr) return '';
        // Already in datetime-local format
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) return dateStr;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

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

        // Sale data
        if (sale) {
            setValue('sale_type', sale.sale_type || 'construction');
            setValue('sale_title', sale.title || '');
            setValue('contract_value', sale.contract_value || '');
            setValue('estimated_margin', sale.estimated_margin || '');
            setValue('close_date', sale.close_date || '');
            setValue('sale_assigned_to', sale.assigned_to || '');
            setValue('sale_notes', sale.notes || '');
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
        }

        // Build unified timeline from all sources
        // Priority: project.status_history is the master (it carries lead+sale+project entries)
        // Fall back to assembling from individual entities
        let timeline = [];

        if (project && project.status_history && project.status_history.length > 0) {
            // Project's status_history is the master timeline
            timeline = project.status_history.map(h => ({
                ...h,
                source: h.source || 'project',
                entered_date: toDatetimeLocal(h.entered_date)
            }));
        } else {
            // Assemble from individual entities
            const leadEntries = (lead.status_history || []).map(h => ({
                ...h,
                source: h.source || 'lead',
                entered_date: toDatetimeLocal(h.entered_date)
            }));
            const saleEntries = sale ? (sale.phase_history || []).map(h => ({
                ...h,
                source: h.source || 'sale',
                entered_date: toDatetimeLocal(h.entered_date)
            })) : [];
            timeline = [...leadEntries, ...saleEntries];
        }

        // If timeline is empty, create default scaffold
        if (timeline.length === 0) {
            timeline = [
                { status: 'new_project_lead', entered_date: '', source: 'lead' },
                { status: 'initial_video_consult', entered_date: '', source: 'lead' },
                { status: 'initial_inperson_consultation', entered_date: '', source: 'lead' },
                { status: 'preconstruction_proposal', entered_date: '', source: 'lead' },
                { status: 'converted', entered_date: '', source: 'lead' },
                { status: 'feasibility', entered_date: '', source: 'sale' },
                { status: 'design_material_selections', entered_date: '', source: 'sale' },
                { status: 'engineering_permits', entered_date: '', source: 'sale' },
                { status: 'pending_construction_sale', entered_date: '', source: 'sale' },
                { status: 'closed_won', entered_date: '', source: 'sale' },
                { status: 'awaiting_to_be_scheduled', entered_date: '', source: 'project' },
                { status: 'mobilization', entered_date: '', source: 'project' },
                { status: 'active_construction', entered_date: '', source: 'project' },
                { status: 'substantial_completion_closeout', entered_date: '', source: 'project' },
            ];
        }

        setUnifiedTimeline(timeline);
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

    const allStatuses = [
        { value: 'new_project_lead', label: 'New Project Lead', source: 'lead' },
        { value: 'initial_video_consult', label: 'Video Consult', source: 'lead' },
        { value: 'initial_inperson_consultation', label: 'In-Person Consult', source: 'lead' },
        { value: 'preconstruction_proposal', label: 'Proposal', source: 'lead' },
        { value: 'followup', label: 'Follow-up', source: 'lead' },
        { value: 'converted', label: 'Converted', source: 'lead' },
        { value: 'disqualified', label: 'Disqualified', source: 'lead' },
        { value: 'feasibility', label: 'Feasibility', source: 'sale' },
        { value: 'design_material_selections', label: 'Design & Materials', source: 'sale' },
        { value: 'engineering_permits', label: 'Engineering & Permits', source: 'sale' },
        { value: 'pending_construction_sale', label: 'Pending Construction', source: 'sale' },
        { value: 'closed_won', label: 'Closed Won', source: 'sale' },
        { value: 'closed_lost', label: 'Closed Lost', source: 'sale' },
        { value: 'awaiting_to_be_scheduled', label: 'Awaiting to be Scheduled', source: 'project' },
        { value: 'mobilization', label: 'Mobilization', source: 'project' },
        { value: 'active_construction', label: 'Active Construction', source: 'project' },
        { value: 'substantial_completion_closeout', label: 'Substantial Completion/Closeout', source: 'project' },
        { value: 'closed', label: 'Closed', source: 'project' },
    ];

    const getSourceForStatus = (statusValue) => {
        const found = allStatuses.find(s => s.value === statusValue);
        return found ? found.source : 'project';
    };

    const sourceColors = {
        lead: 'bg-blue-50 border-blue-200',
        sale: 'bg-purple-50 border-purple-200',
        project: 'bg-green-50 border-green-200',
    };

    const sourceLabels = {
        lead: { text: 'Lead', badge: 'bg-blue-100 text-blue-700' },
        sale: { text: 'Pre-Con', badge: 'bg-purple-100 text-purple-700' },
        project: { text: 'Construction', badge: 'bg-green-100 text-green-700' },
    };

    const addTimelineEntry = () => {
        setUnifiedTimeline([...unifiedTimeline, { status: 'new_project_lead', entered_date: '', source: 'lead' }]);
    };

    const removeTimelineEntry = (index) => {
        if (unifiedTimeline.length <= 1) return;
        setUnifiedTimeline(unifiedTimeline.filter((_, i) => i !== index));
    };

    const onSubmit = async (data) => {
        if (!selectedLeadId) {
            toast.error('Please select a lead to audit');
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            console.log('Starting update process...');
            const lead = leads.find(l => l.id === selectedLeadId);
            const client = clients.find(c => c.id === lead?.client_id);
            const sale = sales.find(s => s.lead_id === lead?.id);
            const project = sale ? projects.find(p => p.sale_id === sale.id) : null;

            // Update client
            if (client) {
                console.log('Updating client...');
                try {
                    await updateClientMutation.mutateAsync({
                        id: client.id,
                        company_name: data.client_company_name,
                        contact_name: data.client_contact_name,
                        email: data.client_email,
                        phone: data.client_phone,
                        address: data.client_address,
                        notes: data.client_notes
                    });
                    console.log('Client updated successfully');
                } catch (err) {
                    console.error('Client update failed:', err);
                    throw new Error(`Client update failed: ${err.message}`);
                }
            }

            // Distribute unified timeline back to individual entities
            const filledTimeline = unifiedTimeline.filter(h => h.entered_date);
            const leadEntries = filledTimeline.filter(h => h.source === 'lead');
            const saleEntries = filledTimeline.filter(h => h.source === 'sale');
            const projectEntries = filledTimeline.filter(h => h.source === 'project');

            // Update lead
            console.log('Updating lead...');
            try {
                await updateLeadMutation.mutateAsync({
                    id: selectedLeadId,
                    title: data.lead_title,
                    source: data.lead_source,
                    lead_score: data.lead_score ? parseFloat(data.lead_score) : 50,
                    status_history: leadEntries,
                    estimated_precon_value: data.estimated_precon_value ? parseFloat(data.estimated_precon_value) : undefined,
                    estimated_construction_value: data.estimated_construction_value ? parseFloat(data.estimated_construction_value) : undefined,
                    assigned_to: data.lead_assigned_to,
                    notes: data.lead_notes
                });
                console.log('Lead updated successfully');
            } catch (err) {
                console.error('Lead update failed:', err);
                throw new Error(`Lead update failed: ${err.message}`);
            }

            // Update sale
            if (sale) {
                console.log('Updating sale...');
                try {
                    await updateSaleMutation.mutateAsync({
                        id: sale.id,
                        sale_type: data.sale_type,
                        title: data.sale_title,
                        phase_history: saleEntries,
                        contract_value: data.contract_value ? parseFloat(data.contract_value) : sale.contract_value,
                        estimated_margin: data.estimated_margin ? parseFloat(data.estimated_margin) : undefined,
                        close_date: data.close_date || sale.close_date,
                        assigned_to: data.sale_assigned_to || sale.assigned_to,
                        notes: data.sale_notes
                    });
                    console.log('Sale updated successfully');
                } catch (err) {
                    console.error('Sale update failed:', err);
                    throw new Error(`Sale update failed: ${err.message}`);
                }
            }

            // Update project — the full unified timeline becomes the master status_history
            if (project) {
                console.log('Updating project...');
                try {
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
                        status_history: filledTimeline,
                        notes: data.project_notes
                    });
                    console.log('Project updated successfully');
                } catch (err) {
                    console.error('Project update failed:', err);
                    throw new Error(`Project update failed: ${err.message}`);
                }
            }

            // Update commission transactions
            if (relatedCommissions.length > 0) {
                console.log(`Processing ${relatedCommissions.length} commission transactions...`);
                for (const commission of relatedCommissions) {
                    try {
                        if (commission.isNew) {
                            // Create new commission
                            await base44.entities.CommissionTransaction.create({
                                user_id: commission.user_id,
                                sale_id: sale.id,
                                sale_type: commission.sale_type,
                                project_id: project?.id || '',
                                transaction_type: 'sale_commission',
                                amount: parseFloat(commission.amount) || 0,
                                commission_rate: parseFloat(commission.commission_rate) || 0,
                                sale_amount: parseFloat(commission.sale_amount) || 0,
                                status: commission.status,
                                notes: commission.notes || ''
                            });
                        } else {
                            // Update existing commission
                            await updateCommissionMutation.mutateAsync({
                                id: commission.id,
                                user_id: commission.user_id,
                                amount: parseFloat(commission.amount) || 0,
                                commission_rate: parseFloat(commission.commission_rate) || 0,
                                sale_amount: parseFloat(commission.sale_amount) || 0,
                                status: commission.status,
                                notes: commission.notes
                            });
                        }
                    } catch (err) {
                        console.error('Commission save failed:', err);
                        throw new Error(`Commission save failed: ${err.message}`);
                    }
                }
                console.log('All commissions processed successfully');
            }

            setResult({ success: true });
            toast.success('Historical data updated successfully!');
        } catch (error) {
            console.error('Update error:', error);
            let errorMessage = 'Unknown error occurred';

            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            // If we have validation errors, show them
            if (error.response?.data?.details) {
                errorMessage += ': ' + JSON.stringify(error.response.data.details);
            }

            setResult({ success: false, error: errorMessage });
            toast.error('Update failed: ' + errorMessage);
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
                        </CardContent>
                    </Card>

                    {/* Unified Timeline */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Complete Project Timeline</CardTitle>
                                    <CardDescription>
                                        The full history from lead through construction. Each entry is tagged with its phase (Lead, Pre-Con, Construction). 
                                        On save, this timeline is written back to the project as the master record, and also synced to the individual lead and sale histories.
                                    </CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addTimelineEntry}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Entry
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {unifiedTimeline.map((item, index) => {
                                    const src = item.source || getSourceForStatus(item.status);
                                    const srcStyle = sourceLabels[src] || sourceLabels.project;
                                    const borderStyle = sourceColors[src] || sourceColors.project;
                                    return (
                                        <div key={index} className={`flex gap-2 items-center p-2 rounded-lg border ${borderStyle}`}>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${srcStyle.badge}`}>
                                                {srcStyle.text}
                                            </span>
                                            <Select 
                                                value={item.status}
                                                onValueChange={(value) => {
                                                    const updated = [...unifiedTimeline];
                                                    updated[index].status = value;
                                                    updated[index].source = getSourceForStatus(value);
                                                    setUnifiedTimeline(updated);
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem disabled value="__lead_header" className="font-bold text-blue-700">— Lead Phases —</SelectItem>
                                                    {allStatuses.filter(s => s.source === 'lead').map(s => (
                                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                    ))}
                                                    <SelectItem disabled value="__sale_header" className="font-bold text-purple-700">— Pre-Con Phases —</SelectItem>
                                                    {allStatuses.filter(s => s.source === 'sale').map(s => (
                                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                    ))}
                                                    <SelectItem disabled value="__project_header" className="font-bold text-green-700">— Construction Phases —</SelectItem>
                                                    {allStatuses.filter(s => s.source === 'project').map(s => (
                                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input 
                                                type="datetime-local"
                                                value={item.entered_date}
                                                onChange={(e) => {
                                                    const updated = [...unifiedTimeline];
                                                    updated[index].entered_date = e.target.value;
                                                    setUnifiedTimeline(updated);
                                                }}
                                                className="flex-1"
                                            />
                                            {unifiedTimeline.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeTimelineEntry(index)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Commission Records */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Commission Records</CardTitle>
                                    <CardDescription>Edit commission transactions for this project</CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                    setRelatedCommissions([...relatedCommissions, {
                                        id: `new_${Date.now()}`,
                                        user_id: '',
                                        sale_type: 'construction',
                                        amount: 0,
                                        commission_rate: 0,
                                        sale_amount: 0,
                                        status: 'pending',
                                        notes: '',
                                        isNew: true
                                    }]);
                                }}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Commission
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {relatedCommissions.length > 0 ? (
                                <div className="space-y-4">
                                    {relatedCommissions.map((commission, index) => (
                                        <div key={commission.id} className="p-4 border rounded-lg space-y-3">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{commission.sale_type === 'preconstruction' ? 'Preconstruction' : 'Construction'} Commission</p>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                    setRelatedCommissions(relatedCommissions.filter((_, i) => i !== index));
                                                }}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                            <div>
                                                <Label>Sale Type</Label>
                                                <Select 
                                                    value={commission.sale_type}
                                                    onValueChange={(value) => {
                                                        const updated = [...relatedCommissions];
                                                        updated[index].sale_type = value;
                                                        setRelatedCommissions(updated);
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="preconstruction">Preconstruction</SelectItem>
                                                        <SelectItem value="construction">Construction</SelectItem>
                                                    </SelectContent>
                                                </Select>
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
                            setUnifiedTimeline([]);
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