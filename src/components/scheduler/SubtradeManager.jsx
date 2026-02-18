import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Wrench } from 'lucide-react';

const TRADE_LABELS = {
  electrician: 'Electrician', plumber: 'Plumber', hvac: 'HVAC',
  painter: 'Painter', carpenter: 'Carpenter', drywaller: 'Drywaller',
  roofer: 'Roofer', landscaper: 'Landscaper', other: 'Other'
};

const TRADE_COLORS = {
  electrician: 'bg-yellow-100 text-yellow-800', plumber: 'bg-blue-100 text-blue-800',
  hvac: 'bg-cyan-100 text-cyan-800', painter: 'bg-pink-100 text-pink-800',
  carpenter: 'bg-amber-100 text-amber-800', drywaller: 'bg-gray-100 text-gray-800',
  roofer: 'bg-red-100 text-red-800', landscaper: 'bg-green-100 text-green-800',
  other: 'bg-slate-100 text-slate-800'
};

export { TRADE_LABELS, TRADE_COLORS };

export default function SubtradeManager({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [tradeType, setTradeType] = useState('electrician');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const { data: subtrades = [] } = useQuery({
    queryKey: ['subtrades'],
    queryFn: () => base44.entities.Subtrade.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Subtrade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtrades'] });
      setName(''); setContactPerson(''); setContactPhone(''); setContactEmail('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Subtrade.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subtrades'] }),
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(), trade_type: tradeType,
      contact_person: contactPerson, contact_phone: contactPhone, contact_email: contactEmail
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" /> Manage Subtrades
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3 border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Company / Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Joe's Electric" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Trade Type *</Label>
                <select value={tradeType} onChange={(e) => setTradeType(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-sm">
                  {Object.entries(TRADE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Contact Person</Label>
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!name.trim()} size="sm">
              <Plus className="w-3 h-3 mr-1" /> Add Subtrade
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subtrades ({subtrades.length})</Label>
            {subtrades.length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">No subtrades configured yet.</p>
            )}
            {subtrades.map(st => (
              <div key={st.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-slate-300">
                <div className="flex items-center gap-3">
                  <Badge className={TRADE_COLORS[st.trade_type] || 'bg-slate-100 text-slate-800'}>
                    {TRADE_LABELS[st.trade_type] || st.trade_type}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{st.name}</p>
                    {st.contact_person && <p className="text-xs text-slate-500">{st.contact_person} {st.contact_phone && `• ${st.contact_phone}`}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(st.id)}>
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}