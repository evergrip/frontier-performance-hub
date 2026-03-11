import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getFiscalYearLabel } from '@/components/utils/fiscalYear';

export default function SubAllocationDialog({ open, onOpenChange, entity, entityType, companySettings }) {
  const queryClient = useQueryClient();
  const fiscalStartMonth = companySettings?.fiscal_year_start_month || 1;
  const isProject = entityType === 'project';

  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [allocations, setAllocations] = useState([]);

  const revenueAllocations = useMemo(() => {
    if (!entity) return [];
    return entity.monthly_revenue_allocations || [];
  }, [entity]);

  useEffect(() => {
    if (!entity || !open) return;

    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    const currentFY = fiscalStartMonth === 1 ? cy : (cm >= fiscalStartMonth ? cy + 1 : cy);
    setSelectedFiscalYear(currentFY);

    // Build slots from existing revenue allocations (only months that have revenue)
    const existingSubs = entity.monthly_sub_allocations || [];
    
    // Get all months that have revenue allocations
    const revenueMonths = revenueAllocations.filter(a => a.year && a.month && (Number(a.percentage) || 0) > 0);
    
    const slots = revenueMonths.map(rm => {
      const existing = existingSubs.find(s => Number(s.year) === Number(rm.year) && Number(s.month) === Number(rm.month));
      return {
        year: Number(rm.year),
        month: Number(rm.month),
        sub_percentage: existing ? Number(existing.sub_percentage) || 0 : 0,
      };
    });

    setAllocations(slots);
  }, [entity, open, fiscalStartMonth, revenueAllocations]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const clean = allocations
        .filter(a => a.sub_percentage > 0)
        .map(a => ({
          year: a.year,
          month: a.month,
          period: `${a.year}-${String(a.month).padStart(2, '0')}`,
          sub_percentage: Number(a.sub_percentage),
        }));
      if (isProject) {
        return base44.entities.Project.update(entity.id, { monthly_sub_allocations: clean });
      } else {
        return base44.entities.Sale.update(entity.id, { monthly_sub_allocations: clean });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries([isProject ? 'projects' : 'sales']);
      onOpenChange(false);
      toast.success('Sub/In-house allocations saved');
    }
  });

  if (!entity) return null;

  const handleFYChange = (value) => setSelectedFiscalYear(parseInt(value));

  const visibleAllocations = allocations
    .filter(alloc => {
      if (fiscalStartMonth === 1) return alloc.year === selectedFiscalYear;
      return (alloc.month >= fiscalStartMonth && alloc.year === selectedFiscalYear - 1) ||
             (alloc.month < fiscalStartMonth && alloc.year === selectedFiscalYear);
    })
    .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);

  const contractValue = isProject ? (entity.contract_value || 0) : (entity.estimated_construction_budget || 0);

  const applyToAll = (value) => {
    const visibleKeys = new Set(visibleAllocations.map(a => `${a.year}-${a.month}`));
    setAllocations(prev => prev.map(a => 
      visibleKeys.has(`${a.year}-${a.month}`) ? { ...a, sub_percentage: value } : a
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sub vs In-House Split — {entity.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-600">
              Set what % of each month's revenue goes to <span className="font-semibold text-orange-700">Subs</span>. 
              The remainder is <span className="font-semibold text-blue-700">In-House</span>.
            </p>
            {contractValue > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {isProject ? 'Contract' : 'Est. Construction'} Value: <span className="font-semibold">${contractValue.toLocaleString()}</span>
              </p>
            )}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs mb-1">Fiscal Year</Label>
              <Select value={selectedFiscalYear?.toString()} onValueChange={handleFYChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(selectedFiscalYear - 1).toString()}>{getFiscalYearLabel(selectedFiscalYear - 1, fiscalStartMonth)}</SelectItem>
                  <SelectItem value={selectedFiscalYear?.toString()}>{getFiscalYearLabel(selectedFiscalYear, fiscalStartMonth, true)}</SelectItem>
                  <SelectItem value={(selectedFiscalYear + 1).toString()}>{getFiscalYearLabel(selectedFiscalYear + 1, fiscalStartMonth)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => applyToAll(0)}>All In-House</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => applyToAll(50)}>50/50</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => applyToAll(100)}>All Subs</Button>
            </div>
          </div>

          {visibleAllocations.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg border">
              No revenue allocated for this fiscal year. Set revenue allocations first.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
              {visibleAllocations.map((alloc) => {
                const monthName = new Date(alloc.year, alloc.month - 1).toLocaleString('default', { month: 'short' });
                const inHouse = 100 - (alloc.sub_percentage || 0);
                return (
                  <div key={`${alloc.year}-${alloc.month}`}>
                    <label className="text-xs text-slate-600">{monthName} {alloc.year}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={alloc.sub_percentage}
                      onChange={(e) => setAllocations(allocations.map(a =>
                        a.month === alloc.month && a.year === alloc.year
                          ? { ...a, sub_percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }
                          : a
                      ))}
                      className="w-full px-2 py-1 border rounded text-xs"
                      placeholder="0"
                    />
                    <div className="flex text-[10px] mt-0.5 gap-1">
                      <span className="text-orange-600">{alloc.sub_percentage || 0}% sub</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-blue-600">{inHouse}% in-house</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save Split
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}