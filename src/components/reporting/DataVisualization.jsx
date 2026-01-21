import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/components/utils/formatters';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function DataVisualization({ data, config, type = 'bar' }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No data available for visualization
      </div>
    );
  }

  const formatTooltipValue = (value, name) => {
    if (typeof value === 'number' && (name.toLowerCase().includes('value') || name.toLowerCase().includes('amount') || name.toLowerCase().includes('revenue'))) {
      return formatCurrency(value);
    }
    return value;
  };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey={config.xAxis || 'name'} />
          <YAxis />
          <Tooltip formatter={formatTooltipValue} />
          <Legend />
          {config.yAxis?.map((key, index) => (
            <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey={config.xAxis || 'name'} />
          <YAxis />
          <Tooltip formatter={formatTooltipValue} />
          <Legend />
          {config.yAxis?.map((key, index) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey={config.valueKey || 'value'}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltipValue} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}