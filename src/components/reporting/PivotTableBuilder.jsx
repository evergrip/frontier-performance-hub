import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { GripVertical, X, Save, Download } from 'lucide-react';
import { formatCurrency } from '@/components/utils/formatters';

const FIELD_DEFINITIONS = {
  leads: [
    { id: 'status', label: 'Status', type: 'string' },
    { id: 'source', label: 'Source', type: 'string' },
    { id: 'lead_score', label: 'Lead Score', type: 'number' },
    { id: 'estimated_precon_value', label: 'Est. Precon Value', type: 'currency' },
    { id: 'estimated_construction_value', label: 'Est. Construction Value', type: 'currency' },
    { id: 'assigned_to', label: 'Assigned To', type: 'string' },
    { id: 'created_date', label: 'Created Date', type: 'date' }
  ],
  sales: [
    { id: 'status', label: 'Status', type: 'string' },
    { id: 'sale_type', label: 'Type', type: 'string' },
    { id: 'contract_value', label: 'Contract Value', type: 'currency' },
    { id: 'final_precon_value', label: 'Final Precon Value', type: 'currency' },
    { id: 'estimated_margin', label: 'Margin %', type: 'number' },
    { id: 'assigned_to', label: 'Assigned To', type: 'string' },
    { id: 'is_lost', label: 'Lost', type: 'boolean' },
    { id: 'projected_completion_month', label: 'Projected Month', type: 'number' },
    { id: 'created_date', label: 'Created Date', type: 'date' }
  ],
  projects: [
    { id: 'status', label: 'Status', type: 'string' },
    { id: 'project_type', label: 'Type', type: 'string' },
    { id: 'contract_value', label: 'Contract Value', type: 'currency' },
    { id: 'actual_costs', label: 'Actual Costs', type: 'currency' },
    { id: 'actual_margin', label: 'Actual Margin %', type: 'number' },
    { id: 'crew_assignment', label: 'Crew', type: 'string' },
    { id: 'project_manager_id', label: 'PM', type: 'string' },
    { id: 'created_date', label: 'Created Date', type: 'date' }
  ]
};

const AGGREGATIONS = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' }
];

export default function PivotTableBuilder({ data, dataSource, initialConfig, onSave }) {
  const [availableFields, setAvailableFields] = useState(FIELD_DEFINITIONS[dataSource] || []);
  const [rows, setRows] = useState(initialConfig?.rows || []);
  const [columns, setColumns] = useState(initialConfig?.columns || []);
  const [values, setValues] = useState(initialConfig?.values || []);

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === destId) {
      // Reordering within same list
      const list = sourceId === 'rows' ? rows : sourceId === 'columns' ? columns : values;
      const items = Array.from(list);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);

      if (sourceId === 'rows') setRows(items);
      else if (sourceId === 'columns') setColumns(items);
      else setValues(items);
    } else if (sourceId === 'available') {
      // Adding from available fields
      const field = availableFields[source.index];
      if (destId === 'rows') setRows([...rows, field.id]);
      else if (destId === 'columns') setColumns([...columns, field.id]);
      else if (destId === 'values') setValues([...values, { field: field.id, aggregation: 'sum' }]);
    }
  };

  const removeField = (list, index, setter) => {
    const items = Array.from(list);
    items.splice(index, 1);
    setter(items);
  };

  const updateAggregation = (index, aggregation) => {
    const items = Array.from(values);
    items[index].aggregation = aggregation;
    setValues(items);
  };

  const pivotData = useMemo(() => {
    if (!data || data.length === 0 || values.length === 0) return [];

    // Group data by row fields
    const grouped = {};
    data.forEach(item => {
      const rowKey = rows.map(r => item[r] || 'N/A').join('|');
      if (!grouped[rowKey]) {
        grouped[rowKey] = { _key: rowKey, _items: [] };
        rows.forEach(r => {
          grouped[rowKey][r] = item[r] || 'N/A';
        });
      }
      grouped[rowKey]._items.push(item);
    });

    // Calculate aggregations
    return Object.values(grouped).map(group => {
      const result = { ...group };
      values.forEach(value => {
        if (!value || !value.field) return;
        const { field, aggregation } = value;
        const items = group._items;
        const numericValues = items.map(i => parseFloat(i[field])).filter(v => !isNaN(v));
        
        if (aggregation === 'count') result[field] = items.length;
        else if (aggregation === 'sum') result[field] = numericValues.reduce((a, b) => a + b, 0);
        else if (aggregation === 'avg') result[field] = numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
        else if (aggregation === 'min') result[field] = numericValues.length > 0 ? Math.min(...numericValues) : 0;
        else if (aggregation === 'max') result[field] = numericValues.length > 0 ? Math.max(...numericValues) : 0;
      });
      return result;
    });
  }, [data, rows, columns, values]);

  const handleSave = () => {
    onSave({
      configuration: { rows, columns, values }
    });
  };

  const exportToCSV = () => {
    if (pivotData.length === 0) return;

    const headers = [...rows, ...values.map(v => v.field)];
    const csvContent = [
      headers.join(','),
      ...pivotData.map(row => headers.map(h => row[h] || '').join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivot-report.csv';
    a.click();
  };

  const getFieldLabel = (fieldId) => {
    const field = availableFields.find(f => f.id === fieldId);
    return field ? field.label : fieldId;
  };

  const formatValue = (fieldId, value) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (field?.type === 'currency') return formatCurrency(value);
    if (field?.type === 'number') return value.toFixed(2);
    return value;
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Available Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="available">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {availableFields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg text-sm cursor-move hover:bg-slate-200"
                          >
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            {field.label}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="rows">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 min-h-[100px]">
                    {rows.map((fieldId, index) => (
                      <div key={fieldId} className="flex items-center justify-between p-2 bg-blue-100 rounded-lg text-sm">
                        <span>{getFieldLabel(fieldId)}</span>
                        <button onClick={() => removeField(rows, index, setRows)}>
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="columns">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 min-h-[100px]">
                    {columns.map((fieldId, index) => (
                      <div key={fieldId} className="flex items-center justify-between p-2 bg-green-100 rounded-lg text-sm">
                        <span>{getFieldLabel(fieldId)}</span>
                        <button onClick={() => removeField(columns, index, setColumns)}>
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Values</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="values">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 min-h-[100px]">
                    {values.map((value, index) => (
                      <div key={value.field} className="p-2 bg-amber-100 rounded-lg text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span>{getFieldLabel(value.field)}</span>
                          <button onClick={() => removeField(values, index, setValues)}>
                            <X className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                        <Select value={value.aggregation} onValueChange={(v) => updateAggregation(index, v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AGGREGATIONS.map(agg => (
                              <SelectItem key={agg.value} value={agg.value}>{agg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Pivot Table Results</CardTitle>
              <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={handleSave} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pivotData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Drag fields to Rows and Values to build your pivot table
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {rows.map(r => (
                        <TableHead key={r}>{getFieldLabel(r)}</TableHead>
                      ))}
                      {values.map(v => (
                        <TableHead key={v.field}>{v.aggregation} of {getFieldLabel(v.field)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivotData.map((row, index) => (
                      <TableRow key={index}>
                        {rows.map(r => (
                          <TableCell key={r}>{row[r]}</TableCell>
                        ))}
                        {values.map(v => (
                          <TableCell key={v.field}>{formatValue(v.field, row[v.field])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DragDropContext>
  );
}