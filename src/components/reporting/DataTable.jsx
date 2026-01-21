import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/components/utils/formatters';

export default function DataTable({ data, fields, onRowClick }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      
      const comparison = aVal > bVal ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const formatValue = (value, fieldName) => {
    if (value === null || value === undefined) return '-';
    
    if (typeof value === 'number' && (fieldName.includes('value') || fieldName.includes('amount') || fieldName.includes('revenue') || fieldName.includes('cost'))) {
      return formatCurrency(value);
    }
    
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString();
    }
    
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    
    if (typeof value === 'object') {
      return '[Object]';
    }
    
    return String(value);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4" />
      : <ArrowDown className="w-4 h-4" />;
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No data to display. Adjust your filters or date range.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white overflow-auto max-h-[600px]">
      <Table>
        <TableHeader className="sticky top-0 bg-slate-50 z-10">
          <TableRow>
            {fields.map(field => (
              <TableHead key={field.name}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort(field.name)}
                  className="h-8 font-medium"
                >
                  {field.label}
                  {getSortIcon(field.name)}
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow 
              key={row.id || index}
              className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {fields.map(field => (
                <TableCell key={field.name}>
                  {formatValue(row[field.name], field.name)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}