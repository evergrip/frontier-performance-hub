import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
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
      const contractValue = project.contract_value || 0;

      const monthValues = {};
      let hasAnyInFY = false;

      fiscalMonths.forEach(fm => {
        const alloc = allocations.find(a => Number(a.year) === fm.year && Number(a.month) === fm.month);
        const pct = alloc ? Number(alloc.percentage) || 0 : 0;
        const dollarValue = Math.round(contractValue * (pct / 100));
        monthValues[`${fm.year}-${fm.month}`] = dollarValue;
        if (dollarValue > 0) hasAnyInFY = true;
      });

      result.push({
        projectId: project.id,
        projectName: project.title,
        clientName: getClientName(project),
        contractValue,
        status: project.status,
        monthValues,
        hasAllocations: allocations.length > 0,
        hasAnyInFY,
        isPrecon: false,
      });
    });

    // Pre-con sales (forecast based on estimated_construction_budget)
    if (preconSales?.length > 0) {
      preconSales.forEach(sale => {
        const allocations = sale.monthly_revenue_allocations || [];
        const forecastValue = sale.estimated_construction_budget || 0;

        const monthValues = {};
        let hasAnyInFY = false;

        fiscalMonths.forEach(fm => {
          const alloc = allocations.find(a => Number(a.year) === fm.year && Number(a.month) === fm.month);
          const pct = alloc ? Number(alloc.percentage) || 0 : 0;
          const dollarValue = Math.round(forecastValue * (pct / 100));
          monthValues[`${fm.year}-${fm.month}`] = dollarValue;
          if (dollarValue > 0) hasAnyInFY = true;
        });

        const client = clients.find(c => c.id === sale.client_id);
        const clientName = client?.company_name || client?.contact_name || 'Unknown Client';

        result.push({
          saleId: sale.id,
          projectName: sale.title,
          clientName,
          contractValue: forecastValue,
          status: sale.status,
          monthValues,
          hasAllocations: allocations.length > 0,
          hasAnyInFY,
          isPrecon: true,
        });
      });
    }

    // Sort: projects with allocations in this FY first, then pre-con last, then by client name
    result.sort((a, b) => {
      if (a.hasAnyInFY && !b.hasAnyInFY) return -1;
      if (!a.hasAnyInFY && b.hasAnyInFY) return 1;
      if (a.isPrecon !== b.isPrecon) return a.isPrecon ? 1 : -1;
      return a.clientName.localeCompare(b.clientName) || a.projectName.localeCompare(b.projectName);
    });

    return result;
  }, [projects, clients, sales, preconSales, fiscalMonths]);

  // Compute monthly totals
  const monthlyTotals = useMemo(() => {
    const totals = {};
    fiscalMonths.forEach(fm => {
      const key = `${fm.year}-${fm.month}`;
      totals[key] = rows.reduce((sum, row) => sum + (row.monthValues[key] || 0), 0);
    });
    return totals;
  }, [rows, fiscalMonths]);

  const grandTotal = Object.values(monthlyTotals).reduce((sum, v) => sum + v, 0);

  const fmt = (val) => val > 0 ? `$${val.toLocaleString()}` : '-';

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-slate-500" />
          Construction Forecast
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="sticky left-0 bg-slate-50 z-10 min-w-[200px] text-xs">Project</TableHead>
                <TableHead className="sticky left-[200px] bg-slate-50 z-10 min-w-[100px] text-xs text-right">Contract</TableHead>
                {fiscalMonths.map((fm, i) => (
                  <TableHead key={i} className="text-right text-xs whitespace-nowrap min-w-[90px]">{fm.label}</TableHead>
                ))}
                <TableHead className="text-right text-xs whitespace-nowrap min-w-[100px] font-bold">FY Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14 + 1} className="text-center py-8 text-slate-400">
                    No active projects to forecast.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((row) => {
                    const rowTotal = fiscalMonths.reduce((sum, fm) => sum + (row.monthValues[`${fm.year}-${fm.month}`] || 0), 0);
                    const rowKey = row.isPrecon ? `sale-${row.saleId}` : `proj-${row.projectId}`;
                    const handleRowClick = () => {
                      if (row.isPrecon) onPreconSaleClick?.(row.saleId);
                      else onProjectClick?.(row.projectId);
                    };
                    return (
                      <TableRow key={rowKey} className={`cursor-pointer hover:bg-slate-50 ${!row.hasAnyInFY ? 'opacity-50' : ''} ${row.isPrecon ? 'border-l-2 border-l-amber-400' : ''}`} onClick={handleRowClick}>
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
                        {fiscalMonths.map((fm, i) => {
                          const val = row.monthValues[`${fm.year}-${fm.month}`] || 0;
                          return (
                            <TableCell key={i} className={`text-right text-xs ${val > 0 ? 'text-slate-800 font-medium bg-green-50' : 'text-slate-300'}`}>
                              {fmt(val)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right text-xs font-bold text-slate-900">
                          {fmt(rowTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Monthly Totals Row */}
                  <TableRow className="bg-slate-100 border-t-2 border-slate-300">
                    <TableCell className="sticky left-0 bg-slate-100 z-10 font-bold text-sm text-slate-900">
                      Monthly Totals
                    </TableCell>
                    <TableCell className="sticky left-[200px] bg-slate-100 z-10 text-right text-xs font-bold text-slate-700">
                      ${(rows.reduce((s, r) => s + r.contractValue, 0) / 1000).toFixed(0)}k
                    </TableCell>
                    {fiscalMonths.map((fm, i) => {
                      const val = monthlyTotals[`${fm.year}-${fm.month}`] || 0;
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
          </Table>
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