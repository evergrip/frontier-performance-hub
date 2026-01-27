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
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [clientDetailDialogOpen, setClientDetailDialogOpen] = useState(false);
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

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
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

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setEditClientDialogOpen(false);
      toast.success('Client updated successfully');
    },
    onError: () => toast.error('Failed to update client')
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
      client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleCreateClient = (e) => {
    e.preventDefault();
    if (!clientForm.contact_name) {
      toast.error('Contact Name is required.');
      return;
    }
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

  const openEditDialog = (client) => {
    setSelectedClient(client);
    setClientForm({
      company_name: client.company_name || '',
      contact_name: client.contact_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setEditClientDialogOpen(true);
  };

  const openClientDetail = (client) => {
    setSelectedClient(client);
    setClientDetailDialogOpen(true);
  };

  const handleUpdateClient = (e) => {
    e.preventDefault();
    if (!clientForm.contact_name) {
      toast.error('Contact Name is required.');
      return;
    }
    updateClientMutation.mutate({
      id: selectedClient.id,
      data: clientForm
    });
  };

  const getClientSales = (clientId) => {
    return sales.filter(s => s.client_id === clientId);
  };

  const calculateLifetimeValue = (clientId) => {
    const clientSales = getClientSales(clientId);
    return clientSales.reduce((sum, sale) => sum + (sale.contract_value || 0), 0);
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
                  <TableHead>Client Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => openClientDetail(client)}
                  >
                    <TableCell className="font-medium">{client.contact_name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{client.email || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-500">{client.phone || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-500">{client.address || '—'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        client.status === 'archived' ? 'bg-slate-100 text-slate-700' :
                        client.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {client.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(client)}>
                            Edit Client
                          </DropdownMenuItem>
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
            <div>
              <Label>Client Name *</Label>
              <Input
                value={clientForm.contact_name}
                onChange={(e) => setClientForm({...clientForm, contact_name: e.target.value})}
                placeholder="John and Jane Smith"
                required
              />
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

      {/* Edit Client Dialog */}
      <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateClient} className="space-y-4">
            <div>
              <Label>Client Name *</Label>
              <Input
                value={clientForm.contact_name}
                onChange={(e) => setClientForm({...clientForm, contact_name: e.target.value})}
                placeholder="John and Jane Smith"
                required
              />
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
              <Button type="button" variant="outline" onClick={() => setEditClientDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600">
                Update Client
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client Detail Dialog */}
      <Dialog open={clientDetailDialogOpen} onOpenChange={setClientDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              {/* Client Info Card */}
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedClient.contact_name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Lifetime Value</p>
                      <p className="text-3xl font-bold text-amber-600">
                        ${(calculateLifetimeValue(selectedClient.id) / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {selectedClient.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">{selectedClient.email}</span>
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">{selectedClient.phone}</span>
                      </div>
                    )}
                    {selectedClient.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">{selectedClient.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sales History */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Sales History</h4>
                {getClientSales(selectedClient.id).length > 0 ? (
                  <div className="space-y-3">
                    {getClientSales(selectedClient.id).map(sale => (
                      <Card key={sale.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-semibold text-slate-900">{sale.title}</h5>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  sale.status === 'closed_won' ? 'bg-green-100 text-green-700' :
                                  sale.status === 'closed_lost' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {sale.status.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {sale.sale_type === 'preconstruction' ? 'Pre-Construction' : 'Construction'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">
                                ${(sale.contract_value / 1000).toFixed(0)}k
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(sale.created_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-slate-500">No sales history yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => {
                          setClientDetailDialogOpen(false);
                          openLeadDialog(selectedClient);
                        }}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Create Lead
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setClientDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lead for {selectedClient?.contact_name}</DialogTitle>
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