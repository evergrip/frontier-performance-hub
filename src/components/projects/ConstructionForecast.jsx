import React, { useState, useMemo } from 'react'; 
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarRange, Building2, Wrench } from 'lucide-react';

import { getFiscalYearLabel } from '@/components/utils/fiscalYear';

export default function ConstructionForecast({ projects, clients, sales, companySettings, onProjectClick, preconSales, onPreconSaleClick }) {
  const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;

  // Determine current fiscal year
  const defaultFY = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    if (fiscalStartMonth === 1) return cy;
    return cm >= fiscalStartMonth ? cy + 1 : cy;
  }, [fiscalStartMonth]);

  const [selectedFY, setSelectedFY] = useState(defaultFY);

  // Build 12 fiscal month slots for a given FY
  const fiscalMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const m = ((fiscalStartMonth - 1 + i) % 12) + 1;
      const y = fiscalStartMonth === 1 ? selectedFY : (m >= fiscalStartMonth ? selectedFY - 1 : selectedFY);
      const label = new Date(y, m - 1).toLocaleString('default', { month: 'short' }) + ' ' + String(y).slice(-2);
      months.push({ year: y, month: m, label });
    }
    return months;
  }, [selectedFY, fiscalStartMonth]);

  const getClientName = (project) => {
    if (project.client_id) {
      const client = clients.find(c => c.id === project.client_id);
      if (client) return client.company_name || client.contact_name || 'Unknown';
    }
    if (project.sale_id) {
      const sale = sales.find(s => s.id === project.sale_id);
      if (sale?.client_id) {
        const client = clients.find(c => c.id === sale.client_id);
        if (client) return client.company_name || client.contact_name || 'Unknown';
      }
    }
    return 'Unknown Client';
  };

  // Build forecast rows: each project becomes a row with monthly dollar values
  const rows = useMemo(() => {
    const result = [];

    // Construction projects
    projects.forEach(project => {
      const allocations = project.monthly_revenue_allocations || [];
      const subAllocations = project.monthly_sub_allocations || [];
      const contractValue = project.actual_costs || project.contract_value || 0;

      const monthValues = {};
      const monthSubPct = {};
      let hasAnyInFY = false;

      fiscalMonths.forEach(fm => {
        const key = `${fm.year}-${fm.month}`;
        const alloc = allocations.find(a => Number(a.year) === fm.year && Number(a.month) === fm.month);
        const pct = alloc ? Number(alloc.percentage) || 0 : 0;
        const dollarValue = Math.round(contractValue * (pct / 100));
        monthValues[key] = dollarValue;
        if (dollarValue > 0) hasAnyInFY = true;

        const subAlloc = subAllocations.find(a => Number(a.year) === fm.year && Number(a.month) === fm.month);
        monthSubPct[key] = subAlloc ? Number(subAlloc.sub_percentage) || 0 : 0;
      });

      const totalAllocPct = allocations.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);

      result.push({
        projectId: project.id,
        projectName: project.title,
        clientName: getClientName(project),
        contractValue,
        status: project.status,
        monthValues,
        monthSubPct,
        hasAllocations: allocations.length > 0,
        hasAnyInFY,
        isPrecon: false,
        totalAllocPct,
      });
    });

    // Pre-con sales (forecast based on estimated_construction_budget)
    if (preconSales?.length > 0) {
      preconSales.forEach(sale => {
        const allocations = sale.monthly_revenue_allocations || [];
        const subAllocations = sale.monthly_sub_allocations || [];
        const forecastValue = sale.estimated_construction_budget || 0;

        const monthValues = {};
        const monthSubPct = {};
        let hasAnyInFY = false;

        fiscalMonths.forEach(fm => {
          const key = `${fm.year}-${fm.month}`;
          const alloc = allocations.find(a => Number(a.year) === fm.year && Number(a.month) === fm.month);
          const pct = alloc ? Number(alloc.percentage) || 0 : 0;
          const dollarValue = Math.round(forecastValue * (pct / 100));
          monthValues[key] = dollarValue;
          if (dollarValue > 0) hasAnyInFY = true;

          const subAlloc = subAllocations.find(a => Number(a.year) === fm.year && Number(a.month) === fm.month);
          monthSubPct[key] = subAlloc ? Number(subAlloc.sub_percentage) || 0 : 0;
        });

        const client = clients.find(c => c.id === sale.client_id);
        const clientName = client?.company_name || client?.contact_name || 'Unknown Client';

        const totalAllocPct = allocations.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);

        result.push({
          saleId: sale.id,
          projectName: sale.title,
          clientName,
          contractValue: forecastValue,
          status: sale.status,
          monthValues,
          monthSubPct,
          hasAllocations: allocations.length > 0,
          hasAnyInFY,
          isPrecon: true,
          totalAllocPct,
        });
      });
    }

    // Dynamic filter: only show rows that have allocations in the viewed FY OR are not fully allocated
    const filtered = result.filter(row => {
      // Always show if it has revenue in the currently viewed FY
      if (row.hasAnyInFY) return true;
      // Show if not fully allocated (needs attention)
      if (row.totalAllocPct < 99.9) return true;
      // Fully allocated with no activity in this FY — hide
      return false;
    });

    // Sort by stage in specified order, then alphabetically within each stage
    const stageOrder = [
      'substantial_completion_closeout',
      'active_construction',
      'mobilization',
      'awaiting_to_be_scheduled',
      'pending_construction_sale',
      'engineering_permits',
      'design_material_selections',
      'feasibility',
      'closed',
    ];
    filtered.sort((a, b) => {
      const aIdx = stageOrder.indexOf(a.status);
      const bIdx = stageOrder.indexOf(b.status);
      const aOrder = aIdx >= 0 ? aIdx : stageOrder.length;
      const bOrder = bIdx >= 0 ? bIdx : stageOrder.length;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.clientName.localeCompare(b.clientName) || a.projectName.localeCompare(b.projectName);
    });

    return filtered;
  }, [projects, clients, sales, preconSales, fiscalMonths]);

  // Compute monthly totals with sub/in-house breakdown
  const { monthlyTotals, monthlySubTotals, monthlyInHouseTotals } = useMemo(() => {
    const totals = {};
    const subTotals = {};
    const inHouseTotals = {};
    fiscalMonths.forEach(fm => {
      const key = `${fm.year}-${fm.month}`;
      let total = 0, subTotal = 0, inHouseTotal = 0;
      rows.forEach(row => {
        const val = row.monthValues[key] || 0;
        const subPct = row.monthSubPct?.[key] || 0;
        const subVal = Math.round(val * subPct / 100);
        const inHouseVal = val - subVal;
        total += val;
        subTotal += subVal;
        inHouseTotal += inHouseVal;
      });
      totals[key] = total;
      subTotals[key] = subTotal;
      inHouseTotals[key] = inHouseTotal;
    });
    return { monthlyTotals: totals, monthlySubTotals: subTotals, monthlyInHouseTotals: inHouseTotals };
  }, [rows, fiscalMonths]);

  const grandTotal = Object.values(monthlyTotals).reduce((sum, v) => sum + v, 0);
  const grandSubTotal = Object.values(monthlySubTotals).reduce((sum, v) => sum + v, 0);
  const grandInHouseTotal = Object.values(monthlyInHouseTotals).reduce((sum, v) => sum + v, 0);

  const stageLabels = {
    substantial_completion_closeout: { label: 'Substantial Completion & Closeout', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    active_construction: { label: 'Active Construction', color: 'bg-green-100 text-green-800 border-green-300' },
    mobilization: { label: 'Mobilization', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    awaiting_to_be_scheduled: { label: 'Awaiting to be Scheduled', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    pending_construction_sale: { label: 'Pending Construction', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    engineering_permits: { label: 'Engineering & Permits', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    design_material_selections: { label: 'Design & Materials', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    feasibility: { label: 'Feasibility', color: 'bg-sky-100 text-sky-800 border-sky-300' },
    closed: { label: 'Closed Projects', color: 'bg-gray-100 text-gray-600 border-gray-300' },
  };

  // Precompute which stages appear so we can render group headers
  const stageGroupOrder = useMemo(() => {
    const seen = new Set(rows.map(r => r.status));
    return Object.keys(stageLabels).filter(s => seen.has(s));
  }, [rows]);

  const fmt = (val) => val > 0 ? `$${val.toLocaleString()}` : '-';

  const totalCols = 3 + fiscalMonths.length + 1; // project + contract + alloc + months + FY total

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-slate-500" />
          Revenue Forecast
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedFY(f => f - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">
            {getFiscalYearLabel(selectedFY, fiscalStartMonth)}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedFY(f => f + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-20 [&_tr]:border-b">
              <TableRow className="bg-slate-50">
                <TableHead className="sticky left-0 bg-slate-50 z-30 min-w-[200px] text-xs">Project</TableHead>
                <TableHead className="sticky left-[200px] bg-slate-50 z-30 min-w-[80px] text-xs text-right">Contract</TableHead>
                <TableHead className="sticky left-[280px] bg-slate-50 z-30 min-w-[55px] text-xs text-right">Alloc</TableHead>
                {fiscalMonths.map((fm, i) => (
                  <TableHead key={i} className="bg-slate-50 text-right text-xs whitespace-nowrap min-w-[90px]">{fm.label}</TableHead>
                ))}
                <TableHead className="bg-slate-50 text-right text-xs whitespace-nowrap min-w-[100px] font-bold">FY Total</TableHead>
              </TableRow>
            </thead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14 + 1} className="text-center py-8 text-slate-400">
                    No active projects to forecast.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {(() => {
                    let lastStage = null;
                    return rows.map((row) => {
                      const rowTotal = fiscalMonths.reduce((sum, fm) => sum + (row.monthValues[`${fm.year}-${fm.month}`] || 0), 0);
                      const rowKey = row.isPrecon ? `sale-${row.saleId}` : `proj-${row.projectId}`;
                      const handleRowClick = () => {
                        if (row.isPrecon) onPreconSaleClick?.(row.saleId);
                        else onProjectClick?.(row.projectId);
                      };
                      const showHeader = row.status !== lastStage;
                      lastStage = row.status;
                      const stageCfg = stageLabels[row.status] || { label: row.status, color: 'bg-gray-50 text-gray-600 border-gray-200' };
                      // Compute stage subtotal
                      const stageRows = showHeader ? rows.filter(r => r.status === row.status) : [];
                      const stageTotal = showHeader ? stageRows.reduce((sum, r) => sum + fiscalMonths.reduce((s, fm) => s + (r.monthValues[`${fm.year}-${fm.month}`] || 0), 0), 0) : 0;
                      return (
                        <React.Fragment key={rowKey}>
                          {showHeader && (
                            <TableRow className={`border-t-2 ${stageCfg.color}`}>
                              <TableCell colSpan={3} className={`sticky left-0 z-10 ${stageCfg.color} py-1.5 px-4`}>
                                <span className="text-xs font-bold uppercase tracking-wide">{stageCfg.label}</span>
                                <span className="text-[10px] ml-2 opacity-70">({stageRows.length})</span>
                              </TableCell>
                              {fiscalMonths.map((_, i) => (
                                <TableCell key={i} className={`${stageCfg.color} py-1.5`} />
                              ))}
                              <TableCell className={`${stageCfg.color} py-1.5 text-right text-xs font-bold`}>
                                {stageTotal > 0 ? fmt(stageTotal) : ''}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow className={`cursor-pointer hover:bg-slate-50 ${!row.hasAnyInFY ? 'opacity-50' : ''} ${row.isPrecon ? 'border-l-2 border-l-amber-400' : ''}`} onClick={handleRowClick}>
                            <TableCell className="sticky left-0 bg-white z-10 min-w-[200px]">
                              <div className={`text-sm font-medium truncate ${row.isPrecon ? 'text-amber-700 italic' : 'text-slate-900'}`}>{row.clientName}</div>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs truncate ${row.isPrecon ? 'text-amber-500 italic' : 'text-slate-500'}`}>{row.projectName}</span>
                                {row.isPrecon && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">Pre-Con</span>}
                              </div>
                            </TableCell>
                            <TableCell className="sticky left-[200px] bg-white z-10 text-right text-xs font-medium text-slate-700">
                              ${(row.contractValue / 1000).toFixed(0)}k
                            </TableCell>
                            <TableCell className={`sticky left-[280px] bg-white z-10 text-right text-xs font-medium ${row.totalAllocPct >= 99.9 ? 'text-emerald-600' : row.totalAllocPct > 0 ? 'text-amber-600' : 'text-red-400'}`}>
                              {row.totalAllocPct > 0 ? `${row.totalAllocPct.toFixed(0)}%` : '—'}
                            </TableCell>
                            {fiscalMonths.map((fm, i) => {
                              const key = `${fm.year}-${fm.month}`;
                              const val = row.monthValues[key] || 0;
                              const subPct = row.monthSubPct?.[key] || 0;
                              const hasSubSplit = val > 0 && subPct > 0 && subPct < 100;
                              const isAllSub = val > 0 && subPct === 100;
                              return (
                                <TableCell key={i} className={`text-right text-xs ${val > 0 ? 'text-slate-800 font-medium bg-green-50' : 'text-slate-300'}`}>
                                  <div>{fmt(val)}</div>
                                  {val > 0 && subPct > 0 && (
                                    <div className={`text-[9px] ${isAllSub ? 'text-orange-500' : hasSubSplit ? 'text-slate-400' : ''}`}>
                                      {subPct}% sub
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right text-xs font-bold text-slate-900">
                              {fmt(rowTotal)}
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    });
                  })()}

                  {/* In-House Revenue Row */}
                  <TableRow className="bg-blue-50 border-t-2 border-slate-300">
                    <TableCell className="sticky left-0 bg-blue-50 z-10 text-xs font-semibold text-blue-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        In-House Revenue
                      </div>
                    </TableCell>
                    <TableCell className="sticky left-[200px] bg-blue-50 z-10"></TableCell>
                    <TableCell className="sticky left-[280px] bg-blue-50 z-10"></TableCell>
                    {fiscalMonths.map((fm, i) => {
                      const val = monthlyInHouseTotals[`${fm.year}-${fm.month}`] || 0;
                      return (
                        <TableCell key={i} className="text-right text-xs font-semibold text-blue-700 bg-blue-50">
                          {fmt(val)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right text-xs font-bold text-blue-800 bg-blue-50">
                      {fmt(grandInHouseTotal)}
                    </TableCell>
                  </TableRow>

                  {/* Sub Revenue Row */}
                  <TableRow className="bg-orange-50">
                    <TableCell className="sticky left-0 bg-orange-50 z-10 text-xs font-semibold text-orange-800">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        Sub Revenue
                      </div>
                    </TableCell>
                    <TableCell className="sticky left-[200px] bg-orange-50 z-10"></TableCell>
                    <TableCell className="sticky left-[280px] bg-orange-50 z-10"></TableCell>
                    {fiscalMonths.map((fm, i) => {
                      const val = monthlySubTotals[`${fm.year}-${fm.month}`] || 0;
                      return (
                        <TableCell key={i} className="text-right text-xs font-semibold text-orange-700 bg-orange-50">
                          {fmt(val)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right text-xs font-bold text-orange-800 bg-orange-50">
                      {fmt(grandSubTotal)}
                    </TableCell>
                  </TableRow>

                  {/* Monthly Totals Row */}
                  <TableRow className="bg-slate-100">
                    <TableCell className="sticky left-0 bg-slate-100 z-10 font-bold text-sm text-slate-900">
                      Monthly Totals
                    </TableCell>
                    <TableCell className="sticky left-[200px] bg-slate-100 z-10 text-right text-xs font-bold text-slate-700">
                      ${(rows.reduce((s, r) => s + r.contractValue, 0) / 1000).toFixed(0)}k
                    </TableCell>
                    <TableCell className="sticky left-[280px] bg-slate-100 z-10"></TableCell>
                    {fiscalMonths.map((fm, i) => {
                      const key = `${fm.year}-${fm.month}`;
                      const val = monthlyTotals[key] || 0;
                      return (
                        <TableCell key={i} className="text-right text-xs font-bold text-slate-900 bg-slate-100">
                          {fmt(val)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right text-sm font-bold text-slate-900 bg-slate-100">
                      {fmt(grandTotal)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </table>
        </div>
        {rows.some(r => !r.hasAllocations) && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
            Some projects have no revenue allocations yet. Click a project card above, then edit its Revenue Schedule to forecast monthly values.
          </div>
        )}
      </CardContent>
    </Card>
  );
}