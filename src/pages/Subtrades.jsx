import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wrench, Plus, Trash2, Phone, Mail, User } from 'lucide-react';

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

export default function Subtrades() {
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

  const grouped = Object.entries(TRADE_LABELS).reduce((acc, [key, label]) => {
    const trades = subtrades.filter(s => s.trade_type === key);
    if (trades.length > 0) acc.push({ key, label, trades });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Subtrades</h1>
        <p className="text-lg text-slate-500">Manage your subtrade contractors for project scheduling</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add New Subtrade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <Button onClick={handleAdd} disabled={!name.trim()} className="mt-4">
            <Plus className="w-4 h-4 mr-2" /> Add Subtrade
          </Button>
        </CardContent>
      </Card>

      {grouped.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No subtrades configured yet</p>
            <p className="text-sm">Add your first subtrade above to get started.</p>
          </CardContent>
        </Card>
      )}

      {grouped.map(({ key, label, trades }) => (
        <Card key={key}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className={TRADE_COLORS[key]}>{label}</Badge>
              <span className="text-sm text-slate-500">({trades.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trades.map(st => (
                <div key={st.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border hover:border-slate-300">
                  <div>
                    <p className="font-medium text-sm">{st.name}</p>
                    <div className="space-y-0.5 mt-1">
                      {st.contact_person && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3" /> {st.contact_person}
                        </p>
                      )}
                      {st.contact_phone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {st.contact_phone}
                        </p>
                      )}
                      {st.contact_email && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {st.contact_email}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(st.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}