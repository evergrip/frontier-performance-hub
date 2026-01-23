import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Users, Mail, Phone, MapPin, Target, ArrowRight, Archive, MoreVertical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '../components/common/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const [clientForm, setClientForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  const [leadForm, setLeadForm] = useState({
    title: '',
    source: 'other',
    estimated_precon_value: '',
    estimated_construction_value: '',
    assigned_to: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: [],
  });

  const { data: salesUsers = [] } = useQuery({
    queryKey: ['salesUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.departments?.includes('sales'));
    },
    initialData: [],
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setClientDialogOpen(false);
      setClientForm({ company_name: '', contact_name: '', email: '', phone: '', address: '', notes: '' });
      toast.success('Client created successfully');
    },
    onError: () => toast.error('Failed to create client')
  });

  const createLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setLeadDialogOpen(false);
      setLeadForm({ title: '', source: 'other', estimated_precon_value: '', estimated_construction_value: '', assigned_to: '', notes: '' });
      toast.success('Preconstruction lead created');
    },
    onError: () => toast.error('Failed to create lead')
  });

  const archiveClientMutation = useMutation({
    mutationFn: (clientId) => base44.entities.Client.update(clientId, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('Client archived');
    },
    onError: () => toast.error('Failed to archive client')
  });

  const filteredClients = clients
    .filter(client => client.status !== 'archived' || showArchived)
    .filter(client =>
      client.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleCreateClient = (e) => {
    e.preventDefault();
    createClientMutation.mutate(clientForm);
  };

  const handleCreateLead = (e) => {
    e.preventDefault();
    createLeadMutation.mutate({
      ...leadForm,
      client_id: selectedClient.id,
      estimated_precon_value: parseFloat(leadForm.estimated_precon_value) || 0,
      estimated_construction_value: parseFloat(leadForm.estimated_construction_value) || 0
    });
  };

  const openLeadDialog = (client) => {
    setSelectedClient(client);
    setLeadDialogOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Clients</h1>
          <p className="text-lg text-slate-500">Manage client relationships and create leads</p>
        </div>
        <Button onClick={() => setClientDialogOpen(true)} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30">
          <Plus className="w-5 h-5 mr-2" />
          New Client
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2"
        >
          <Archive className="w-4 h-4" />
          {showArchived ? 'Hide' : 'Show'} Archived
        </Button>
      </div>

      {/* Clients Table */}
      {filteredClients.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.company_name || '—'}</TableCell>
                    <TableCell>{client.contact_name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{client.email || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-500">{client.phone || '—'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        client.status === 'archived' ? 'bg-slate-100 text-slate-700' :
                        client.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {client.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openLeadDialog(client)}>
                            <Target className="w-4 h-4 mr-2" />
                            Create Lead
                          </DropdownMenuItem>
                          {client.status !== 'archived' && (
                            <DropdownMenuItem
                              onClick={() => archiveClientMutation.mutate(client.id)}
                              className="text-amber-600"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title="No clients found"
              description={searchQuery ? "Try adjusting your search" : "Get started by adding your first client"}
              actionLabel={!searchQuery ? "Add Client" : undefined}
              onAction={!searchQuery ? () => setClientDialogOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={clientForm.company_name}
                  onChange={(e) => setClientForm({...clientForm, company_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Contact Name *</Label>
                <Input
                  value={clientForm.contact_name}
                  onChange={(e) => setClientForm({...clientForm, contact_name: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={clientForm.address}
                onChange={(e) => setClientForm({...clientForm, address: e.target.value})}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={clientForm.notes}
                onChange={(e) => setClientForm({...clientForm, notes: e.target.value})}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setClientDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600">
                Create Client
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lead for {selectedClient?.company_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4">
            <div>
              <Label>Lead Title *</Label>
              <Input
                value={leadForm.title}
                onChange={(e) => setLeadForm({...leadForm, title: e.target.value})}
                placeholder="e.g., Office Renovation Project"
                required
              />
            </div>
            <div>
              <Label>Source</Label>
              <select
                value={leadForm.source}
                onChange={(e) => setLeadForm({...leadForm, source: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="referral">Referral</option>
                <option value="website">Website</option>
                <option value="cold_call">Cold Call</option>
                <option value="networking">Networking</option>
                <option value="advertisement">Advertisement</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Est. Precon Revenue</Label>
                <Input
                  type="number"
                  value={leadForm.estimated_precon_value}
                  onChange={(e) => setLeadForm({...leadForm, estimated_precon_value: e.target.value})}
                  placeholder="125000"
                />
              </div>
              <div>
                <Label>Est. Construction Revenue</Label>
                <Input
                  type="number"
                  value={leadForm.estimated_construction_value}
                  onChange={(e) => setLeadForm({...leadForm, estimated_construction_value: e.target.value})}
                  placeholder="750000"
                />
              </div>
            </div>
            <div>
              <Label>Assign Salesperson *</Label>
              <select
                value={leadForm.assigned_to}
                onChange={(e) => setLeadForm({...leadForm, assigned_to: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select salesperson...</option>
                {salesUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={leadForm.notes}
                onChange={(e) => setLeadForm({...leadForm, notes: e.target.value})}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setLeadDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLeadMutation.isPending}>
                Create Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}