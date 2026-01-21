import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Table2, PieChart, TrendingUp, Download, RefreshCw } from 'lucide-react';
import ReportBuilder from '../components/reporting/ReportBuilder';
import DataTable from '../components/reporting/DataTable';
import DataVisualization from '../components/reporting/DataVisualization';
import { formatCurrency } from '@/components/utils/formatters';

export default function Reporting() {
  const [entity, setEntity] = useState('Lead');
  const [reportConfig, setReportConfig] = useState({
    filters: [],
    selectedFields: [],
    groupBy: '',
    aggregations: [],
    dateRange: { start: '', end: '' }
  });
  const [viewMode, setViewMode] = useState('table');

  // Fetch entity data
  const { data: rawData = [], isLoading, refetch } = useQuery({
    queryKey: ['reporting', entity],
    queryFn: () => {
      if (entity === 'Lead') return base44.entities.Lead.list();
      if (entity === 'Sale') return base44.entities.Sale.list();
      if (entity === 'Project') return base44.entities.Project.list();
      if (entity === 'Client') return base44.entities.Client.list();
      return [];
    }
  });

  // Fetch entity schema
  const { data: schema, isLoading: isLoadingSchema } = useQuery({
    queryKey: ['schema', entity],
    queryFn: async () => {
      if (entity === 'Lead') return await base44.entities.Lead.schema();
      if (entity === 'Sale') return await base44.entities.Sale.schema();
      if (entity === 'Project') return await base44.entities.Project.schema();
      if (entity === 'Client') return await base44.entities.Client.schema();
      return null;
    }
  });

  // Apply filters and date range
  const filteredData = useMemo(() => {
    let filtered = [...rawData];

    // Date range filter
    if (reportConfig.dateRange.start || reportConfig.dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_date);
        if (reportConfig.dateRange.start && itemDate < new Date(reportConfig.dateRange.start)) return false;
        if (reportConfig.dateRange.end && itemDate > new Date(reportConfig.dateRange.end)) return false;
        return true;
      });
    }

    // Apply advanced filters
    reportConfig.filters.forEach(filter => {
      if (!filter.field || !filter.operator) return;

      filtered = filtered.filter(item => {
        const value = item[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return value == filterValue;
          case 'not_equals':
            return value != filterValue;
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filterValue);
          case 'less_than':
            return Number(value) < Number(filterValue);
          case 'in':
            return filterValue.split(',').map(v => v.trim()).includes(String(value));
          case 'is_empty':
            return !value || value === '';
          case 'is_not_empty':
            return value && value !== '';
          default:
            return true;
        }
      });
    });

    return filtered;
  }, [rawData, reportConfig]);

  // Calculate aggregations and grouping
  const processedData = useMemo(() => {
    if (!reportConfig.groupBy) return filteredData;

    const grouped = {};
    filteredData.forEach(item => {
      const groupKey = item[reportConfig.groupBy] || 'Unknown';
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          name: groupKey,
          items: [],
          count: 0
        };
      }
      grouped[groupKey].items.push(item);
      grouped[groupKey].count++;
    });

    // Calculate aggregations
    const result = Object.values(grouped).map(group => {
      const aggs = {};
      reportConfig.aggregations.forEach(agg => {
        if (!agg.field || !agg.function) return;

        const values = group.items.map(item => Number(item[agg.field]) || 0);
        
        switch (agg.function) {
          case 'sum':
            aggs[agg.label || `${agg.function}_${agg.field}`] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggs[agg.label || `${agg.function}_${agg.field}`] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'count':
            aggs[agg.label || `${agg.function}_${agg.field}`] = values.length;
            break;
          case 'min':
            aggs[agg.label || `${agg.function}_${agg.field}`] = Math.min(...values);
            break;
          case 'max':
            aggs[agg.label || `${agg.function}_${agg.field}`] = Math.max(...values);
            break;
        }
      });

      return {
        ...group,
        ...aggs
      };
    });

    return result;
  }, [filteredData, reportConfig]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = [];
    
    reportConfig.aggregations.forEach(agg => {
      if (!agg.field || !agg.function) return;

      const values = filteredData.map(item => Number(item[agg.field]) || 0);
      let result = 0;

      switch (agg.function) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result = values.reduce((a, b) => a + b, 0) / (values.length || 1);
          break;
        case 'count':
          result = filteredData.length;
          break;
        case 'min':
          result = Math.min(...values);
          break;
        case 'max':
          result = Math.max(...values);
          break;
      }

      stats.push({
        label: agg.label || `${agg.function} of ${agg.field}`,
        value: result,
        isMonetary: agg.field.includes('value') || agg.field.includes('amount') || agg.field.includes('revenue')
      });
    });

    stats.unshift({
      label: 'Total Records',
      value: filteredData.length,
      isMonetary: false
    });

    return stats;
  }, [filteredData, reportConfig]);

  // Get display fields
  const displayFields = useMemo(() => {
    if (!schema?.properties) return [];
    
    const builtInFields = [
      { name: 'id', type: 'string', label: 'ID' },
      { name: 'created_date', type: 'date', label: 'Created Date' },
      { name: 'updated_date', type: 'date', label: 'Updated Date' },
      { name: 'created_by', type: 'string', label: 'Created By' }
    ];

    const schemaFields = Object.entries(schema.properties).map(([name, def]) => ({
      name,
      type: def.type,
      label: def.description || name
    }));

    const allFields = [...builtInFields, ...schemaFields];

    if (reportConfig.selectedFields.length === 0) {
      return allFields.slice(0, 6);
    }

    return allFields.filter(f => reportConfig.selectedFields.includes(f.name));
  }, [schema, reportConfig.selectedFields]);

  // Chart configuration
  const chartConfig = useMemo(() => {
    if (reportConfig.groupBy) {
      return {
        xAxis: 'name',
        yAxis: reportConfig.aggregations.map(agg => agg.label || `${agg.function}_${agg.field}`),
        valueKey: reportConfig.aggregations[0]?.label || 'count'
      };
    }
    return { xAxis: 'name', yAxis: ['count'], valueKey: 'count' };
  }, [reportConfig]);

  const handleExport = () => {
    const csv = [
      displayFields.map(f => f.label).join(','),
      ...processedData.map(row => 
        displayFields.map(f => {
          const value = row[f.name];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const entityOptions = [
    { value: 'Lead', label: 'Leads' },
    { value: 'Sale', label: 'Pre-Construction Sales' },
    { value: 'Project', label: 'Projects' },
    { value: 'Client', label: 'Clients' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Advanced Reporting</h1>
          <p className="text-slate-500 mt-1">Flexible reporting with filtering, grouping, and aggregations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Entity Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Data Source</label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="mt-5">
              {filteredData.length} records
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Report Builder */}
      <ReportBuilder
        entitySchema={schema}
        entityName={entity}
        onConfigChange={setReportConfig}
        initialConfig={reportConfig}
      />

      {/* Summary Statistics */}
      {summaryStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stat.isMonetary ? formatCurrency(stat.value) : Math.round(stat.value).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Data Display */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Report Results</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="w-4 h-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('bar')}
                disabled={!reportConfig.groupBy}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Bar Chart
              </Button>
              <Button
                variant={viewMode === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('line')}
                disabled={!reportConfig.groupBy}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Line Chart
              </Button>
              <Button
                variant={viewMode === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('pie')}
                disabled={!reportConfig.groupBy}
              >
                <PieChart className="w-4 h-4 mr-2" />
                Pie Chart
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(isLoading || isLoadingSchema) ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
          ) : viewMode === 'table' ? (
            <DataTable data={processedData} fields={displayFields} />
          ) : (
            <DataVisualization data={processedData} config={chartConfig} type={viewMode} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}