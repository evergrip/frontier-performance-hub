import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, DollarSign, TrendingUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function PreConstructionReport({ dateRange, staffId }) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthDialogOpen, setMonthDialogOpen] = useState(false);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const preconPhases = [
    'feasibility',
    'design_material_selections',
    'engineering_permits',
    'pending_construction_sale'
  ];

  const phaseLabels = {
    feasibility: 'Feasibility',
    design_material_selections: 'Design & Material Selections',
    engineering_permits: 'Engineering & Permits',
    pending_construction_sale: 'Pending Construction Sale'
  };

  // Filter preconstruction sales active or closed in the date range
  const filteredSales = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    
    return sales.filter(sale => {
      if (sale.sale_type !== 'preconstruction') return false;
      if (!sale.close_date) return false;
      
      const saleCloseDate = new Date(sale.close_date);
      
      // Include if sale closed within the date range
      const inDateRange = saleCloseDate >= dateRange.start && saleCloseDate <= dateRange.end;
      
      const staffMatch = staffId === 'all' || sale.assigned_to === staffId;
      
      return inDateRange && staffMatch;
    });
  }, [sales, dateRange, staffId]);

  // Calculate average time in each phase
  const phaseAverages = useMemo(() => {
    const phaseTimes = {};
    
    preconPhases.forEach(phase => {
      phaseTimes[phase] = [];
    });

    filteredSales.forEach(sale => {
      if (!sale.phase_history || sale.phase_history.length === 0) return;

      const history = [...sale.phase_history].sort((a, b) => 
        new Date(a.entered_date) - new Date(b.entered_date)
      );

      for (let i = 0; i < history.length - 1; i++) {
        const currentPhase = history[i];
        const nextPhase = history[i + 1];
        
        const startDate = new Date(currentPhase.entered_date);
        const endDate = new Date(nextPhase.entered_date);
        const days = differenceInDays(endDate, startDate);
        
        if (phaseTimes[currentPhase.status]) {
          phaseTimes[currentPhase.status].push(days);
        }
      }

      // Handle the last phase
      const lastPhase = history[history.length - 1];
      if (phaseTimes[lastPhase.status] && sale.status === lastPhase.status) {
        const startDate = new Date(lastPhase.entered_date);
        const endDate = new Date();
        const days = differenceInDays(endDate, startDate);
        phaseTimes[lastPhase.status].push(days);
      }
    });

    return preconPhases.map(phase => ({
      phase: phaseLabels[phase],
      averageDays: phaseTimes[phase].length > 0
        ? Math.round(phaseTimes[phase].reduce((a, b) => a + b, 0) / phaseTimes[phase].length)
        : 0,
      count: phaseTimes[phase].length
    }));
  }, [filteredSales]);

  // Calculate gross revenue
  const grossRevenue = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + (sale.contract_value || 0), 0);
  }, [filteredSales]);

  // Calculate construction pipeline forecast
  const pipelineForecast = useMemo(() => {
    const activePipeline = sales.filter(sale => 
      sale.sale_type === 'preconstruction' && 
      sale.status !== 'closed_won' && 
      sale.status !== 'closed_lost' &&
      (staffId === 'all' || sale.assigned_to === staffId)
    );

    const forecastByMonth = {};

    activePipeline.forEach(sale => {
      if (!sale.target_precon_completion_date || !sale.estimated_construction_budget) return;

      const completionDate = new Date(sale.target_precon_completion_date);
      const monthKey = format(completionDate, 'MMM yyyy');

      if (!forecastByMonth[monthKey]) {
        forecastByMonth[monthKey] = {
          month: monthKey,
          total: 0,
          count: 0,
          sales: []
        };
      }

      forecastByMonth[monthKey].total += sale.estimated_construction_budget;
      forecastByMonth[monthKey].count += 1;
      forecastByMonth[monthKey].sales.push(sale);
    });

    return Object.values(forecastByMonth).sort((a, b) => 
      new Date(a.month) - new Date(b.month)
    );
  }, [sales, staffId]);

  const handleMonthClick = (monthData) => {
    setSelectedMonth(monthData);
    setMonthDialogOpen(true);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Unknown Client';
  };

  const statusLabels = {
    feasibility: 'Feasibility',
    design_material_selections: 'Design & Materials',
    engineering_permits: 'Engineering & Permits',
    pending_construction_sale: 'Pending Construction'
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Loading pre-construction data...</div>;
  }

  if (!dateRange.start || !dateRange.end) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          Please select a date range to view pre-construction reports
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            Pre-Construction Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">
              Gross Revenue ({format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')})
            </p>
            <p className="text-4xl font-bold text-blue-600">
              ${Math.round(grossRevenue).toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 mt-2">{filteredSales.length} projects started</p>
          </div>
        </CardContent>
      </Card>

      {/* Average Phase Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Average Time in Each Phase
          </CardTitle>
        </CardHeader>
        <CardContent>
          {phaseAverages.some(p => p.count > 0) ? (
            <>
              <div className="mb-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={phaseAverages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="phase" 
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                    />
                    <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="averageDays" fill="#F59E0B" name="Average Days" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phase</TableHead>
                    <TableHead className="text-right">Average Days</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phaseAverages.map((phase, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{phase.phase}</TableCell>
                      <TableCell className="text-right">{phase.averageDays}</TableCell>
                      <TableCell className="text-right">{phase.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-center py-8 text-slate-500">
              No phase history data available for the selected period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Construction Pipeline Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Construction Pipeline Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineForecast.length > 0 ? (
            <>
              <div className="mb-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pipelineForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      label={{ value: 'Construction Budget', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => `$${Math.round(value).toLocaleString()}`}
                    />
                    <Bar dataKey="total" fill="#10B981" name="Est. Construction Budget" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expected Completion Month</TableHead>
                    <TableHead className="text-right">Est. Construction Budget</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineForecast.map((item, idx) => (
                    <TableRow 
                      key={idx} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleMonthClick(item)}
                    >
                      <TableCell className="font-medium">{item.month}</TableCell>
                      <TableCell className="text-right">
                        ${Math.round(item.total).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell>Total Pipeline</TableCell>
                    <TableCell className="text-right">
                      ${Math.round(pipelineForecast.reduce((sum, item) => sum + item.total, 0)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {pipelineForecast.reduce((sum, item) => sum + item.count, 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-center py-8 text-slate-500">
              No active pipeline projects with estimated construction budgets
            </p>
          )}
        </CardContent>
      </Card>

      {/* Month Details Dialog */}
      <Dialog open={monthDialogOpen} onOpenChange={setMonthDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Projects Expected to Complete in {selectedMonth?.month}</DialogTitle>
          </DialogHeader>
          {selectedMonth && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">Total Est. Construction</p>
                    <p className="text-xl font-bold text-emerald-700">
                      ${Math.round(selectedMonth.total).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Projects</p>
                    <p className="text-xl font-bold text-slate-900">{selectedMonth.count}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {selectedMonth.sales.map((sale) => (
                  <Card key={sale.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{sale.title}</h4>
                          <p className="text-sm text-slate-600">{getClientName(sale.client_id)}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          {statusLabels[sale.status] || sale.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-600">Precon Value</p>
                          <p className="text-sm font-semibold text-slate-900">
                            ${((sale.contract_value || 0) / 1000).toFixed(0)}k
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2">
                          <p className="text-xs text-slate-600">Est. Construction</p>
                          <p className="text-sm font-semibold text-emerald-700">
                            ${((sale.estimated_construction_budget || 0) / 1000).toFixed(0)}k
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-xs text-slate-600">Target Date</p>
                          <p className="text-sm font-semibold text-blue-700">
                            {format(new Date(sale.target_precon_completion_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}