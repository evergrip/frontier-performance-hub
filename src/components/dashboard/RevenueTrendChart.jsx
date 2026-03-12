import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const breakdowns = data.breakdowns || [];
  const preconTotal = data.precon || 0;
  const constructionTotal = data.construction || 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-semibold text-slate-900 text-sm mb-2">{label}</p>
      <p className="text-sm font-bold text-slate-800 mb-2">
        Total: ${data.revenue?.toFixed(0)}K
      </p>

      {preconTotal > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-blue-700 mb-1">
            Pre-Construction: ${preconTotal.toFixed(0)}K
          </p>
          {breakdowns.filter(b => b.type === 'precon').map((b, i) => (
            <p key={`precon-${i}`} className="text-xs text-slate-600 pl-2">
              {b.name}: ${b.amount.toFixed(0)}K
            </p>
          ))}
        </div>
      )}

      {constructionTotal > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-1">
            Construction: ${constructionTotal.toFixed(0)}K
          </p>
          {breakdowns.filter(b => b.type === 'construction').map((b, i) => (
            <p key={`const-${i}`} className="text-xs text-slate-600 pl-2">
              {b.name}: ${b.amount.toFixed(0)}K
            </p>
          ))}
        </div>
      )}

      {breakdowns.length === 0 && (
        <p className="text-xs text-slate-400">No revenue sources</p>
      )}
    </div>
  );
}

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
              <Tooltip content={<CustomTooltip />} />
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