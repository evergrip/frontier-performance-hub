import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { getFiscalYearLabel } from '../utils/fiscalYear';

export default function DateRangeSelector({
  selectedDateRangeType, setSelectedDateRangeType,
  selectedMonth, setSelectedMonth,
  selectedYear, setSelectedYear,
  selectedQuarter, setSelectedQuarter,
  customStartDate, setCustomStartDate,
  customEndDate, setCustomEndDate,
  fiscalYear, setFiscalYear,
  fiscalYearStartMonth
}) {
  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-amber-600" />
          <Label className="text-base font-semibold">Date Range</Label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['month', 'quarter', 'fiscal_year', 'custom'].map(type => (
            <Button
              key={type}
              variant={selectedDateRangeType === type ? 'default' : 'outline'}
              onClick={() => setSelectedDateRangeType(type)}
              className={selectedDateRangeType === type ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              {type === 'fiscal_year' ? 'Fiscal Year' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        {selectedDateRangeType === 'month' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs">Month</Label>
              <Input type="number" min="1" max="12" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Input type="number" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} />
            </div>
          </div>
        )}

        {selectedDateRangeType === 'quarter' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs">Quarter</Label>
              <Input type="number" min="1" max="4" value={selectedQuarter} onChange={(e) => setSelectedQuarter(parseInt(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Input type="number" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} />
            </div>
          </div>
        )}

        {selectedDateRangeType === 'fiscal_year' && (
          <div className="mt-3">
            <Label className="text-xs">Fiscal Year</Label>
            <Input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(parseInt(e.target.value))} />
            <p className="text-xs text-slate-500 mt-1">
              {getFiscalYearLabel(fiscalYear, fiscalYearStartMonth, true)}
            </p>
          </div>
        )}

        {selectedDateRangeType === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}