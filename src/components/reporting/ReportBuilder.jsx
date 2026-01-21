import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Filter, Columns3, BarChart3, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function ReportBuilder({ 
  entitySchema, 
  entityName,
  onConfigChange,
  initialConfig = {}
}) {
  const [filters, setFilters] = useState(initialConfig.filters || []);
  const [selectedFields, setSelectedFields] = useState(initialConfig.selectedFields || []);
  const [groupBy, setGroupBy] = useState(initialConfig.groupBy || '');
  const [aggregations, setAggregations] = useState(initialConfig.aggregations || []);
  const [dateRange, setDateRange] = useState(initialConfig.dateRange || { start: '', end: '' });
  const [calculatedFields, setCalculatedFields] = useState(initialConfig.calculatedFields || []);

  // Extract field information from schema
  const fields = useMemo(() => {
    if (!entitySchema?.properties) return [];
    
    const builtInFields = [
      { name: 'id', type: 'string', label: 'ID' },
      { name: 'created_date', type: 'date', label: 'Created Date' },
      { name: 'updated_date', type: 'date', label: 'Updated Date' },
      { name: 'created_by', type: 'string', label: 'Created By' }
    ];

    const schemaFields = Object.entries(entitySchema.properties).map(([name, def]) => ({
      name,
      type: def.type,
      label: def.description || name,
      enum: def.enum
    }));

    return [...builtInFields, ...schemaFields];
  }, [entitySchema]);

  const numericFields = fields.filter(f => f.type === 'number' || f.type === 'integer');
  const dateFields = fields.filter(f => f.type === 'date' || f.name.includes('date'));

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
  };

  const updateFilter = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index][key] = value;
    setFilters(newFilters);
    emitConfig({ filters: newFilters });
  };

  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    emitConfig({ filters: newFilters });
  };

  const toggleField = (fieldName) => {
    const newFields = selectedFields.includes(fieldName)
      ? selectedFields.filter(f => f !== fieldName)
      : [...selectedFields, fieldName];
    setSelectedFields(newFields);
    emitConfig({ selectedFields: newFields });
  };

  const addAggregation = () => {
    setAggregations([...aggregations, { field: '', function: 'sum', label: '' }]);
  };

  const updateAggregation = (index, key, value) => {
    const newAggs = [...aggregations];
    newAggs[index][key] = value;
    setAggregations(newAggs);
    emitConfig({ aggregations: newAggs });
  };

  const removeAggregation = (index) => {
    const newAggs = aggregations.filter((_, i) => i !== index);
    setAggregations(newAggs);
    emitConfig({ aggregations: newAggs });
  };

  const addCalculatedField = () => {
    setCalculatedFields([...calculatedFields, { name: '', type: '', phase: '' }]);
  };

  const updateCalculatedField = (index, key, value) => {
    const newFields = [...calculatedFields];
    newFields[index][key] = value;
    setCalculatedFields(newFields);
    emitConfig({ calculatedFields: newFields });
  };

  const removeCalculatedField = (index) => {
    const newFields = calculatedFields.filter((_, i) => i !== index);
    setCalculatedFields(newFields);
    emitConfig({ calculatedFields: newFields });
  };

  const emitConfig = (updates = {}) => {
    const config = {
      filters,
      selectedFields,
      groupBy,
      aggregations,
      dateRange,
      calculatedFields,
      ...updates
    };
    onConfigChange?.(config);
  };

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'in', label: 'In List' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ];

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  const newRange = { ...dateRange, start: e.target.value };
                  setDateRange(newRange);
                  emitConfig({ dateRange: newRange });
                }}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  const newRange = { ...dateRange, end: e.target.value };
                  setDateRange(newRange);
                  emitConfig({ dateRange: newRange });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Columns3 className="w-4 h-4" />
            Select Fields to Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fields.map(field => (
              <div key={field.name} className="flex items-center space-x-2">
                <Checkbox
                  id={field.name}
                  checked={selectedFields.includes(field.name)}
                  onCheckedChange={() => toggleField(field.name)}
                />
                <label
                  htmlFor={field.name}
                  className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {field.label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filters.map((filter, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Field</Label>
                <Select
                  value={filter.field}
                  onValueChange={(value) => updateFilter(index, 'field', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map(f => (
                      <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Operator</Label>
                <Select
                  value={filter.operator}
                  onValueChange={(value) => updateFilter(index, 'operator', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    placeholder="Filter value"
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFilter(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addFilter}>
            <Plus className="w-4 h-4 mr-2" />
            Add Filter
          </Button>
        </CardContent>
      </Card>

      {/* Calculated Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Calculated Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">Create custom metrics like phase duration or margin %</p>
          {calculatedFields.map((calc, index) => (
            <div key={index} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Field name (e.g., 'Avg Design Duration')"
                  value={calc.name || ''}
                  onChange={(e) => updateCalculatedField(index, 'name', e.target.value)}
                />
                <Select
                  value={calc.type || ''}
                  onValueChange={(value) => updateCalculatedField(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Calculation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phase_duration">Phase Duration (days)</SelectItem>
                    <SelectItem value="margin_percentage">Margin %</SelectItem>
                    <SelectItem value="days_since_created">Days Since Created</SelectItem>
                  </SelectContent>
                </Select>
                {calc.type === 'phase_duration' && (
                  <Select
                    value={calc.phase || ''}
                    onValueChange={(value) => updateCalculatedField(index, 'phase', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feasibility">Feasibility</SelectItem>
                      <SelectItem value="design_material_selections">Design & Material Selections</SelectItem>
                      <SelectItem value="engineering_permits">Engineering & Permits</SelectItem>
                      <SelectItem value="pending_construction_sale">Pending Construction Sale</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCalculatedField(index)}
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCalculatedField} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Calculated Field
          </Button>
        </CardContent>
      </Card>

      {/* Grouping & Aggregations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Group By & Aggregations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Group By</Label>
            <Select
              value={groupBy}
              onValueChange={(value) => {
                setGroupBy(value);
                emitConfig({ groupBy: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field to group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {fields.map(f => (
                  <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-xs">Aggregations</Label>
            {aggregations.map((agg, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Select
                    value={agg.function}
                    onValueChange={(value) => updateAggregation(index, 'function', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Select
                    value={agg.field}
                    onValueChange={(value) => updateAggregation(index, 'field', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericFields.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    value={agg.label}
                    onChange={(e) => updateAggregation(index, 'label', e.target.value)}
                    placeholder="Label"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAggregation(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addAggregation}>
              <Plus className="w-4 h-4 mr-2" />
              Add Aggregation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}