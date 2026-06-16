import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Loader2, FileText, Image, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import LeadSourcePicker from '../common/LeadSourcePicker';

function getFileIcon(name) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(name)) return Image;
  return FileText;
}

export default function AddLeadDialog({ open, onOpenChange, clients, users }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef();

  const [clientMode, setClientMode] = useState('existing'); // 'existing' or 'new'
  const [form, setForm] = useState({
    title: '',
    client_id: '',
    source: '',
    lead_score: 50,
    estimated_precon_value: '',
    estimated_construction_value: '',
    assigned_to: '',
    notes: '',
  });
  const [newClient, setNewClient] = useState({
    contact_name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setClient = (key, val) => setNewClient(prev => ({ ...prev, [key]: val }));

  const resetForm = () => {
    setForm({ title: '', client_id: '', source: '', lead_score: 50, estimated_precon_value: '', estimated_construction_value: '', assigned_to: '', notes: '' });
    setNewClient({ contact_name: '', company_name: '', email: '', phone: '', address: '' });
    setPendingFiles([]);
    setClientMode('existing');
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setPendingFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let clientId = form.client_id;

      // Create new client if needed
      if (clientMode === 'new') {
        if (!newClient.contact_name.trim()) throw new Error('Client contact name is required');
        const created = await base44.entities.Client.create({
          contact_name: newClient.contact_name.trim(),
          company_name: newClient.company_name.trim() || undefined,
          email: newClient.email.trim() || undefined,
          phone: newClient.phone.trim() || undefined,
          address: newClient.address.trim() || undefined,
          status: 'active',
        });
        clientId = created.id;
      }

      if (!clientId) throw new Error('Please select or create a client');

      // Upload files
      let attachments = [];
      if (pendingFiles.length > 0) {
        attachments = await Promise.all(
          pendingFiles.map(async (file) => {
            const result = await base44.integrations.Core.UploadFile({ file });
            return { url: result.file_url, name: file.name, uploaded_at: new Date().toISOString() };
          })
        );
      }

      // Create lead
      await base44.entities.Lead.create({
        title: form.title,
        client_id: clientId,
        source: form.source || undefined,
        lead_score: Number(form.lead_score),
        estimated_precon_value: form.estimated_precon_value ? parseFloat(form.estimated_precon_value) : undefined,
        estimated_construction_value: form.estimated_construction_value ? parseFloat(form.estimated_construction_value) : undefined,
        assigned_to: form.assigned_to || undefined,
        notes: form.notes || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        status: 'new_project_lead',
        status_history: [{ status: 'new_project_lead', entered_date: new Date().toISOString() }],
      });
    },
    onSuccess: () => {
      setUploading(false);
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['clients']);
      onOpenChange(false);
      resetForm();
      toast.success('Lead created');
    },
    onError: (err) => {
      setUploading(false);
      toast.error(err.message || 'Failed to create lead');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Lead title is required'); return; }
    if (clientMode === 'existing' && !form.client_id) { toast.error('Please select a client'); return; }
    if (clientMode === 'new' && !newClient.contact_name.trim()) { toast.error('Client contact name is required'); return; }
    createMutation.mutate();
  };

  const isPending = createMutation.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Title */}
          <div>
            <Label>Lead Title *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g., Kitchen Renovation - Smith" required />
          </div>

          {/* Client Section */}
          <div className="space-y-3">
            <Label>Client *</Label>
            <Tabs value={clientMode} onValueChange={setClientMode}>
              <TabsList className="w-full">
                <TabsTrigger value="existing" className="flex-1 gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Existing Client
                </TabsTrigger>
                <TabsTrigger value="new" className="flex-1 gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> New Client
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="mt-3">
                <Select value={form.client_id || ''} onValueChange={(v) => set('client_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name || c.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Show selected client info */}
                {form.client_id && (() => {
                  const sc = clients.find(c => c.id === form.client_id);
                  if (!sc) return null;
                  const hasInfo = sc.email || sc.phone || sc.address;
                  if (!hasInfo) return null;
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-2 space-y-0.5">
                      {sc.contact_name && <p className="text-sm font-medium text-slate-700">{sc.contact_name}</p>}
                      {sc.email && <p className="text-xs text-slate-500">{sc.email}</p>}
                      {sc.phone && <p className="text-xs text-slate-500">{sc.phone}</p>}
                      {sc.address && <p className="text-xs text-slate-500">{sc.address}</p>}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="new" className="mt-3 space-y-3">
                <div>
                  <Label>Contact Name *</Label>
                  <Input value={newClient.contact_name} onChange={(e) => setClient('contact_name', e.target.value)} placeholder="John Smith" />
                </div>
                <div>
                  <Label>Company Name</Label>
                  <Input value={newClient.company_name} onChange={(e) => setClient('company_name', e.target.value)} placeholder="Smith Homes LLC" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={newClient.email} onChange={(e) => setClient('email', e.target.value)} placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={newClient.phone} onChange={(e) => setClient('phone', e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={newClient.address} onChange={(e) => setClient('address', e.target.value)} placeholder="123 Main St, City, State" />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Lead Source */}
          <div>
            <Label>Lead Source</Label>
            <LeadSourcePicker value={form.source || ''} onChange={(v) => set('source', v)} />
          </div>

          {/* Assigned To */}
          <div>
            <Label>Assigned To</Label>
            <Select value={form.assigned_to || 'unassigned'} onValueChange={(v) => set('assigned_to', v === 'unassigned' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Score */}
          <div>
            <Label>Lead Score: {form.lead_score}</Label>
            <Slider value={[form.lead_score]} onValueChange={([v]) => set('lead_score', v)} min={0} max={100} step={1} className="mt-2" />
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Est. Precon Value</Label>
              <Input type="number" value={form.estimated_precon_value} onChange={(e) => set('estimated_precon_value', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Est. Construction Value</Label>
              <Input type="number" value={form.estimated_construction_value} onChange={(e) => set('estimated_construction_value', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Internal notes about this lead..." />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <div className="flex items-center justify-between">
              <Label className="mb-0">Attachments</Label>
              <Button type="button" variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Add Files
              </Button>
            </div>
            {pendingFiles.length > 0 && (
              <div className="space-y-1">
                {pendingFiles.map((file, i) => {
                  const Icon = getFileIcon(file.name);
                  return (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5 group">
                      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-700 flex-1 truncate">{file.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-[#ea7924] hover:bg-[#d66a1f]">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}