import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import DataInspector from '../common/DataInspector';

export default function MetricDrilldownDialog({ 
  open, 
  onOpenChange, 
  metricKey, 
  sales, 
  projects, 
  leads, 
  clients,
  dateRange,
  getSaleEffectiveDate,
  getProjectEffectiveDate
}) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorEntity, setInspectorEntity] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      try { const u = await base44.auth.me(); setIsAdmin(u?.role === 'admin'); } catch {}
    };
    check();
  }, []);

  const openInspector = (entityType, entityData) => {
    if (!isAdmin) return;
    const related = [];
    if (entityType === 'Project' && entityData.sale_id) {
      const sale = sales.find(s => s.id === entityData.sale_id);
      related.push({ label: 'Linked Sale', data: sale });
      if (sale?.client_id) related.push({ label: 'Client', data: clients.find(c => c.id === sale.client_id) });
    }
    if (entityType === 'Sale') {
      if (entityData.client_id) related.push({ label: 'Client', data: clients.find(c => c.id === entityData.client_id) });
      if (entityData.lead_id) related.push({ label: 'Lead', data: leads.find(l => l.id === entityData.lead_id) });
    }
    if (entityType === 'Lead' && entityData.client_id) {
      related.push({ label: 'Client', data: clients.find(c => c.id === entityData.client_id) });
    }
    setInspectorEntity({ type: entityType, id: entityData.id, data: entityData, related });
    setInspectorOpen(true);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || 'Unknown';
  };

  const config = useMemo(() => {
    switch (metricKey) {
      case 'constructionRevenue': {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const closedConstruction = projects
          .filter(p => p.project_type === 'construction' && p.status === 'closed')
          .filter(p => {
            if (!dateRange.start || !dateRange.end) return true;
            const d = getProjectEffectiveDate(p);
            return d >= dateRange.start && d <= dateRange.end;
          })
          .sort((a, b) => new Date(b.actual_completion_date || b.created_date) - new Date(a.actual_completion_date || a.created_date));

        // Active projects with recognized revenue from past months within the date range
        const activeWithRevenue = projects
          .filter(p => 
            p.project_type === 'construction' && 
            ['active_construction', 'substantial_completion_closeout'].includes(p.status) &&
            p.monthly_revenue_allocations?.length > 0
          )
          .map(p => {
            const revenueBase = p.actual_costs || p.contract_value || 0;
            const pastAllocations = (p.monthly_revenue_allocations || []).filter(a => {
              let aYear = a.year;
              let aMonth = a.month;
              if (!aYear && a.period) {
                const parts = a.period.split('-');
                aYear = parseInt(parts[0]);
                aMonth = parseInt(parts[1]);
              }
              if (!aYear || !aMonth) return false;
              
              // Must be strictly before the current month
              const isPast = (aYear < currentYear) || (aYear === currentYear && aMonth < currentMonth);
              if (!isPast) return false;
              
              // Must fall within the selected date range
              if (dateRange.start && dateRange.end) {
                const allocDate = new Date(aYear, aMonth - 1, 1);
                if (allocDate < dateRange.start || allocDate > dateRange.end) return false;
              }
              return true;
            });
            const pastPercent = pastAllocations.reduce((s, a) => s + (a.percentage || 0), 0);
            const recognizedRevenue = revenueBase * pastPercent / 100;
            return { ...p, _recognizedRevenue: recognizedRevenue, _recognizedPercent: pastPercent };
          })
          .filter(p => p._recognizedRevenue > 0);

        const closedTotal = closedConstruction.reduce((s, p) => s + (p.actual_costs || p.contract_value || 0), 0);
        const activeTotal = activeWithRevenue.reduce((s, p) => s + p._recognizedRevenue, 0);

        const monthlyData = dateRange.start && dateRange.end ? eachMonthOfInterval({ start: dateRange.start, end: dateRange.end }).map(month => {
          const mStart = startOfMonth(month);
          const mEnd = endOfMonth(month);
          const monthRevenue = closedConstruction
            .filter(p => { const d = getProjectEffectiveDate(p); return d >= mStart && d <= mEnd; })
            .reduce((sum, p) => sum + (p.actual_costs || p.contract_value || 0), 0);
          return { month: format(month, 'MMM yy'), revenue: monthRevenue / 1000 };
        }) : [];

        // Combine closed and active items with a _source tag
        const allItems = [
          ...closedConstruction.map(p => ({ ...p, _source: 'closed', _displayRevenue: p.actual_costs || p.contract_value || 0 })),
          ...activeWithRevenue.map(p => ({ ...p, _source: 'active', _displayRevenue: p._recognizedRevenue })),
        ];

        return {
          title: 'Construction Revenue Breakdown',
          items: allItems,
          columns: ['Project', 'Client', 'Status', 'Contract Value', 'Recognized Revenue', 'Margin', 'Closed Date'],
          renderRow: (p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.title}</TableCell>
              <TableCell>{getClientName(p.client_id)}</TableCell>
              <TableCell>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${p._source === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {p._source === 'closed' ? 'Closed' : (p.status || '').replace(/_/g, ' ')}
                </span>
              </TableCell>
              <TableCell>${((p.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
              <TableCell className="font-semibold">
                ${((p._displayRevenue || 0) / 1000).toFixed(0)}K
                {p._source === 'active' && p._recognizedPercent != null && (
                  <span className="text-xs text-slate-500 ml-1">({p._recognizedPercent.toFixed(0)}%)</span>
                )}
              </TableCell>
              <TableCell>{(p.actual_margin || 0).toFixed(1)}%</TableCell>
              <TableCell>{p.actual_completion_date ? format(new Date(p.actual_completion_date), 'MMM d, yyyy') : '-'}</TableCell>
            </TableRow>
          ),
          total: closedTotal + activeTotal,
          _closedTotal: closedTotal,
          _activeTotal: activeTotal,
          _activeCount: activeWithRevenue.length,
          _closedCount: closedConstruction.length,
          monthlyData,
          chartLabel: 'Revenue ($K)'
        };
      }

      case 'preconRevenue': {
        const closedPrecon = sales
          .filter(s => s.sale_type === 'preconstruction' && s.status === 'closed_won')
          .filter(s => {
            if (!dateRange.start || !dateRange.end) return true;
            const d = getSaleEffectiveDate(s);
            return d >= dateRange.start && d <= dateRange.end;
          })
          .sort((a, b) => new Date(b.close_date || b.created_date) - new Date(a.close_date || a.created_date));

        const monthlyData = dateRange.start && dateRange.end ? eachMonthOfInterval({ start: dateRange.start, end: dateRange.end }).map(month => {
          const mStart = startOfMonth(month);
          const mEnd = endOfMonth(month);
          const monthRevenue = closedPrecon
            .filter(s => { const d = getSaleEffectiveDate(s); return d >= mStart && d <= mEnd; })
            .reduce((sum, s) => sum + (s.contract_value || 0), 0);
          return { month: format(month, 'MMM yy'), revenue: monthRevenue / 1000 };
        }) : [];

        return {
          title: 'Pre-Construction Revenue Breakdown',
          items: closedPrecon,
          columns: ['Sale', 'Client', 'Contract Value', 'Close Date'],
          renderRow: (s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.title}</TableCell>
              <TableCell>{getClientName(s.client_id)}</TableCell>
              <TableCell className="font-semibold">${((s.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
              <TableCell>{s.close_date ? format(new Date(s.close_date), 'MMM d, yyyy') : '-'}</TableCell>
            </TableRow>
          ),
          total: closedPrecon.reduce((s, sale) => s + (sale.contract_value || 0), 0),
          monthlyData,
          chartLabel: 'Revenue ($K)'
        };
      }

      case 'totalRevenue': {
        const closedPrecon = sales.filter(s => s.sale_type === 'preconstruction' && s.status === 'closed_won')
          .filter(s => { if (!dateRange.start || !dateRange.end) return true; const d = getSaleEffectiveDate(s); return d >= dateRange.start && d <= dateRange.end; });
        const closedConstruction = projects.filter(p => p.project_type === 'construction' && p.status === 'closed')
          .filter(p => { if (!dateRange.start || !dateRange.end) return true; const d = getProjectEffectiveDate(p); return d >= dateRange.start && d <= dateRange.end; });

        const monthlyData = dateRange.start && dateRange.end ? eachMonthOfInterval({ start: dateRange.start, end: dateRange.end }).map(month => {
          const mStart = startOfMonth(month);
          const mEnd = endOfMonth(month);
          const precon = closedPrecon.filter(s => { const d = getSaleEffectiveDate(s); return d >= mStart && d <= mEnd; }).reduce((sum, s) => sum + (s.contract_value || 0), 0);
          const constr = closedConstruction.filter(p => { const d = getProjectEffectiveDate(p); return d >= mStart && d <= mEnd; }).reduce((sum, p) => sum + (p.actual_costs || p.contract_value || 0), 0);
          return { month: format(month, 'MMM yy'), precon: precon / 1000, construction: constr / 1000 };
        }) : [];

        const allItems = [
          ...closedPrecon.map(s => ({ ...s, _type: 'precon', _revenue: s.contract_value || 0, _date: getSaleEffectiveDate(s) })),
          ...closedConstruction.map(p => ({ ...p, _type: 'construction', _revenue: p.actual_costs || p.contract_value || 0, _date: getProjectEffectiveDate(p) }))
        ].sort((a, b) => b._date - a._date);

        return {
          title: 'Total Revenue Breakdown',
          items: allItems,
          columns: ['Name', 'Type', 'Client', 'Revenue', 'Date'],
          renderRow: (item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item._type === 'precon' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {item._type === 'precon' ? 'Pre-Con' : 'Construction'}
                </span>
              </TableCell>
              <TableCell>{getClientName(item.client_id)}</TableCell>
              <TableCell className="font-semibold">${(item._revenue / 1000).toFixed(0)}K</TableCell>
              <TableCell>{format(item._date, 'MMM d, yyyy')}</TableCell>
            </TableRow>
          ),
          total: allItems.reduce((s, i) => s + i._revenue, 0),
          monthlyData,
          chartLabel: 'Revenue ($K)',
          stackedChart: true
        };
      }

      case 'activeProjects': {
        const active = projects.filter(p => !['closed'].includes(p.status));
        return {
          title: 'Active Projects',
          items: active,
          columns: ['Project', 'Client', 'Status', 'Contract Value', 'Start Date'],
          renderRow: (p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.title}</TableCell>
              <TableCell>{getClientName(p.client_id)}</TableCell>
              <TableCell><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{(p.status || '').replace(/_/g, ' ')}</span></TableCell>
              <TableCell>${((p.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
              <TableCell>{p.start_date ? format(new Date(p.start_date), 'MMM d, yyyy') : '-'}</TableCell>
            </TableRow>
          ),
          total: active.reduce((s, p) => s + (p.contract_value || 0), 0)
        };
      }

      case 'activeSales': {
        const active = sales.filter(s => ['feasibility', 'design_material_selections', 'engineering_permits', 'pending_construction_sale'].includes(s.status));
        return {
          title: 'Active Pre-Construction Sales',
          items: active,
          columns: ['Sale', 'Client', 'Status', 'Contract Value', 'Est. Construction'],
          renderRow: (s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.title}</TableCell>
              <TableCell>{getClientName(s.client_id)}</TableCell>
              <TableCell><span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{(s.status || '').replace(/_/g, ' ')}</span></TableCell>
              <TableCell>${((s.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
              <TableCell>${((s.estimated_construction_budget || 0) / 1000).toFixed(0)}K</TableCell>
            </TableRow>
          ),
          total: active.reduce((s, sale) => s + (sale.contract_value || 0), 0)
        };
      }

      case 'activeLeads': {
        const active = leads.filter(l => !['converted', 'disqualified'].includes(l.status));
        return {
          title: 'Active Leads',
          items: active,
          columns: ['Lead', 'Client', 'Status', 'Source', 'Est. Precon Value'],
          renderRow: (l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.title}</TableCell>
              <TableCell>{getClientName(l.client_id)}</TableCell>
              <TableCell><span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{(l.status || '').replace(/_/g, ' ')}</span></TableCell>
              <TableCell className="capitalize">{(l.source || '').replace(/_/g, ' ')}</TableCell>
              <TableCell>${((l.estimated_precon_value || 0) / 1000).toFixed(0)}K</TableCell>
            </TableRow>
          ),
          total: null
        };
      }

      case 'grossProfit': {
        const closedP = projects.filter(p => p.status === 'closed')
          .filter(p => { if (!dateRange.start || !dateRange.end) return true; const d = getProjectEffectiveDate(p); return d >= dateRange.start && d <= dateRange.end; })
          .sort((a, b) => new Date(b.actual_completion_date || b.created_date) - new Date(a.actual_completion_date || a.created_date));

        return {
          title: 'Gross Profit by Project',
          items: closedP,
          columns: ['Project', 'Client', 'Contract Value', 'Margin %', 'Gross Profit'],
          renderRow: (p) => {
            const profit = (p.contract_value || 0) * ((p.actual_margin || 0) / 100);
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{getClientName(p.client_id)}</TableCell>
                <TableCell>${((p.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
                <TableCell className={p.actual_margin >= 20 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>{(p.actual_margin || 0).toFixed(1)}%</TableCell>
                <TableCell className="font-semibold">${(profit / 1000).toFixed(0)}K</TableCell>
              </TableRow>
            );
          },
          total: closedP.reduce((s, p) => s + (p.contract_value || 0) * ((p.actual_margin || 0) / 100), 0)
        };
      }

      case 'margins': {
        const closedP = projects.filter(p => p.status === 'closed')
          .filter(p => { if (!dateRange.start || !dateRange.end) return true; const d = getProjectEffectiveDate(p); return d >= dateRange.start && d <= dateRange.end; })
          .sort((a, b) => (b.actual_margin || 0) - (a.actual_margin || 0));

        return {
          title: 'Margin by Project',
          items: closedP,
          columns: ['Project', 'Client', 'Contract Value', 'Actual Costs', 'Margin %'],
          renderRow: (p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.title}</TableCell>
              <TableCell>{getClientName(p.client_id)}</TableCell>
              <TableCell>${((p.contract_value || 0) / 1000).toFixed(0)}K</TableCell>
              <TableCell>${((p.actual_costs || 0) / 1000).toFixed(0)}K</TableCell>
              <TableCell className={`font-semibold ${(p.actual_margin || 0) >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{(p.actual_margin || 0).toFixed(1)}%</TableCell>
            </TableRow>
          ),
          total: null
        };
      }

      case 'conversionRate': {
        const filteredL = leads.filter(l => {
          if (!dateRange.start || !dateRange.end) return true;
          return new Date(l.created_date) >= dateRange.start && new Date(l.created_date) <= dateRange.end;
        });
        const resolved = filteredL.filter(l => ['converted', 'disqualified'].includes(l.status));
        return {
          title: 'Lead Conversion Details',
          items: resolved,
          columns: ['Lead', 'Client', 'Status', 'Source', 'Created'],
          renderRow: (l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.title}</TableCell>
              <TableCell>{getClientName(l.client_id)}</TableCell>
              <TableCell>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${l.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {l.status === 'converted' ? 'Converted' : 'Disqualified'}
                </span>
              </TableCell>
              <TableCell className="capitalize">{(l.source || '').replace(/_/g, ' ')}</TableCell>
              <TableCell>{format(new Date(l.created_date), 'MMM d, yyyy')}</TableCell>
            </TableRow>
          ),
          total: null
        };
      }

      case 'winRate': {
        const filteredL = leads.filter(l => {
          if (!dateRange.start || !dateRange.end) return true;
          return new Date(l.created_date) >= dateRange.start && new Date(l.created_date) <= dateRange.end;
        });
        const proposals = filteredL.filter(l => (l.status_history || []).some(h => h.status === 'preconstruction_proposal'));
        return {
          title: 'Win Rate Details (After Proposal)',
          items: proposals,
          columns: ['Lead', 'Client', 'Status', 'Source', 'Created'],
          renderRow: (l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.title}</TableCell>
              <TableCell>{getClientName(l.client_id)}</TableCell>
              <TableCell>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${l.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : l.status === 'disqualified' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {l.status === 'converted' ? 'Won' : l.status === 'disqualified' ? 'Lost' : 'Active'}
                </span>
              </TableCell>
              <TableCell className="capitalize">{(l.source || '').replace(/_/g, ' ')}</TableCell>
              <TableCell>{format(new Date(l.created_date), 'MMM d, yyyy')}</TableCell>
            </TableRow>
          ),
          total: null
        };
      }

      default:
        return null;
    }
  }, [metricKey, sales, projects, leads, clients, dateRange]);

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        {config.total !== null && config.total !== undefined && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200 mb-2">
            <p className="text-sm text-slate-600">Total</p>
            <p className="text-3xl font-bold text-slate-900">${(config.total / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-500">{config.items.length} items</p>
            {config._closedTotal != null && (
              <div className="flex gap-4 mt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Closed: ${(config._closedTotal / 1000).toFixed(0)}K ({config._closedCount} projects)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Active recognized: ${(config._activeTotal / 1000).toFixed(0)}K ({config._activeCount} projects)
                </span>
              </div>
            )}
          </div>
        )}

        {config.monthlyData?.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-slate-600 mb-3">Monthly Breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={config.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `$${value.toFixed(0)}K`} />
                  {config.stackedChart ? (
                    <>
                      <Bar dataKey="precon" stackId="a" fill="#3B82F6" name="Pre-Con ($K)" />
                      <Bar dataKey="construction" stackId="a" fill="#10B981" name="Construction ($K)" />
                    </>
                  ) : (
                    <Bar dataKey="revenue" fill="#F59E0B" name={config.chartLabel} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {config.items.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            {isAdmin && <p className="text-[10px] text-blue-400 px-3 pt-2">Admin: Click any row to inspect source data</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  {config.columns.map(col => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.items.map(item => {
                  const entityType = item.project_type ? 'Project' : item.sale_type ? 'Sale' : item.lead_score !== undefined ? 'Lead' : item._type === 'precon' ? 'Sale' : item._type === 'construction' ? 'Project' : 'Project';
                  return (
                    <tr
                      key={item.id}
                      className={isAdmin ? 'cursor-pointer hover:bg-blue-50' : ''}
                      onClick={() => openInspector(entityType, item)}
                    >
                      {React.Children.map(config.renderRow(item).props.children, child => child)}
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-slate-400 py-8">No data for selected period</p>
        )}

        {/* Data Inspector */}
        {inspectorEntity && (
          <DataInspector
            open={inspectorOpen}
            onOpenChange={setInspectorOpen}
            entityType={inspectorEntity.type}
            entityId={inspectorEntity.id}
            entityData={inspectorEntity.data}
            relatedData={inspectorEntity.related}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}