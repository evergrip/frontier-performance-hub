import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, eachQuarterOfInterval, startOfQuarter, endOfQuarter } from 'date-fns';

export default function SalesReport({ dateRange, staffId }) {
  const [trendPeriod, setTrendPeriod] = useState('monthly');

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const calculateWinRatio = () => {
    const filteredLeads = leads.filter(lead => {
      // Filter by staff if specified
      if (staffId && staffId !== 'all' && lead.assigned_to !== staffId) return false;
      
      // Include converted leads (regardless of proposal stage) OR leads that reached proposal
      if (lead.status === 'converted') return true;
      
      const statusHistory = lead.status_history || [];
      const reachedProposal = statusHistory.some(h => h.status === 'preconstruction_proposal');
      
      return reachedProposal;
    });

    const bySalesperson = {};
    
    filteredLeads.forEach(lead => {
      const salesPersonId = lead.assigned_to;
      if (!salesPersonId) return;
      
      if (!bySalesperson[salesPersonId]) {
        bySalesperson[salesPersonId] = {
          converted: 0,
          disqualified: 0,
          total: 0,
          winRate: 0
        };
      }
      
      if (lead.status === 'converted') {
        bySalesperson[salesPersonId].converted++;
      } else if (lead.status === 'disqualified') {
        bySalesperson[salesPersonId].disqualified++;
      }
      
      bySalesperson[salesPersonId].total++;
    });

    Object.keys(bySalesperson).forEach(id => {
      const data = bySalesperson[id];
      data.winRate = data.total > 0 ? (data.converted / data.total) * 100 : 0;
    });

    return bySalesperson;
  };

  const calculateTrendData = () => {
    if (!dateRange.start || !dateRange.end) return [];

    let intervals;
    if (trendPeriod === 'monthly') {
      intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    } else {
      intervals = eachQuarterOfInterval({ start: dateRange.start, end: dateRange.end });
    }

    return intervals.map(intervalStart => {
      const intervalEnd = trendPeriod === 'monthly' 
        ? endOfMonth(intervalStart)
        : endOfQuarter(intervalStart);

      const periodLeads = leads.filter(lead => {
        if (staffId && staffId !== 'all' && lead.assigned_to !== staffId) return false;

        // Include if converted (check created date)
        if (lead.status === 'converted') {
          const createdDate = new Date(lead.created_date);
          return createdDate >= intervalStart && createdDate <= intervalEnd;
        }

        // Otherwise check if they reached proposal stage in this period
        const statusHistory = lead.status_history || [];
        const proposalEntry = statusHistory.find(h => h.status === 'preconstruction_proposal');
        
        if (!proposalEntry) return false;

        const proposalDate = new Date(proposalEntry.entered_date);
        return proposalDate >= intervalStart && proposalDate <= intervalEnd;
      });

      const converted = periodLeads.filter(l => l.status === 'converted').length;
      const disqualified = periodLeads.filter(l => l.status === 'disqualified').length;
      const total = converted + disqualified;
      const winRate = total > 0 ? (converted / total) * 100 : 0;

      return {
        period: trendPeriod === 'monthly' 
          ? format(intervalStart, 'MMM yyyy')
          : `Q${Math.floor(intervalStart.getMonth() / 3) + 1} ${format(intervalStart, 'yyyy')}`,
        winRate: parseFloat(winRate.toFixed(1)),
        converted,
        disqualified,
        total
      };
    });
  };

  const winRatioData = calculateWinRatio();
  const trendData = calculateTrendData();
  const salespeopleWithData = Object.keys(winRatioData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Win Ratio by Salesperson
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salespeopleWithData.length === 0 ? (
            <p className="text-sm text-slate-500">No proposal data available for this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salesperson</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                  <TableHead className="text-right">Disqualified</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespeopleWithData.map(salesPersonId => {
                  const user = users.find(u => u.id === salesPersonId);
                  const data = winRatioData[salesPersonId];
                  
                  const TrendIcon = data.winRate >= 50 ? TrendingUp : data.winRate >= 30 ? Minus : TrendingDown;
                  const trendColor = data.winRate >= 50 ? 'text-emerald-600' : data.winRate >= 30 ? 'text-amber-600' : 'text-red-600';
                  
                  return (
                    <TableRow key={salesPersonId}>
                      <TableCell className="font-medium">
                        {user?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                          <span className={`font-bold text-lg ${trendColor}`}>
                            {data.winRate.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-emerald-100 text-emerald-800">{data.converted}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{data.disqualified}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{data.total}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Win Rate Trend
            </span>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-normal">View by:</Label>
              <Select value={trendPeriod} onValueChange={setTrendPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-slate-500">No trend data available for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold">{data.period}</p>
                          <p className="text-emerald-600">Win Rate: {data.winRate}%</p>
                          <p className="text-sm text-slate-600">Converted: {data.converted}</p>
                          <p className="text-sm text-slate-600">Disqualified: {data.disqualified}</p>
                          <p className="text-sm text-slate-600">Total: {data.total}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="winRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Win Rate (%)"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}