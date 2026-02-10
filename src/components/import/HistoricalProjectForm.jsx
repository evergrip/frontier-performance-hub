import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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

export default function HistoricalProjectForm() {
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [selectedClientId, setSelectedClientId] = useState('new');

    // Fetch users for dropdowns
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list()
    });

    // Fetch clients for dropdown
    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: () => base44.entities.Client.list()
    });

    // Filter sales users
    const salesUsers = users.filter(user => 
        user.department === 'Sales' || 
        user.departments?.includes('Sales') || 
        user.departments?.includes('sales')
    );
    const [leadStatusHistory, setLeadStatusHistory] = useState([
        { status: 'new_project_lead', entered_date: '' },
        { status: 'initial_video_consult', entered_date: '' },
        { status: 'initial_inperson_consultation', entered_date: '' },
        { status: 'preconstruction_proposal', entered_date: '' },
        { status: 'converted', entered_date: '' }
    ]);
    const [saleStatusHistory, setSaleStatusHistory] = useState([
        { status: 'feasibility', entered_date: '' },
        { status: 'design_material_selections', entered_date: '' },
        { status: 'engineering_permits', entered_date: '' },
        { status: 'pending_construction_sale', entered_date: '' },
        { status: 'closed_won', entered_date: '' }
    ]);
    const [projectStatusHistory, setProjectStatusHistory] = useState([
        { status: 'awaiting_to_be_scheduled', entered_date: '' },
        { status: 'mobilization', entered_date: '' },
        { status: 'active_construction', entered_date: '' },
        { status: 'substantial_completion_closeout', entered_date: '' },
        { status: 'closed', entered_date: '' }
    ]);
    const [preconCommission, setPreconCommission] = useState(0);
    const [constructionCommission, setConstructionCommission] = useState(0);
    const [includeProject, setIncludeProject] = useState(true);
    const [saleStatus, setSaleStatus] = useState('closed_won');

    // Pipeline ordering helpers
    const saleStageOrder = ['feasibility', 'design_material_selections', 'engineering_permits', 'pending_construction_sale', 'closed_won'];
    const projectStageOrder = ['awaiting_to_be_scheduled', 'mobilization', 'active_construction', 'substantial_completion_closeout', 'closed'];

    const isConstructionPhase = projectStageOrder.includes(saleStatus);
    const effectiveSaleStatus = isConstructionPhase ? 'closed_won' : saleStatus;
    const effectiveProjectStatus = isConstructionPhase ? saleStatus : null;

    const isSaleHistoryRequired = (status) => {
        if (saleStatus === 'closed_lost') return false;
        const currentIdx = saleStageOrder.indexOf(effectiveSaleStatus);
        const statusIdx = saleStageOrder.indexOf(status);
        if (currentIdx < 0 || statusIdx < 0) return false;
        return statusIdx <= currentIdx;
    };

    const isProjectHistoryRequired = (status) => {
        if (!effectiveProjectStatus) return false;
        const currentIdx = projectStageOrder.indexOf(effectiveProjectStatus);
        const statusIdx = projectStageOrder.indexOf(status);
        if (currentIdx < 0 || statusIdx < 0) return false;
        return statusIdx <= currentIdx;
    };

    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            // Client
            client_company_name: '',
            client_contact_name: '',
            client_email: '',
            client_phone: '',
            client_address: '',
            client_notes: '',
            client_id: '',
            // Lead
            lead_title: '',
            lead_source: 'referral',
            lead_score: 50,
            estimated_precon_value: '',
            estimated_construction_value: '',
            lead_assigned_to: '',
            lead_notes: '',
            // Sale
            sale_type: 'construction',
            sale_title: '',
            contract_value: '',
            estimated_margin: '',
            close_date: '',
            sale_assigned_to: '',
            sale_notes: '',
            // Project
            project_type: 'construction',
            project_title: '',
            actual_costs: '',
            actual_margin: '',
            start_date: '',
            actual_completion_date: '',
            project_manager: '',
            crew_assignment: 'crew_a',
            color: '#3B82F6',
            project_notes: ''
        }
    });

    // Handle client selection
    const handleClientSelection = (clientId) => {
        setSelectedClientId(clientId);
        
        if (clientId === 'new') {
            // Clear client fields for new client
            setValue('client_id', '');
            setValue('client_company_name', '');
            setValue('client_contact_name', '');
            setValue('client_email', '');
            setValue('client_phone', '');
            setValue('client_address', '');
            setValue('client_notes', '');
        } else {
            // Auto-fill with existing client data
            const client = clients.find(c => c.id === clientId);
            if (client) {
                setValue('client_id', client.id);
                setValue('client_company_name', client.company_name || '');
                setValue('client_contact_name', client.contact_name || '');
                setValue('client_email', client.email || '');
                setValue('client_phone', client.phone || '');
                setValue('client_address', client.address || '');
                setValue('client_notes', client.notes || '');
            }
        }
    };

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
        setProjectStatusHistory([...projectStatusHistory, { status: 'mobilization', entered_date: '' }]);
    };

    const removeProjectStatus = (index) => {
        setProjectStatusHistory(projectStatusHistory.filter((_, i) => i !== index));
    };

    const onSubmit = async (data) => {
        setSubmitting(true);
        setResult(null);

        try {
            // Build the JSON structure
            const payload = {
                client: {
                    company_name: data.client_company_name,
                    contact_name: data.client_contact_name,
                    email: data.client_email,
                    phone: data.client_phone,
                    address: data.client_address,
                    notes: data.client_notes
                },
                lead: {
                    title: data.lead_title,
                    source: data.lead_source,
                    lead_score: data.lead_score ? parseFloat(data.lead_score) : 50,
                    status_history: leadStatusHistory.filter(h => h.entered_date),
                    estimated_precon_value: data.estimated_precon_value ? parseFloat(data.estimated_precon_value) : undefined,
                    estimated_construction_value: data.estimated_construction_value ? parseFloat(data.estimated_construction_value) : undefined,
                    assigned_to: data.lead_assigned_to,
                    notes: data.lead_notes
                },
                sale: {
                    sale_type: data.sale_type,
                    title: data.sale_title,
                    sale_status: effectiveSaleStatus,
                    status_history: saleStatusHistory.filter(h => h.entered_date),
                    contract_value: parseFloat(data.contract_value),
                    estimated_margin: data.estimated_margin ? parseFloat(data.estimated_margin) : undefined,
                    close_date: data.close_date || null,
                    assigned_to: data.sale_assigned_to,
                    commission_processed: data.commission_processed === 'true',
                    precon_commission_amount: preconCommission ? parseFloat(preconCommission) : undefined,
                    construction_commission_amount: constructionCommission ? parseFloat(constructionCommission) : undefined,
                    notes: data.sale_notes
                },
                project: (includeProject || isConstructionPhase) ? {
                    project_type: data.project_type,
                    title: data.project_title,
                    project_status: effectiveProjectStatus || (saleStatus === 'closed_won' ? 'closed' : null),
                    status_history: projectStatusHistory.filter(h => h.entered_date),
                    contract_value: parseFloat(data.contract_value),
                    actual_costs: data.actual_costs ? parseFloat(data.actual_costs) : 0,
                    actual_margin: data.actual_margin ? parseFloat(data.actual_margin) : 0,
                    start_date: data.start_date || null,
                    actual_completion_date: data.actual_completion_date || null,
                    project_manager: data.project_manager,
                    crew_assignment: data.crew_assignment,
                    color: data.color,
                    notes: data.project_notes
                } : null
            };

            const response = await base44.functions.invoke('importSingleHistoricalProject', payload);
            setResult({ success: true, data: response.data });
            toast.success('Historical project imported successfully!');
            
            // Reset form
            reset();
            setSelectedClientId('new');
            setPreconCommission(0);
            setConstructionCommission(0);
            setIncludeProject(true);
            setSaleStatus('closed_won');
            setLeadStatusHistory([
                { status: 'new_project_lead', entered_date: '' },
                { status: 'initial_video_consult', entered_date: '' },
                { status: 'initial_inperson_consultation', entered_date: '' },
                { status: 'preconstruction_proposal', entered_date: '' },
                { status: 'converted', entered_date: '' }
            ]);
            setSaleStatusHistory([
                { status: 'feasibility', entered_date: '' },
                { status: 'design_material_selections', entered_date: '' },
                { status: 'engineering_permits', entered_date: '' },
                { status: 'pending_construction_sale', entered_date: '' },
                { status: 'closed_won', entered_date: '' }
            ]);
            setProjectStatusHistory([
                { status: 'awaiting_to_be_scheduled', entered_date: '' },
                { status: 'mobilization', entered_date: '' },
                { status: 'active_construction', entered_date: '' },
                { status: 'substantial_completion_closeout', entered_date: '' },
                { status: 'closed', entered_date: '' }
            ]);
        } catch (error) {
            setResult({ success: false, error: error.message });
            toast.error('Failed to import project: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                    <CardDescription>Select an existing client or create a new one</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Select Client</Label>
                        <Select value={selectedClientId} onValueChange={handleClientSelection}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">+ Create New Client</SelectItem>
                                {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.contact_name} {client.company_name ? `(${client.company_name})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                    <CardDescription>Enter details about the original lead</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Lead Title *</Label>
                            <Input {...register('lead_title')} placeholder="e.g., Basement Renovation" required />
                        </div>
                        <div>
                            <Label>Source</Label>
                            <Select onValueChange={(value) => setValue('lead_source', value)} defaultValue="referral">
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
                            <Select onValueChange={(value) => setValue('lead_assigned_to', value)}>
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
                    <CardDescription>Enter details about the sale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Sale Type *</Label>
                            <Select onValueChange={(value) => setValue('sale_type', value)} defaultValue="construction">
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
                            <Label>Current Pipeline Position *</Label>
                            <Select value={saleStatus} onValueChange={(value) => {
                                setSaleStatus(value);
                                const isConst = projectStageOrder.includes(value);
                                if (isConst) {
                                    setIncludeProject(true);
                                } else if (value === 'closed_won') {
                                    // User can optionally include project
                                } else {
                                    setIncludeProject(false);
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem disabled className="text-xs font-semibold text-slate-500 uppercase">Pre-Construction</SelectItem>
                                    <SelectItem value="feasibility">Feasibility (Active Pre-Con)</SelectItem>
                                    <SelectItem value="design_material_selections">Design & Materials (Active Pre-Con)</SelectItem>
                                    <SelectItem value="engineering_permits">Engineering & Permits (Active Pre-Con)</SelectItem>
                                    <SelectItem value="pending_construction_sale">Pending Construction Sale (Active Pre-Con)</SelectItem>
                                    <SelectItem value="closed_won">Pre-Con Closed (No Construction Yet)</SelectItem>
                                    <SelectItem value="closed_lost">Closed Lost</SelectItem>
                                    <SelectItem disabled className="text-xs font-semibold text-slate-500 uppercase">Construction</SelectItem>
                                    <SelectItem value="awaiting_to_be_scheduled">Awaiting Scheduling (In Construction)</SelectItem>
                                    <SelectItem value="mobilization">Mobilization (In Construction)</SelectItem>
                                    <SelectItem value="active_construction">Active Construction</SelectItem>
                                    <SelectItem value="substantial_completion_closeout">Substantial Completion / Closeout</SelectItem>
                                    <SelectItem value="closed">Construction Complete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Close Date {saleStatus === 'closed_won' ? '*' : '(optional)'}</Label>
                            <Input {...register('close_date')} type="date" required={saleStatus === 'closed_won'} />
                        </div>
                        <div>
                            <Label>Assigned To</Label>
                            <Select onValueChange={(value) => setValue('sale_assigned_to', value)}>
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
                            {saleStatusHistory.map((item, index) => {
                                const required = isSaleHistoryRequired(item.status);
                                return (
                                    <div key={index} className={`flex gap-2 items-center ${!required ? 'opacity-40' : ''}`}>
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
                                        {!required && <span className="text-xs text-slate-400 whitespace-nowrap">optional</span>}
                                        {saleStatusHistory.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeSaleStatus(index)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Commission Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Commission Information</CardTitle>
                    <CardDescription>Enter actual commission amounts paid for this historical sale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Commission Status</Label>
                        <Select onValueChange={(value) => setValue('commission_processed', value)} defaultValue="true">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">Processed (Already Paid)</SelectItem>
                                <SelectItem value="false">Not Processed</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1">
                            Historical projects typically have commissions already processed
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Preconstruction Commission ($)</Label>
                            <Input 
                                type="number"
                                min="0"
                                step="0.01"
                                value={preconCommission}
                                onChange={(e) => setPreconCommission(e.target.value)}
                                placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Commission paid for preconstruction work
                            </p>
                        </div>
                        <div>
                            <Label>Construction Commission ($)</Label>
                            <Input 
                                type="number"
                                min="0"
                                step="0.01"
                                value={constructionCommission}
                                onChange={(e) => setConstructionCommission(e.target.value)}
                                placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Commission paid for construction work
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Project Information */}
            <Card className={(!includeProject && !isConstructionPhase) ? 'opacity-60' : ''}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Project Information</CardTitle>
                            <CardDescription>
                                {isConstructionPhase 
                                    ? `Project is in construction (${saleStatus.replace(/_/g, ' ')})`
                                    : includeProject 
                                        ? 'Enter details about the completed project' 
                                        : 'Project section is skipped — sale is still in pre-construction'}
                            </CardDescription>
                        </div>
                        {!isConstructionPhase && (
                            <div className="flex items-center gap-2">
                                <Label className="text-sm">Include Project</Label>
                                <input
                                    type="checkbox"
                                    checked={includeProject}
                                    onChange={(e) => setIncludeProject(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className={`space-y-4 ${(!includeProject && !isConstructionPhase) ? 'pointer-events-none' : ''}`}>
                    {(!includeProject && !isConstructionPhase) && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            This sale is still in the pre-construction pipeline. No project will be created. You can import the project later when it's ready.
                        </div>
                    )}
                    {isConstructionPhase && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                            This project is in construction. Only fill in dates for phases that have already occurred. Future phases are greyed out.
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Project Type {(includeProject || isConstructionPhase) ? '*' : ''}</Label>
                            <Select onValueChange={(value) => setValue('project_type', value)} defaultValue="construction" disabled={!includeProject && !isConstructionPhase}>
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
                            <Label>Project Title {(includeProject || isConstructionPhase) ? '*' : ''}</Label>
                            <Input {...register('project_title')} placeholder="e.g., Main Project - Basement Renovation" required={includeProject || isConstructionPhase} disabled={!includeProject && !isConstructionPhase} />
                        </div>
                        <div>
                            <Label>Actual Costs {effectiveProjectStatus === 'closed' ? '*' : '(optional if in progress)'}</Label>
                            <Input {...register('actual_costs')} type="number" placeholder="130000" required={effectiveProjectStatus === 'closed'} disabled={!includeProject && !isConstructionPhase} />
                        </div>
                        <div>
                            <Label>Actual Margin (%) {effectiveProjectStatus === 'closed' ? '*' : '(optional if in progress)'}</Label>
                            <Input {...register('actual_margin')} type="number" step="0.01" placeholder="45.00" required={effectiveProjectStatus === 'closed'} disabled={!includeProject && !isConstructionPhase} />
                        </div>
                        <div>
                            <Label>Start Date {(includeProject || isConstructionPhase) ? '*' : ''}</Label>
                            <Input {...register('start_date')} type="date" required={includeProject || isConstructionPhase} disabled={!includeProject && !isConstructionPhase} />
                        </div>
                        <div>
                            <Label>Completion Date {effectiveProjectStatus === 'closed' ? '*' : '(optional if in progress)'}</Label>
                            <Input {...register('actual_completion_date')} type="date" required={effectiveProjectStatus === 'closed'} disabled={!includeProject && !isConstructionPhase} />
                        </div>
                        <div>
                            <Label>Project Manager</Label>
                            <Select onValueChange={(value) => setValue('project_manager', value)}>
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
                            <Select onValueChange={(value) => setValue('crew_assignment', value)} defaultValue="crew_a">
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
                            {projectStatusHistory.map((item, index) => {
                                const required = isProjectHistoryRequired(item.status);
                                return (
                                    <div key={index} className={`flex gap-2 items-center ${!required ? 'opacity-40' : ''}`}>
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
                                        {!required && <span className="text-xs text-slate-400 whitespace-nowrap">optional</span>}
                                        {projectStatusHistory.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeProjectStatus(index)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => {
                    reset();
                    setLeadStatusHistory([
                        { status: 'new_project_lead', entered_date: '' },
                        { status: 'initial_video_consult', entered_date: '' },
                        { status: 'initial_inperson_consultation', entered_date: '' },
                        { status: 'preconstruction_proposal', entered_date: '' },
                        { status: 'converted', entered_date: '' }
                    ]);
                    setSaleStatusHistory([
                        { status: 'feasibility', entered_date: '' },
                        { status: 'design_material_selections', entered_date: '' },
                        { status: 'engineering_permits', entered_date: '' },
                        { status: 'pending_construction_sale', entered_date: '' },
                        { status: 'closed_won', entered_date: '' }
                    ]);
                    setProjectStatusHistory([
                        { status: 'awaiting_to_be_scheduled', entered_date: '' },
                        { status: 'mobilization', entered_date: '' },
                        { status: 'active_construction', entered_date: '' },
                        { status: 'substantial_completion_closeout', entered_date: '' },
                        { status: 'closed', entered_date: '' }
                    ]);
                    setSelectedClientId('new');
                    setPreconCommission(0);
                    setConstructionCommission(0);
                    setIncludeProject(true);
                    setSaleStatus('closed_won');
                }}>
                    Clear Form
                </Button>
                <Button type="submit" disabled={submitting} className="min-w-32">
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                        </>
                    ) : (
                        'Import Project'
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
                                {result.success ? 'Import Successful' : 'Import Failed'}
                            </p>
                            {result.error && <p className="text-sm mt-1">{result.error}</p>}
                            {result.data && (
                                <div className="text-sm mt-2">
                                    <p>Client: {result.data.client_id}</p>
                                    <p>Lead: {result.data.lead_id}</p>
                                    <p>Sale: {result.data.sale_id}</p>
                                    <p>Project: {result.data.project_id}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Alert>
            )}
        </form>
    );
}