import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { List, BarChart3 } from 'lucide-react';

export default function SalesByMonthReport({ dateRange, staffId }) {
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || client?.contact_name || 'Unknown';
  };

  const getSalesperson = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unassigned';
  };

  const getSaleDate = (sale) => {
    const history = sale.phase_history || [];
    if (history.length > 0) {
      // Use the first phase entry date (when the sale was created/started)
      return new Date(history[0].entered_date);
    }
    return new Date(sale.created_date);
  };

  const { monthlyData, filteredSales, chartData } = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return { monthlyData: {}, filteredSales: [], chartData: [] };

    // Filter sales by staff and date range
    const filtered = sales.filter(sale => {
      if (staffId && staffId !== 'all' && sale.assigned_to !== staffId) return false;
      const saleDate = getSaleDate(sale);
      return saleDate >= dateRange.start && saleDate <= dateRange.end;
    });

    // Group by month
    const grouped = {};
    filtered.forEach(sale => {
      const saleDate = getSaleDate(sale);
      const monthKey = format(saleDate, 'yyyy-MM');
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(sale);
    });

    // Build chart data for each month in the range
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    const chart = months.map(monthStart => {
      const key = format(monthStart, 'yyyy-MM');
      const monthSales = grouped[key] || [];
      const preconValue = monthSales
        .filter(s => s.sale_type === 'preconstruction')
        .reduce((sum, s) => sum + (s.contract_value || 0), 0);
      const constructionValue = monthSales
        .filter(s => s.sale_type === 'construction')
        .reduce((sum, s) => sum + (s.contract_value || 0), 0);
      return {
        month: format(monthStart, 'MMM yyyy'),
        precon: preconValue,
        construction: constructionValue,
        total: preconValue + constructionValue,
        count: monthSales.length,
      };
    });

    return { monthlyData: grouped, filteredSales: filtered, chartData: chart };
  }, [sales, dateRange, staffId]);

  const totalValue = filteredSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);
  const sortedMonths = Object.keys(monthlyData).sort();

  if (!dateRange.start || !dateRange.end) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Select a date range to view sales by month.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Total Sales</p>
            <p className="text-3xl font-bold text-slate-900">{filteredSales.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Total Value</p>
            <p className="text-3xl font-bold text-emerald-600">${Math.round(totalValue).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Avg per Month</p>
            <p className="text-3xl font-bold text-blue-600">
              ${chartData.length > 0 ? Math.round(totalValue / chartData.length).toLocaleString() : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Sales Value by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500">No data for the selected range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
                          <p className="font-semibold mb-1">{d.month}</p>
                          <p className="text-blue-600">Precon: ${Math.round(d.precon).toLocaleString()}</p>
                          <p className="text-emerald-600">Construction: ${Math.round(d.construction).toLocaleString()}</p>
                          <p className="text-slate-800 font-semibold">Total: ${Math.round(d.total).toLocaleString()}</p>
                          <p className="text-slate-500">{d.count} sale{d.count !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="precon" stackId="a" fill="#6366f1" name="Pre-Construction" />
                <Bar dataKey="construction" stackId="a" fill="#10b981" name="Construction" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Detail Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5 text-slate-500" />
            Sales Detail by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedMonths.length === 0 ? (
            <p className="text-sm text-slate-500">No sales found for the selected {staffId && staffId !== 'all' ? 'salesperson and ' : ''}date range.</p>
          ) : (
            <div className="space-y-6">
              {sortedMonths.map(monthKey => {
                const monthSales = monthlyData[monthKey];
                const monthTotal = monthSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);
                const monthLabel = format(new Date(monthKey + '-01'), 'MMMM yyyy');

                return (
                  <div key={monthKey}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-900">{monthLabel}</h4>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{monthSales.length} sale{monthSales.length !== 1 ? 's' : ''}</Badge>
                        <span className="text-sm font-bold text-emerald-600">${Math.round(monthTotal).toLocaleString()}</span>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Client</TableHead>
                          {(!staffId || staffId === 'all') && <TableHead>Salesperson</TableHead>}
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthSales
                          .sort((a, b) => getSaleDate(a) - getSaleDate(b))
                          .map(sale => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-medium">{sale.title}</TableCell>
                              <TableCell>{getClientName(sale.client_id)}</TableCell>
                              {(!staffId || staffId === 'all') && (
                                <TableCell>{getSalesperson(sale.assigned_to)}</TableCell>
                              )}
                              <TableCell>
                                <Badge className={sale.sale_type === 'preconstruction' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}>
                                  {sale.sale_type === 'preconstruction' ? 'Precon' : 'Construction'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-slate-500 capitalize">
                                  {(sale.status || '').replace(/_/g, ' ')}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                ${Math.round(sale.contract_value || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}