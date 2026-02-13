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
import { Loader2, CheckCircle2, AlertCircle, Plus, Trash2, DollarSign } from 'lucide-react';
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
    const [monthlyAllocations, setMonthlyAllocations] = useState([]);
    const [lastLoadedLeadId, setLastLoadedLeadId] = useState(null);

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
    // Only re-run when the user actually picks a DIFFERENT lead, not on data refetches
    useEffect(() => {
        if (!selectedLeadId) return;
        if (selectedLeadId === lastLoadedLeadId) return;

        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return;

        setLastLoadedLeadId(selectedLeadId);

        // Reset ALL form fields first to prevent stale data from previous lead
        reset();

        const client = clients.find(c => c.id === lead.client_id);
        // Find all sales for this lead
        const leadSales = sales.filter(s => s.lead_id === lead.id);
        const allSaleIds = leadSales.map(s => s.id);
        
        // Identify precon sale (explicitly typed)
        const preconSale = leadSales.find(s => s.sale_type === 'preconstruction');
        
        // Find the construction sale: explicitly typed OR the one that has a project linked to it
        let constructionSale = leadSales.find(s => s.sale_type === 'construction');
        
        // Find the project by checking ALL sales for this lead (handles empty sale_type)
        let project = null;
        for (const s of leadSales) {
            const p = projects.find(pr => pr.sale_id === s.id);
            if (p) {
                project = p;
                // If this sale wasn't identified as the construction sale, it should be
                if (!constructionSale || constructionSale.id !== s.id) {
                    constructionSale = s;
                }
                break;
            }
        }
        
        // Also check converted_to_project_id on sales
        if (!project) {
            for (const s of leadSales) {
                if (s.converted_to_project_id) {
                    const p = projects.find(pr => pr.id === s.converted_to_project_id);
                    if (p) {
                        project = p;
                        if (!constructionSale) constructionSale = s;
                        break;
                    }
                }
            }
        }
        
        const sale = constructionSale || preconSale;

        // Find related commission transactions for all sales of this lead
        const saleCommissions = commissionTransactions.filter(t => allSaleIds.includes(t.sale_id));
        setRelatedCommissions(saleCommissions);

        // Client data
        if (client) {
            setValue('client_company_name', client.company_name || '');
            setValue('client_contact_name', client.contact_name || '');
            setValue('client_email', client.email || '');
            setValue('client_phone', client.phone || '');
            setValue('client_address', client.address || '');
            setValue('client_notes', client.notes || '');
        }

        // Lead data
        setValue('lead_title', lead.title || '');
        setValue('lead_source', lead.source || 'referral');
        setValue('lead_score', lead.lead_score || 50);
        setValue('estimated_precon_value', lead.estimated_precon_value || '');
        setValue('estimated_construction_value', lead.estimated_construction_value || '');
        setValue('lead_assigned_to', lead.assigned_to || '');
        setValue('lead_notes', lead.notes || '');

        // Sale data — load from construction sale for project values, precon sale for precon values
        if (constructionSale) {
            setValue('sale_type', constructionSale.sale_type || 'construction');
            setValue('sale_title', constructionSale.title || '');
            setValue('construction_contract_value', constructionSale.contract_value || '');
            setValue('estimated_margin', constructionSale.estimated_margin || '');
            setValue('close_date', constructionSale.close_date || '');
            setValue('sale_assigned_to', constructionSale.assigned_to || '');
            setValue('sale_notes', constructionSale.notes || '');
        } else if (preconSale) {
            setValue('sale_type', preconSale.sale_type || 'preconstruction');
            setValue('sale_title', preconSale.title || '');
            setValue('construction_contract_value', preconSale.estimated_construction_budget || '');
            setValue('estimated_margin', preconSale.estimated_margin || '');
            setValue('close_date', preconSale.close_date || '');
            setValue('sale_assigned_to', preconSale.assigned_to || '');
            setValue('sale_notes', preconSale.notes || '');
        }

        // Final Pre-Construction Value comes from the precon sale's contract_value
        if (preconSale) {
            setValue('final_precon_value', preconSale.contract_value || '');
        }

        // Project data — always set all fields explicitly (reset already cleared them)
        if (project) {
            setValue('project_type', project.project_type || 'construction');
            setValue('project_title', project.title || '');
            setValue('actual_costs', project.actual_costs || '');
            setValue('actual_margin', project.actual_margin || '');
            setValue('start_date', project.start_date || '');
            setValue('actual_completion_date', project.actual_completion_date || '');
            setValue('project_manager', project.project_manager_id || '');
            setValue('crew_assignment', project.crew_assignment || 'unassigned');
            setValue('color', project.color || '#3B82F6');
            setValue('project_notes', project.notes || '');

            // Load monthly revenue allocations
            if (project.monthly_revenue_allocations?.length > 0) {
                setMonthlyAllocations(project.monthly_revenue_allocations.map(a => ({
                    year: a.year || (a.period ? parseInt(a.period.split('-')[0]) : ''),
                    month: a.month || (a.period ? parseInt(a.period.split('-')[1]) : ''),
                    percentage: a.percentage || 0
                })));
            } else {
                setMonthlyAllocations([]);
            }
        } else {
            // No project — ensure project fields are blank
            setValue('project_title', '');
            setValue('actual_costs', '');
            setValue('actual_margin', '');
            setValue('start_date', '');
            setValue('actual_completion_date', '');
            setValue('project_manager', '');
            setValue('crew_assignment', 'unassigned');
            setValue('color', '#3B82F6');
            setValue('project_notes', '');
            setMonthlyAllocations([]);
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
        mutationFn: ({ id, ...rest }) => base44.entities.Lead.update(id, rest),
        onSuccess: () => queryClient.invalidateQueries(['leads'])
    });

    const updateClientMutation = useMutation({
        mutationFn: ({ id, ...rest }) => base44.entities.Client.update(id, rest),
        onSuccess: () => queryClient.invalidateQueries(['clients'])
    });

    const updateSaleMutation = useMutation({
        mutationFn: ({ id, ...rest }) => base44.entities.Sale.update(id, rest),
        onSuccess: () => queryClient.invalidateQueries(['sales'])
    });

    const updateProjectMutation = useMutation({
        mutationFn: ({ id, ...rest }) => base44.entities.Project.update(id, rest),
        onSuccess: () => queryClient.invalidateQueries(['projects'])
    });

    const updateCommissionMutation = useMutation({
        mutationFn: ({ id, ...rest }) => base44.entities.CommissionTransaction.update(id, rest),
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

    // Statuses whose dates drive revenue/commission calculations
    const revenueKeyStatuses = new Set([
        'closed_won',                          // precon revenue recognition
        'feasibility',                         // precon phase commission trigger
        'pending_construction_sale',           // precon phase commission trigger
        'active_construction',                 // construction revenue start
        'substantial_completion_closeout',     // construction revenue milestone
        'closed',                              // final revenue recognition
    ]);

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
            const leadSales = sales.filter(s => s.lead_id === lead?.id);
            const preconSale = leadSales.find(s => s.sale_type === 'preconstruction');
            const constructionSale = leadSales.find(s => s.sale_type === 'construction');
            const sale = constructionSale || preconSale;
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

            // Update construction sale
            if (constructionSale) {
                console.log('Updating construction sale...');
                try {
                    await updateSaleMutation.mutateAsync({
                        id: constructionSale.id,
                        title: data.sale_title,
                        phase_history: saleEntries,
                        contract_value: data.construction_contract_value ? parseFloat(data.construction_contract_value) : constructionSale.contract_value,
                        estimated_margin: data.estimated_margin ? parseFloat(data.estimated_margin) : undefined,
                        close_date: data.close_date || constructionSale.close_date,
                        assigned_to: data.sale_assigned_to || constructionSale.assigned_to,
                        notes: data.sale_notes
                    });
                    console.log('Construction sale updated successfully');
                } catch (err) {
                    console.error('Construction sale update failed:', err);
                    throw new Error(`Construction sale update failed: ${err.message}`);
                }
            }

            // Update precon sale (final precon value)
            if (preconSale && data.final_precon_value) {
                console.log('Updating precon sale...');
                try {
                    await updateSaleMutation.mutateAsync({
                        id: preconSale.id,
                        contract_value: parseFloat(data.final_precon_value)
                    });
                    console.log('Precon sale updated successfully');
                } catch (err) {
                    console.error('Precon sale update failed:', err);
                    throw new Error(`Precon sale update failed: ${err.message}`);
                }
            }

            // Update project — the full unified timeline becomes the master status_history
            if (project) {
                console.log('Updating project...');
                try {
                    // Build clean allocations
                    const cleanAllocations = monthlyAllocations
                        .filter(a => a.year && a.month && parseFloat(a.percentage) > 0)
                        .map(a => ({
                            year: Number(a.year),
                            month: Number(a.month),
                            period: `${a.year}-${String(a.month).padStart(2, '0')}`,
                            percentage: Number(a.percentage)
                        }));

                    await updateProjectMutation.mutateAsync({
                        id: project.id,
                        project_type: data.project_type || project.project_type,
                        title: data.project_title || project.title,
                        contract_value: data.construction_contract_value ? parseFloat(data.construction_contract_value) : project.contract_value,
                        actual_costs: data.actual_costs ? parseFloat(data.actual_costs) : project.actual_costs,
                        actual_margin: data.actual_margin ? parseFloat(data.actual_margin) : project.actual_margin,
                        start_date: data.start_date || project.start_date,
                        actual_completion_date: data.actual_completion_date || project.actual_completion_date,
                        project_manager_id: data.project_manager || project.project_manager_id,
                        crew_assignment: data.crew_assignment || project.crew_assignment,
                        color: data.color || project.color,
                        status_history: filledTimeline,
                        monthly_revenue_allocations: cleanAllocations,
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
                                    <Input {...register('estimated_precon_value')} type="number" step="0.01" placeholder="5000" />
                                </div>
                                <div>
                                    <Label>Estimated Construction Value</Label>
                                    <Input {...register('estimated_construction_value')} type="number" step="0.01" placeholder="150000" />
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

                    {/* Pre-Construction Sale Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pre-Construction Sale</CardTitle>
                            <CardDescription>Review and edit pre-construction sale details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Sale Type</Label>
                                    <Input value="Preconstruction" disabled className="bg-slate-50" />
                                </div>
                                <div>
                                    <Label>Sale Title *</Label>
                                    <Input {...register('sale_title')} placeholder="e.g., Construction Project - Basement Renovation" required />
                                </div>
                                <div className="relative">
                                    <Label className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Construction Contract Value *</span>
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Revenue Calc</span>
                                    </Label>
                                    <Input {...register('construction_contract_value')} type="number" step="0.01" placeholder="750000" required className="border-amber-300 ring-1 ring-amber-200 focus-visible:ring-amber-400" />
                                    <p className="text-xs text-slate-500 mt-1">The construction sale contract value</p>
                                </div>
                                <div className="relative">
                                    <Label className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Final Pre-Construction Value</span>
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Precon Revenue</span>
                                    </Label>
                                    <Input {...register('final_precon_value')} type="number" step="0.01" placeholder="25000" className="border-purple-300 ring-1 ring-purple-200 focus-visible:ring-purple-400" />
                                    <p className="text-xs text-slate-500 mt-1">From precon sale — locked in at conversion</p>
                                </div>
                                <div>
                                    <Label>Estimated Margin (%)</Label>
                                    <Input {...register('estimated_margin')} type="number" step="0.01" placeholder="45.00" />
                                </div>
                                <div className="relative">
                                    <Label className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Close Date *</span>
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Revenue Date</span>
                                    </Label>
                                    <Input {...register('close_date')} type="date" required className="border-amber-300 ring-1 ring-amber-200 focus-visible:ring-amber-400" />
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

                    {/* Construction Project Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Construction Project</CardTitle>
                            <CardDescription>Review and edit construction project details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Project Type</Label>
                                    <Input value="Construction" disabled className="bg-slate-50" />
                                </div>
                                <div>
                                    <Label>Project Title *</Label>
                                    <Input {...register('project_title')} placeholder="e.g., Main Project - Basement Renovation" required />
                                </div>
                                <div className="relative">
                                    <Label className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Actual Costs</span>
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Revenue Calc</span>
                                    </Label>
                                    <Input {...register('actual_costs')} type="number" step="0.01" placeholder="130000" className="border-amber-300 ring-1 ring-amber-200 focus-visible:ring-amber-400" />
                                </div>
                                <div className="relative">
                                    <Label className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Actual Margin (%)</span>
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Revenue Calc</span>
                                    </Label>
                                    <Input {...register('actual_margin')} type="number" step="0.01" placeholder="45.00" className="border-amber-300 ring-1 ring-amber-200 focus-visible:ring-amber-400" />
                                </div>
                                <div className="relative">
                                    <Label className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Start Date</span>
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Revenue Date</span>
                                    </Label>
                                    <Input {...register('start_date')} type="date" className="border-amber-300 ring-1 ring-amber-200 focus-visible:ring-amber-400" />
                                </div>
                                <div className="relative">
                                    <Label className="flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Completion Date</span>
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Revenue Date</span>
                                    </Label>
                                    <Input {...register('actual_completion_date')} type="date" className="border-amber-300 ring-1 ring-amber-200 focus-visible:ring-amber-400" />
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

                    {/* Monthly Revenue Allocations */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-amber-600" />
                                        Monthly Revenue Allocations
                                    </CardTitle>
                                    <CardDescription>
                                        Allocate what percentage of contract value was recognized each month.
                                        Total should equal 100% for a completed project.
                                    </CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                    setMonthlyAllocations([...monthlyAllocations, { year: new Date().getFullYear(), month: 1, percentage: 0 }]);
                                }}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Month
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {monthlyAllocations.length > 0 ? (
                                <div className="space-y-2">
                                    {monthlyAllocations.map((alloc, index) => (
                                        <div key={index} className="flex gap-2 items-center p-2 rounded-lg border bg-amber-50 border-amber-200">
                                            <div className="flex-1">
                                                <Label className="text-xs">Year</Label>
                                                <Input
                                                    type="number"
                                                    value={alloc.year || ''}
                                                    onChange={(e) => {
                                                        const updated = [...monthlyAllocations];
                                                        updated[index].year = parseInt(e.target.value) || '';
                                                        setMonthlyAllocations(updated);
                                                    }}
                                                    placeholder="2025"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs">Month (1-12)</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="12"
                                                    value={alloc.month || ''}
                                                    onChange={(e) => {
                                                        const updated = [...monthlyAllocations];
                                                        updated[index].month = parseInt(e.target.value) || '';
                                                        setMonthlyAllocations(updated);
                                                    }}
                                                    placeholder="1"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs">% of Contract</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="100"
                                                    value={alloc.percentage || ''}
                                                    onChange={(e) => {
                                                        const updated = [...monthlyAllocations];
                                                        updated[index].percentage = parseFloat(e.target.value) || 0;
                                                        setMonthlyAllocations(updated);
                                                    }}
                                                    placeholder="10"
                                                />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => {
                                                setMonthlyAllocations(monthlyAllocations.filter((_, i) => i !== index));
                                            }}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2 px-2">
                                        <p className="text-sm text-slate-600">
                                            Total: <span className={`font-bold ${Math.abs(monthlyAllocations.reduce((s, a) => s + (a.percentage || 0), 0) - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {monthlyAllocations.reduce((s, a) => s + (a.percentage || 0), 0).toFixed(1)}%
                                            </span>
                                        </p>
                                        {Math.abs(monthlyAllocations.reduce((s, a) => s + (a.percentage || 0), 0) - 100) >= 0.1 && (
                                            <p className="text-xs text-amber-600">Should total 100% for a completed project</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-4">No revenue allocations set. Add months to allocate revenue recognition.</p>
                            )}
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
                                    const isRevenueKey = revenueKeyStatuses.has(item.status);
                                    return (
                                        <div key={index} className={`flex gap-2 items-center p-2 rounded-lg border ${isRevenueKey ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200' : borderStyle}`}>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${srcStyle.badge}`}>
                                                {srcStyle.text}
                                            </span>
                                            {isRevenueKey && (
                                                <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            )}
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