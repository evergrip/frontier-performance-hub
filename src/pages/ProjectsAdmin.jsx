import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectsAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedProjects, setEditedProjects] = useState({});
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      if (user?.role !== 'admin') {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings[0];
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    }
  });

  const handleFieldChange = (projectId, field, value) => {
    setEditedProjects(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [field]: value
      }
    }));
  };

  const handleSave = async (projectId) => {
    const edits = editedProjects[projectId];
    if (!edits) return;

    const updateData = {};
    if (edits.contract_value !== undefined) updateData.contract_value = parseFloat(edits.contract_value);
    if (edits.actual_costs !== undefined) updateData.actual_costs = parseFloat(edits.actual_costs);
    if (edits.actual_margin !== undefined) updateData.actual_margin = parseFloat(edits.actual_margin);
    if (edits.status !== undefined) updateData.status = edits.status;
    if (edits.crew_assignment !== undefined) updateData.crew_assignment = edits.crew_assignment;
    if (edits.client_id !== undefined) updateData.client_id = edits.client_id;
    if (edits.fiscal_year !== undefined) {
      // Regenerate monthly allocations for the new fiscal year
      const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
      const allocations = [];
      for (let i = 0; i < 12; i++) {
        const month = ((fiscalStartMonth - 1 + i) % 12) + 1;
        const year = month < fiscalStartMonth ? parseInt(edits.fiscal_year) + 1 : parseInt(edits.fiscal_year);
        allocations.push({ year, month, percentage: 0 });
      }
      updateData.monthly_revenue_allocations = allocations;
    }

    await updateProjectMutation.mutateAsync({ id: projectId, data: updateData });
    
    setEditedProjects(prev => {
      const newEdits = { ...prev };
      delete newEdits[projectId];
      return newEdits;
    });
    
    toast.success('Project updated');
  };

  const handleSaveAll = async () => {
    const promises = Object.keys(editedProjects).map(projectId => {
      return handleSave(projectId);
    });
    await Promise.all(promises);
    toast.success('All changes saved');
  };

  const filteredProjects = projects.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayValue = (project, field) => {
    if (field === 'fiscal_year') {
      // Extract fiscal year from monthly_revenue_allocations
      if (editedProjects[project.id]?.[field]) {
        return editedProjects[project.id][field];
      }
      const allocations = project.monthly_revenue_allocations;
      if (allocations && allocations.length > 0) {
        const firstAllocation = allocations[0];
        const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
        // If the first month is before the fiscal start month, it's the previous year
        return firstAllocation.month < fiscalStartMonth ? firstAllocation.year - 1 : firstAllocation.year;
      }
      return '';
    }
    return editedProjects[project.id]?.[field] ?? project[field] ?? '';
  };

  const hasEdits = Object.keys(editedProjects).length > 0;

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Projects Bulk Editor</h2>
          <p className="text-sm text-slate-500">Edit multiple projects at once</p>
        </div>
        {hasEdits && (
          <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Save All ({Object.keys(editedProjects).length})
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Project</TableHead>
                  <TableHead className="w-[150px]">Client</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Crew</TableHead>
                  <TableHead className="w-[100px]">Fiscal Year</TableHead>
                  <TableHead className="w-[120px]">Contract Value</TableHead>
                  <TableHead className="w-[120px]">Actual Costs</TableHead>
                  <TableHead className="w-[100px]">Margin %</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => {
                  const hasChanges = !!editedProjects[project.id];
                  return (
                    <TableRow key={project.id} className={hasChanges ? 'bg-amber-50' : ''}>
                      <TableCell className="font-medium">{project.title}</TableCell>
                      <TableCell>
                        <Select
                          value={getDisplayValue(project, 'client_id')}
                          onValueChange={(value) => handleFieldChange(project.id, 'client_id', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company_name || client.contact_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={getDisplayValue(project, 'status')}
                          onValueChange={(value) => handleFieldChange(project.id, 'status', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="awaiting_to_be_scheduled">Awaiting</SelectItem>
                            <SelectItem value="mobilization">Mobilization</SelectItem>
                            <SelectItem value="active_construction">Active</SelectItem>
                            <SelectItem value="substantial_completion_closeout">Closeout</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={getDisplayValue(project, 'crew_assignment')}
                          onValueChange={(value) => handleFieldChange(project.id, 'crew_assignment', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <SelectItem value="crew_a">Crew A</SelectItem>
                            <SelectItem value="crew_b">Crew B</SelectItem>
                            <SelectItem value="crew_c">Crew C</SelectItem>
                            <SelectItem value="crew_d">Crew D</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={getDisplayValue(project, 'fiscal_year')?.toString()}
                          onValueChange={(value) => handleFieldChange(project.id, 'fiscal_year', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="FY" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2023">FY 2023</SelectItem>
                            <SelectItem value="2024">FY 2024</SelectItem>
                            <SelectItem value="2025">FY 2025</SelectItem>
                            <SelectItem value="2026">FY 2026</SelectItem>
                            <SelectItem value="2027">FY 2027</SelectItem>
                            <SelectItem value="2028">FY 2028</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={getDisplayValue(project, 'contract_value')}
                          onChange={(e) => handleFieldChange(project.id, 'contract_value', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={getDisplayValue(project, 'actual_costs')}
                          onChange={(e) => handleFieldChange(project.id, 'actual_costs', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={getDisplayValue(project, 'actual_margin')}
                          onChange={(e) => handleFieldChange(project.id, 'actual_margin', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        {hasChanges && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(project.id)}
                            className="h-7 text-xs"
                          >
                            Save
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}