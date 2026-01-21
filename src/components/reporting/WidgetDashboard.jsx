import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Plus, Trash2, Save } from 'lucide-react';
import { formatCurrency } from '@/components/utils/formatters';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

export default function WidgetDashboard({ data, dataSource, initialWidgets, onSave }) {
  const [widgets, setWidgets] = useState(initialWidgets || []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newWidget, setNewWidget] = useState({
    type: 'bar',
    title: '',
    groupBy: '',
    valueField: '',
    aggregation: 'count'
  });

  const addWidget = () => {
    if (!newWidget.title || !newWidget.groupBy) return;

    const widget = {
      id: Date.now().toString(),
      type: newWidget.type,
      title: newWidget.title,
      config: {
        groupBy: newWidget.groupBy,
        valueField: newWidget.valueField,
        aggregation: newWidget.aggregation
      }
    };

    setWidgets([...widgets, widget]);
    setShowAddDialog(false);
    setNewWidget({ type: 'bar', title: '', groupBy: '', valueField: '', aggregation: 'count' });
  };

  const removeWidget = (id) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const generateWidgetData = (widget) => {
    const { groupBy, valueField, aggregation } = widget.config;
    const grouped = {};

    data.forEach(item => {
      const key = item[groupBy] || 'N/A';
      if (!grouped[key]) {
        grouped[key] = { name: key, count: 0, values: [] };
      }
      grouped[key].count++;
      if (valueField && item[valueField]) {
        grouped[key].values.push(parseFloat(item[valueField]));
      }
    });

    return Object.values(grouped).map(group => {
      let value = group.count;
      if (aggregation === 'sum' && group.values.length > 0) {
        value = group.values.reduce((a, b) => a + b, 0);
      } else if (aggregation === 'avg' && group.values.length > 0) {
        value = group.values.reduce((a, b) => a + b, 0) / group.values.length;
      }
      return { name: group.name, value };
    });
  };

  const renderWidget = (widget) => {
    const chartData = generateWidgetData(widget);

    if (widget.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (widget.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (widget.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3B82F6" />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (widget.type === 'metric') {
      const total = chartData.reduce((sum, item) => sum + item.value, 0);
      return (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <div className="text-5xl font-bold text-slate-900">
              {widget.config.valueField ? formatCurrency(total) : total}
            </div>
            <div className="text-slate-500 mt-2">{widget.config.aggregation}</div>
          </div>
        </div>
      );
    }
  };

  const handleSave = () => {
    onSave({ widgets });
  };

  const availableFields = dataSource === 'leads' 
    ? ['status', 'source', 'lead_score', 'estimated_precon_value']
    : dataSource === 'sales'
    ? ['status', 'sale_type', 'contract_value', 'final_precon_value']
    : ['status', 'project_type', 'contract_value', 'actual_costs'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Widget
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Dashboard
        </Button>
      </div>

      {widgets.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              No widgets yet. Click "Add Widget" to create your first visualization.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {widgets.map(widget => (
            <Card key={widget.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">{widget.title}</CardTitle>
                  <Button size="icon" variant="ghost" onClick={() => removeWidget(widget.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderWidget(widget)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Widget Type</Label>
              <Select value={newWidget.type} onValueChange={(v) => setNewWidget({ ...newWidget, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="metric">Single Metric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={newWidget.title}
                onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                placeholder="Sales by Status"
              />
            </div>

            <div>
              <Label>Group By</Label>
              <Select value={newWidget.groupBy} onValueChange={(v) => setNewWidget({ ...newWidget, groupBy: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Value Field (optional)</Label>
              <Select value={newWidget.valueField} onValueChange={(v) => setNewWidget({ ...newWidget, valueField: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Count only" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Count</SelectItem>
                  {availableFields.filter(f => f.includes('value') || f.includes('cost')).map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newWidget.valueField && (
              <div>
                <Label>Aggregation</Label>
                <Select value={newWidget.aggregation} onValueChange={(v) => setNewWidget({ ...newWidget, aggregation: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={addWidget}>Add Widget</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}