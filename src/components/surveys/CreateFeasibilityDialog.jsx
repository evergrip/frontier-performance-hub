import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { appParams } from '@/lib/app-params';

export default function CreateFeasibilityDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({
    client_id: '',
    property_address: '',
    sale_id: '',
  });

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

  const selectedClient = clients.find(c => c.id === form.client_id);
  const clientName = selectedClient?.company_name || selectedClient?.contact_name || '';

  const handleCreate = async () => {
    setCreating(true);
    const res = await base44.functions.invoke('createFeasibilitySurvey', {
      client_name: clientName,
      property_address: form.property_address,
      sale_id: form.sale_id || undefined,
    });
    setCreating(false);

    if (res.data?.success) {
      setCreated(res.data);
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Feasibility study created!');
    } else {
      toast.error('Failed to create feasibility study');
    }
  };

  const handleClose = () => {
    setCreated(null);
    setForm({ client_id: '', property_address: '', sale_id: '' });
    onOpenChange(false);
  };

  const surveyLink = created
    ? `${appParams.appBaseUrl || window.location.origin}/SurveyPublic?token=${created.share_token}`
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
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
                <Label>Client (optional)</Label>
                <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
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
                <Label>Property Address</Label>
                <Input
                  value={form.property_address}
                  onChange={e => setForm({ ...form, property_address: e.target.value })}
                  placeholder="123 Main St, Hamilton, ON"
                />
              </div>

              <div>
                <Label>Link to Pre-Con Sale (optional)</Label>
                <Select value={form.sale_id} onValueChange={v => setForm({ ...form, sale_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a sale (optional)" /></SelectTrigger>
                  <SelectContent>
                    {sales.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  This will create a feasibility assessment survey with tab-based navigation. The first page lets the assessor select which sections are needed — additional sections appear automatically based on answers.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-2 bg-[#ea7924] hover:bg-[#d66a1f]">
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { navigator.clipboard.writeText(surveyLink); toast.success('Link copied!'); }}
                >
                  Copy
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