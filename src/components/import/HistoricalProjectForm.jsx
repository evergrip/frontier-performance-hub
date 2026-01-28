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

    // Fetch users for dropdowns
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list()
    });

    // Filter sales users
    const salesUsers = users.filter(user => user.department === 'Sales' || user.departments?.includes('Sales'));
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

    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            // Client
            client_company_name: '',
            client_contact_name: '',
            client_email: '',
            client_phone: '',
            client_address: '',
            client_notes: '',
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
                    status_history: saleStatusHistory.filter(h => h.entered_date),
                    contract_value: parseFloat(data.contract_value),
                    estimated_margin: data.estimated_margin ? parseFloat(data.estimated_margin) : undefined,
                    close_date: data.close_date,
                    assigned_to: data.sale_assigned_to,
                    commission_processed: true,
                    notes: data.sale_notes
                },
                project: {
                    project_type: data.project_type,
                    title: data.project_title,
                    status_history: projectStatusHistory.filter(h => h.entered_date),
                    contract_value: parseFloat(data.contract_value),
                    actual_costs: parseFloat(data.actual_costs),
                    actual_margin: parseFloat(data.actual_margin),
                    start_date: data.start_date,
                    actual_completion_date: data.actual_completion_date,
                    project_manager: data.project_manager,
                    crew_assignment: data.crew_assignment,
                    color: data.color,
                    notes: data.project_notes
                }
            };

            const response = await base44.functions.invoke('importSingleHistoricalProject', payload);
            setResult({ success: true, data: response.data });
            toast.success('Historical project imported successfully!');
            
            // Reset form
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
                    <CardDescription>Enter details about the client</CardDescription>
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
                            <Label>Close Date *</Label>
                            <Input {...register('close_date')} type="date" required />
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
                    <CardDescription>Enter details about the completed project</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Project Type *</Label>
                            <Select onValueChange={(value) => setValue('project_type', value)} defaultValue="construction">
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