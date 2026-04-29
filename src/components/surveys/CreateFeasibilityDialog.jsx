import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { appParams } from '@/lib/app-params';

const INITIAL_FORM = {
  project_name: '',
  client_id: '',
  client_email: '',
  property_address: '',
  project_type: '',
  assigned_to: '',
  internal_notes: '',
  study_mode: 'combined',
  sale_id: '',
};

export default function CreateFeasibilityDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: open,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['precon-sales-for-feasibility'],
    queryFn: () => base44.entities.Sale.filter({ sale_type: 'preconstruction' }),
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-basic'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const selectedClient = clients.find(c => c.id === form.client_id);
  const clientName = selectedClient?.company_name || selectedClient?.contact_name || '';
  const clientEmail = selectedClient?.email || '';

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    setCreating(true);
    const res = await base44.functions.invoke('createFeasibilitySurvey', {
      project_name: form.project_name,
      client_name: clientName || form.project_name,
      client_email: form.client_email || clientEmail,
      property_address: form.property_address,
      project_type: form.project_type,
      assigned_to: form.assigned_to,
      internal_notes: form.internal_notes,
      study_mode: form.study_mode,
      sale_id: form.sale_id || undefined,
    });
    setCreating(false);

    if (res.data?.success) {
      setCreated(res.data);
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Feasibility study created!');
    } else {
      toast.error(res.data?.error || 'Failed to create feasibility study');
    }
  };

  const handleClose = () => {
    setCreated(null);
    setForm(INITIAL_FORM);
    setCopied(false);
    onOpenChange(false);
  };

  const surveyLink = created
    ? `${appParams.appBaseUrl || window.location.origin}/SurveyPublic?token=${created.share_token}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(surveyLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ea7924]" />
            New Feasibility Study
          </DialogTitle>
        </DialogHeader>

        {!created ? (
          <>
            <div className="space-y-4">
              <div>
                <Label>Project Name <span className="text-red-500">*</span></Label>
                <Input
                  value={form.project_name}
                  onChange={e => set('project_name', e.target.value)}
                  placeholder="e.g. Smith Residence Addition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={v => set('client_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name || c.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client Email</Label>
                  <Input
                    value={form.client_email || clientEmail}
                    onChange={e => set('client_email', e.target.value)}
                    placeholder="client@email.com"
                  />
                </div>
              </div>

              <div>
                <Label>Property Address</Label>
                <Input
                  value={form.property_address}
                  onChange={e => set('property_address', e.target.value)}
                  placeholder="123 Main St, Hamilton, ON"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project Type</Label>
                  <Select value={form.project_type} onValueChange={v => set('project_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {["New Build", "Addition", "Second Storey Addition", "Renovation", "ADU / Garden Suite", "Garage", "Basement", "Other"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)}>
                    <SelectTrigger><SelectValue placeholder="Staff member" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Link to Pre-Con Sale (optional)</Label>
                <Select value={form.sale_id} onValueChange={v => set('sale_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select a sale" /></SelectTrigger>
                  <SelectContent>
                    {sales.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Study Mode</Label>
                <RadioGroup value={form.study_mode} onValueChange={v => set('study_mode', v)} className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="client_questionnaire" /> Client Questionnaire
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="staff_checklist" /> Staff Onsite Checklist
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="combined" /> Combined Feasibility Study
                  </label>
                </RadioGroup>
              </div>

              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  value={form.internal_notes}
                  onChange={e => set('internal_notes', e.target.value)}
                  placeholder="Any internal notes about this study..."
                  rows={2}
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  This creates a comprehensive feasibility survey with 21 sections covering client readiness, property, zoning, structure, budget, schedule, and more. The first page lets the assessor select which sections apply.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !form.project_name}
                className="gap-2 bg-[#ea7924] hover:bg-[#d66a1f]"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create Feasibility Study'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-sm font-medium text-green-800 mb-1">Feasibility study created!</p>
              <p className="text-lg font-bold text-slate-900">{created.title}</p>
            </div>

            <div>
              <Label className="text-xs text-slate-500">Survey Link</Label>
              <div className="flex items-center gap-2 mt-1 p-2 bg-slate-50 rounded-lg border">
                <input
                  readOnly
                  value={surveyLink}
                  className="flex-1 text-xs bg-transparent text-slate-600 outline-none"
                  onClick={e => e.target.select()}
                />
                <Button size="sm" variant="ghost" onClick={copyLink} className="gap-1">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <a href={surveyLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full gap-2 bg-[#ea7924] hover:bg-[#d66a1f]">
                  <ExternalLink className="w-4 h-4" /> Open Study
                </Button>
              </a>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}