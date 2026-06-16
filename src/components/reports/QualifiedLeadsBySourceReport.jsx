import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { eachMonthOfInterval, startOfMonth, endOfMonth, format } from 'date-fns';

const SOURCE_CATEGORIES = [
  { key: 'referral', label: 'Referral', color: '#3b82f6' },
  { key: 'past_client', label: 'Past Client', color: '#10b981' },
  { key: 'website', label: 'Website', color: '#8b5cf6' },
  { key: 'ads', label: 'Ads', color: '#f59e0b' },
  { key: 'events', label: 'Events', color: '#ef4444' },
  { key: 'social', label: 'Social', color: '#ec4899' },
  { key: 'realtor', label: 'Realtor', color: '#14b8a6' },
  { key: 'strategic_partner', label: 'Strategic Partner', color: '#f97316' },
  { key: 'other', label: 'Other', color: '#94a3b8' },
];

// Map raw lead source values to report categories
function categorizeSource(rawSource) {
  if (!rawSource) return 'other';
  const s = rawSource.toLowerCase().trim();

  if (['referral', 'word_of_mouth', 'word of mouth'].includes(s)) return 'referral';
  if (['past_client', 'past client', 'repeat_client', 'existing_client'].includes(s)) return 'past_client';
  if (['website', 'web', 'online_form', 'online form', 'web_form'].includes(s)) return 'website';
  if (['ads', 'advertisement', 'ad', 'google_ads', 'facebook_ads', 'paid', 'bark'].includes(s)) return 'ads';
  if (['events', 'event', 'trade_show', 'home_show', 'expo'].includes(s)) return 'events';
  if (['social', 'social_media', 'facebook', 'instagram', 'linkedin', 'tiktok'].includes(s)) return 'social';
  if (['realtor', 'real_estate', 'real estate agent', 'real_estate_agent'].includes(s)) return 'realtor';
  if (['strategic_partner', 'strategic partner', 'partner', 'networking'].includes(s)) return 'strategic_partner';
  if (['cold_call', 'in_bound_phone_call', 'phone', 'email', 'other'].includes(s)) return 'other';

  // Fuzzy fallbacks
  if (s.includes('referr')) return 'referral';
  if (s.includes('past') || s.includes('repeat')) return 'past_client';
  if (s.includes('web') || s.includes('site')) return 'website';
  if (s.includes('ad') && !s.includes('lead')) return 'ads';
  if (s.includes('event') || s.includes('show')) return 'events';
  if (s.includes('social') || s.includes('facebook') || s.includes('instagram')) return 'social';
  if (s.includes('realtor') || s.includes('real estate')) return 'realtor';
  if (s.includes('partner') || s.includes('strategic')) return 'strategic_partner';

  return 'other';
}

export default function QualifiedLeadsBySourceReport({ leads, dateRange, staffId }) {
  // Filter: non-disqualified = "qualified", apply staff filter
  const qualifiedLeads = leads.filter(lead => {
    if (lead.status === 'disqualified') return false;
    if (staffId && staffId !== 'all' && lead.assigned_to !== staffId) return false;
    return true;
  });

  // Build monthly data
  const monthlyData = React.useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];

    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });

    return months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);

      const monthLeads = qualifiedLeads.filter(lead => {
        const d = new Date(lead.created_date);
        return d >= mStart && d <= mEnd;
      });

      const row = { month: format(month, 'MMM yyyy') };
      let total = 0;
      SOURCE_CATEGORIES.forEach(cat => {
        const count = monthLeads.filter(l => categorizeSource(l.source) === cat.key).length;
        row[cat.key] = count;
        total += count;
      });
      row.total = total;
      return row;
    });
  }, [qualifiedLeads, dateRange]);

  // Totals row
  const totals = React.useMemo(() => {
    const t = { month: 'Total' };
    let grand = 0;
    SOURCE_CATEGORIES.forEach(cat => {
      const sum = monthlyData.reduce((s, row) => s + (row[cat.key] || 0), 0);
      t[cat.key] = sum;
      grand += sum;
    });
    t.total = grand;
    return t;
  }, [monthlyData]);

  if (!dateRange?.start || !dateRange?.end) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          Select a date range to view qualified leads by source.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stacked Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Qualified Leads per Month by Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-slate-500">No data available for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
                        <p className="font-semibold mb-1">{label}</p>
                        {payload.filter(p => p.value > 0).map(p => (
                          <p key={p.dataKey} style={{ color: p.fill }}>
                            {SOURCE_CATEGORIES.find(c => c.key === p.dataKey)?.label}: {p.value}
                          </p>
                        ))}
                        <hr className="my-1" />
                        <p className="font-semibold">Total: {total}</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value) => SOURCE_CATEGORIES.find(c => c.key === value)?.label || value}
                />
                {SOURCE_CATEGORIES.map(cat => (
                  <Bar
                    key={cat.key}
                    dataKey={cat.key}
                    stackId="source"
                    fill={cat.color}
                    name={cat.key}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                {SOURCE_CATEGORIES.map(cat => (
                  <TableHead key={cat.key} className="text-right text-xs">{cat.label}</TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map(row => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  {SOURCE_CATEGORIES.map(cat => (
                    <TableCell key={cat.key} className="text-right">
                      {row[cat.key] > 0 ? (
                        <Badge variant="outline" className="text-xs">{row[cat.key]}</Badge>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">{row.total}</TableCell>
                </TableRow>
              ))}
              {/* Totals */}
              <TableRow className="bg-slate-50 font-semibold">
                <TableCell>Total</TableCell>
                {SOURCE_CATEGORIES.map(cat => (
                  <TableCell key={cat.key} className="text-right">
                    <Badge className="bg-slate-200 text-slate-800">{totals[cat.key]}</Badge>
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Badge className="bg-slate-800 text-white">{totals.total}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}