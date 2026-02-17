import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

export default function RevenueTrendChart({ monthlyTrendData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
        <CardDescription>Monthly revenue for selected period</CardDescription>
      </CardHeader>
      <CardContent>
        {monthlyTrendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(0)}K`} />
              <Legend />
              <Bar dataKey="revenue" fill="#F59E0B" name="Revenue ($K)" />
              <Line type="monotone" dataKey="revenue" stroke="#0F172A" strokeWidth={2} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-slate-400 py-8">No data for selected period</p>
        )}
      </CardContent>
    </Card>
  );
}