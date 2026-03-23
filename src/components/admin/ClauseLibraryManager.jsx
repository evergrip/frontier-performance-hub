import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Zap, Copy } from 'lucide-react';
import { toast } from 'sonner';
import ClauseFormDialog from './ClauseFormDialog';

const SECTIONS = [
  'Site & Zoning Analysis',
  'Structural & Building Condition',
  'Utility & Service Assessment',
  'Budget Analysis',
  'Regulatory & Permit Pathway',
  'Risk Assessment',
  'Recommendations & Next Steps'
];

export default function ClauseLibraryManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClause, setEditingClause] = useState(null);

  const { data: clauses = [], isLoading } = useQuery({
    queryKey: ['all-feasibility-clauses'],
    queryFn: () => base44.entities.FeasibilityClause.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FeasibilityClause.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-feasibility-clauses']);
      queryClient.invalidateQueries(['feasibility-clauses']);
      setDialogOpen(false);
      setEditingClause(null);
      toast.success('Clause created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeasibilityClause.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-feasibility-clauses']);
      queryClient.invalidateQueries(['feasibility-clauses']);
      setDialogOpen(false);
      setEditingClause(null);
      toast.success('Clause updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FeasibilityClause.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-feasibility-clauses']);
      queryClient.invalidateQueries(['feasibility-clauses']);
      toast.success('Clause deleted');
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (clause) => {
      const { id, created_date, updated_date, created_by, ...rest } = clause;
      return base44.entities.FeasibilityClause.create({
        ...rest,
        clause_id: `${rest.clause_id}-COPY`,
        title: `${rest.title} (Copy)`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-feasibility-clauses']);
      toast.success('Clause duplicated');
    }
  });

  const handleSave = (formData) => {
    if (editingClause) {
      updateMutation.mutate({ id: editingClause.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = useMemo(() => {
    return clauses.filter(c => {
      if (filterSection !== 'all' && c.section !== filterSection) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.title?.toLowerCase().includes(q) || c.clause_id?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [clauses, search, filterSection]);

  const groupedBySection = useMemo(() => {
    const groups = {};
    filtered.forEach(c => {
      if (!groups[c.section]) groups[c.section] = [];
      groups[c.section].push(c);
    });
    return groups;
  }, [filtered]);

  const clauseMap = useMemo(() => Object.fromEntries(clauses.map(c => [c.id, c])), [clauses]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search clauses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingClause(null); setDialogOpen(true); }} className="gap-2 ml-auto">
          <Plus className="w-4 h-4" /> New Clause
        </Button>
      </div>

      <p className="text-sm text-slate-500">{clauses.length} clauses total · {clauses.filter(c => c.is_active).length} active</p>

      {Object.entries(groupedBySection).map(([section, sectionClauses]) => (
        <div key={section}>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 px-1">{section}</h3>
          <div className="space-y-2">
            {sectionClauses.map(clause => (
              <Card key={clause.id} className={!clause.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">{clause.clause_id}</span>
                        <h4 className="text-sm font-medium text-slate-900">{clause.title}</h4>
                        {!clause.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        {clause.risk_level && (
                          <Badge variant="outline" className={`text-xs ${clause.risk_level === 'High' ? 'border-red-300 text-red-600' : clause.risk_level === 'Medium' ? 'border-amber-300 text-amber-600' : 'border-green-300 text-green-600'}`}>
                            {clause.risk_level}
                          </Badge>
                        )}
                        {clause.default_include && <Badge className="text-xs bg-blue-100 text-blue-700 border-0">Default</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{clause.template_body}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span>{(clause.input_fields || []).length} input fields</span>
                        {(clause.triggers || []).length > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Zap className="w-3 h-3" /> {clause.triggers.length} trigger{clause.triggers.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {/* Show trigger targets */}
                      {(clause.triggers || []).map((t, i) => (
                        <div key={i} className="mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-flex items-center gap-1 mr-1">
                          <Zap className="w-3 h-3" />
                          {t.condition_type === 'clause_selected' ? 'When selected' : `When ${t.field_key} = "${t.field_value}"`}
                          {' → requires '}
                          {(t.target_clause_ids || []).map(id => clauseMap[id]?.title || 'Unknown').join(', ')}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateMutation.mutate(clause)}>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingClause(clause); setDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm(`Delete clause "${clause.title}"?`)) deleteMutation.mutate(clause.id); }}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">No clauses found</p>
        </div>
      )}

      <ClauseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clause={editingClause}
        allClauses={clauses}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}