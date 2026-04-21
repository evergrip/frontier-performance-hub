import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, AlertTriangle, DollarSign, RefreshCw, Loader2, Sparkles, Target, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import ReactMarkdown from 'react-markdown';

const CURRENCY_FMT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

export default function PreconAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke('preconAnalytics', {});
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setData(res.data);
    }
    setLoading(false);
  };

  // Auto-load on first render
  React.useEffect(() => { loadAnalytics(); }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-sm text-slate-500">Crunching pre-construction data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      </div>
    );
  }

  const ph = data?.pipeline_health || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pre-Con Analytics</h1>
          <p className="text-slate-500">Performance insights across the 34-stage pre-construction process</p>
        </div>
        <Button onClick={loadAnalytics} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {data && (
        <>
          {/* Pipeline Health KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatCard icon={Users} label="Total Leads" value={ph.total_leads} />
            <StatCard icon={Target} label="Conversion Rate" value={`${ph.conversion_rate}%`} color="text-blue-600" />
            <StatCard icon={BarChart3} label="Active Pre-Con" value={ph.active_precon} color="text-purple-600" />
            <StatCard icon={TrendingUp} label="Win Rate" value={`${ph.win_rate}%`} color="text-emerald-600" />
            <StatCard icon={DollarSign} label="Pipeline Value" value={CURRENCY_FMT.format(ph.total_pipeline_value)} color="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estimate vs Actual Variance */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Budget Variance Trends
                </h3>
                {data.variance_trends?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.variance_trends.slice(0, 10)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="project_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => v ? CURRENCY_FMT.format(v) : 'N/A'} />
                      <Bar dataKey="preliminary_budget" fill="#93c5fd" name="Preliminary" />
                      <Bar dataKey="detailed_estimate" fill="#60a5fa" name="Detailed" />
                      <Bar dataKey="final_approved" fill="#2563eb" name="Final" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No budget variance data yet — complete Stages 6, 18, and 20 on projects" />
                )}
              </CardContent>
            </Card>

            {/* Stage Cycle Times */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" /> Avg Stage Cycle Times (days)
                </h3>
                {data.stage_cycle_times?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.stage_cycle_times.slice(0, 15)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="stage_order" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v, name) => [v + ' days', name]}
                        labelFormatter={(label) => {
                          const s = data.stage_cycle_times.find(t => t.stage_order === label);
                          return s ? `Stage ${label}: ${s.stage_name}` : `Stage ${label}`;
                        }}
                      />
                      <Bar dataKey="avg_days" fill="#8b5cf6" name="Avg Days" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No cycle time data yet — complete stages on active projects" />
                )}
              </CardContent>
            </Card>

            {/* Common Risks */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Most Common Risks
                </h3>
                {data.common_risks?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.common_risks}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ type, count }) => `${type} (${count})`}
                        labelLine={{ stroke: '#94a3b8' }}
                      >
                        {data.common_risks.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No risk data yet — Co-Pilot alerts will appear as projects progress" />
                )}
              </CardContent>
            </Card>

            {/* Gross Margin Impact */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Pre-Con as % of Construction
                </h3>
                {data.gross_margin_data?.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {data.gross_margin_data.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                        <span className="font-medium text-slate-800 truncate max-w-[45%]">{d.project_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{CURRENCY_FMT.format(d.precon_value)}</span>
                          <span className="font-bold text-emerald-700">{d.precon_as_pct_of_construction || '—'}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyChart message="No closed pre-construction projects yet" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Summary */}
          {data.ai_summary && (
            <Card className="border-indigo-200">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> AI Insights — Top 3 from Recent Projects
                </h3>
                <div className="prose prose-sm prose-slate max-w-none text-sm">
                  <ReactMarkdown>{data.ai_summary}</ReactMarkdown>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">
                  Generated {new Date(data.generated_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-slate-900' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">{label}</span>
        </div>
        <p className={`text-xl font-bold ${color}`}>{value ?? '—'}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-center">
      <p className="text-xs text-slate-400 max-w-[200px]">{message}</p>
    </div>
  );
}