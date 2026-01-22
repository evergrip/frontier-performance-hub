import React, { useState } from 'react';
import { format, startOfMonth, addMonths, getMonth, getYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function MonthlyAllocationView({ projects, onSelectMonth, selectedMonth }) {
  const [allocationEdits, setAllocationEdits] = useState({});
  const [startMonth, setStartMonth] = useState(startOfMonth(new Date()));

  const months = Array.from({ length: 12 }, (_, i) => addMonths(startMonth, i));

  const getProjectAllocation = (projectId, month) => {
    const allocation = projects
      .find(p => p.id === projectId)
      ?.monthly_work_allocations?.find(
        a => a.year === getYear(month) && a.month === getMonth(month) + 1
      );
    return allocation?.percentage || 0;
  };

  const getMonthlyTotal = (month) => {
    return projects.reduce((sum, project) => {
      return sum + getProjectAllocation(project.id, month);
    }, 0);
  };

  const getTotalAllocated = (projectId) => {
    return projects
      .find(p => p.id === projectId)
      ?.monthly_work_allocations?.reduce((sum, a) => sum + (a.percentage || 0), 0) || 0;
  };

  const handleAllocationChange = (projectId, month, value) => {
    const key = `${projectId}-${format(month, 'yyyy-MM')}`;
    setAllocationEdits({ ...allocationEdits, [key]: parseFloat(value) || 0 });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setStartMonth(addMonths(startMonth, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setStartMonth(addMonths(startMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <CardTitle>Monthly Work Allocations</CardTitle>
        <div className="w-20" />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 w-48 border-r border-slate-200">
                  Project
                </th>
                {months.map(month => (
                  <th
                    key={format(month, 'yyyy-MM')}
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-900 border-r border-slate-200 w-24"
                  >
                    <div>{format(month, 'MMM')}</div>
                    <div className="text-xs text-slate-500">{format(month, 'yy')}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900 w-20 border-r border-slate-200">
                  Total %
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900 w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 border-r border-slate-200">
                    {project.title}
                  </td>
                  {months.map(month => {
                    const allocation = getProjectAllocation(project.id, month);
                    const key = `${project.id}-${format(month, 'yyyy-MM')}`;
                    const editValue = allocationEdits[key];
                    const displayValue = editValue !== undefined ? editValue : allocation;

                    return (
                      <td
                        key={format(month, 'yyyy-MM')}
                        className="px-4 py-3 text-center text-sm border-r border-slate-200"
                      >
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={displayValue}
                          onChange={(e) => handleAllocationChange(project.id, month, e.target.value)}
                          className="text-center text-sm h-8"
                          placeholder="0"
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900 border-r border-slate-200">
                    {getTotalAllocated(project.id)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      onClick={() => onSelectMonth(project.id)}
                      className="gap-1"
                    >
                      View <ChevronDown className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                <td className="px-4 py-3 text-sm text-slate-900 border-r border-slate-200">
                  Monthly Total
                </td>
                {months.map(month => (
                  <td
                    key={`total-${format(month, 'yyyy-MM')}`}
                    className="px-4 py-3 text-center text-sm text-slate-900 border-r border-slate-200"
                  >
                    {getMonthlyTotal(month)}%
                  </td>
                ))}
                <td colSpan="2" className="px-4 py-3 text-center text-xs text-slate-500">
                  Allocate work by month
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}