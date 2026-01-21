import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency, getMonthName, daysBetween } from '../components/utils/formatters';

export default function PreconReporting() {
  const [timeframe, setTimeframe] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
  });

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  const companySetting = settings[0] || { fiscal_year_start_month: 1, fiscal_year_start_day: 1 };

  // Calculate date ranges
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    if (timeframe === 'custom') {
      startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), 0, 1);
      endDate = customEndDate ? new Date(customEndDate) : now;
    } else if (timeframe === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (timeframe === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    } else if (timeframe === 'fiscal') {
      const fiscalStartMonth = companySetting.fiscal_year_start_month - 1;
      const fiscalStartDay = companySetting.fiscal_year_start_day || 1;
      
      if (now.getMonth() >= fiscalStartMonth) {
        startDate = new Date(now.getFullYear(), fiscalStartMonth, fiscalStartDay);
        endDate = new Date(now.getFullYear() + 1, fiscalStartMonth, fiscalStartDay - 1);
      } else {
        startDate = new Date(now.getFullYear() - 1, fiscalStartMonth, fiscalStartDay);
        endDate = new Date(now.getFullYear(), fiscalStartMonth, fiscalStartDay - 1);
      }
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Filter sales within date range
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      if (sale.sale_type !== 'preconstruction') return false;
      
      const saleDate = new Date(sale.created_date);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, startDate, endDate]);

  // Calculate metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let completedCount = 0;
    let lostCount = 0;
    let activeCount = 0;

    const phaseTimings = {
      feasibility: [],
      design_material_selections: [],
      engineering_permits: [],
      pending_construction_sale: []
    };

    filteredSales.forEach(sale => {
      if (sale.status === 'closed_won' || sale.status === 'closed_lost' || sale.is_lost) {
        totalRevenue += sale.final_precon_value || 0;
        if (sale.is_lost || sale.status === 'closed_lost') {
          lostCount++;
        } else {
          completedCount++;
        }
      } else {
        activeCount++;
      }

      // Calculate phase timings
      if (sale.phase_tracking && Array.isArray(sale.phase_tracking)) {
        sale.phase_tracking.forEach(phase => {
          if (phase.entered_date && phase.exited_date) {
            const days = daysBetween(phase.entered_date, phase.exited_date);
            if (phaseTimings[phase.phase]) {
              phaseTimings[phase.phase].push(days);
            }
          }
        });
      }
    });

    const averagePhaseTimings = {};
    Object.keys(phaseTimings).forEach(phase => {
      const timings = phaseTimings[phase];
      if (timings.length > 0) {
        const sum = timings.reduce((a, b) => a + b, 0);
        averagePhaseTimings[phase] = Math.round(sum / timings.length);
      } else {
        averagePhaseTimings[phase] = 0;
      }
    });

    return {
      totalRevenue,
      completedCount,
      lostCount,
      activeCount,
      averagePhaseTimings
    };
  }, [filteredSales]);

  // Forecast data
  const forecastData = useMemo(() => {
    const forecast = {};
    const activeSales = sales.filter(s => 
      s.sale_type === 'preconstruction' && 
      !s.is_lost && 
      s.status !== 'closed_lost' &&
      s.status !== 'closed_won' &&
      s.projected_completion_month &&
      s.projected_completion_year
    );

    activeSales.forEach(sale => {
      const key = `${sale.projected_completion_year}-${String(sale.projected_completion_month).padStart(2, '0')}`;
      if (!forecast[key]) {
        forecast[key] = {
          month: getMonthName(sale.projected_completion_month),
          year: sale.projected_completion_year,
          count: 0,
          estimatedValue: 0
        };
      }
      forecast[key].count++;
      forecast[key].estimatedValue += sale.contract_value || 0;
    });

    return Object.values(forecast).sort((a, b) => 
      `${a.year}-${a.month}`.localeCompare(`${b.year}-${b.month}`)
    );
  }, [sales]);

  // Phase timing chart data
  const phaseChartData = [
    { phase: 'Feasibility', avgDays: metrics.averagePhaseTimings.feasibility || 0 },
    { phase: 'Design & Materials', avgDays: metrics.averagePhaseTimings.design_material_selections || 0 },
    { phase: 'Engineering & Permits', avgDays: metrics.averagePhaseTimings.engineering_permits || 0 },
    { phase: 'Pending Construction', avgDays: metrics.averagePhaseTimings.pending_construction_sale || 0 }
  ];

  if (salesLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pre-Construction Reporting</h1>
          <p className="text-slate-500 mt-1">Track performance, timing, and pipeline forecasts</p>
        </div>
      </div>

      {/* Timeframe Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Current Month</SelectItem>
                  <SelectItem value="quarter">Current Quarter</SelectItem>
                  <SelectItem value="fiscal">Fiscal Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {timeframe === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="text-sm text-slate-600">
              Showing data from <strong>{startDate.toLocaleDateString()}</strong> to <strong>{endDate.toLocaleDateString()}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Gross Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Completed Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-slate-900">{metrics.completedCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Lost Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold text-slate-900">{metrics.lostCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-slate-900">{metrics.activeCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="phases">Phase Timings</TabsTrigger>
          <TabsTrigger value="forecast">Pipeline Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="phases">
          <Card>
            <CardHeader>
              <CardTitle>Average Time in Each Phase (Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={phaseChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgDays" fill="#F59E0B" name="Average Days" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Projected Completions by Month</CardTitle>
            </CardHeader>
            <CardContent>
              {forecastData.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No forecast data available. Projects need projected completion dates.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Estimated Value') return formatCurrency(value);
                        return value;
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3B82F6" name="Project Count" />
                    <Line yAxisId="right" type="monotone" dataKey="estimatedValue" stroke="#10B981" name="Estimated Value" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}