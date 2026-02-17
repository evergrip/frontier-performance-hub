import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { getFiscalYearLabel } from '../utils/fiscalYear';

export default function BuildCapacityForecast({ capacityForecast, currentFiscalGoal, fiscalYear, fiscalYearStartMonth, settings }) {
  if (!capacityForecast) return null;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Build Capacity Forecast
        </CardTitle>
        <CardDescription>
          Based on {getFiscalYearLabel(fiscalYear, fiscalYearStartMonth)} revenue target of ${(currentFiscalGoal.revenue_target / 1000000).toFixed(1)}M
          {capacityForecast.usingGrowthForecast && settings.next_year_revenue_target && (
            <> · Next year: ${(settings.next_year_revenue_target / 1000000).toFixed(1)}M</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <p className="text-xs text-slate-600 mb-1">Monthly Capacity</p>
            <p className="text-2xl font-bold text-blue-700">
              ${(capacityForecast.monthlyCapacity / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {capacityForecast.hasManualCapacity ? 'Manual override' : 'From annual target'}
              {capacityForecast.usingGrowthForecast && (
                <> · Next: ${(capacityForecast.nextYearMonthlyCapacity / 1000).toFixed(0)}K</>
              )}
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-amber-200">
            <p className="text-xs text-slate-600 mb-1">Active Projects</p>
            <p className="text-2xl font-bold text-amber-700">
              ${(capacityForecast.activeProjectsValue / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-slate-500 mt-1">In construction</p>
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-emerald-200">
            <p className="text-xs text-slate-600 mb-1">Precon Pipeline</p>
            <p className="text-2xl font-bold text-emerald-700">
              ${(capacityForecast.preconPipelineValue / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-slate-500 mt-1">Expected construction</p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg border-2 border-slate-300">
            <p className="text-xs text-slate-600 mb-1 font-semibold">New Client Wait Time</p>
            <p className="text-3xl font-bold text-slate-900">
              {capacityForecast.monthsOfBacklog.toFixed(1)}
            </p>
            <p className="text-xs text-slate-600 mt-1">Months backlog</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Total Pipeline:</strong> ${(capacityForecast.totalPipeline / 1000).toFixed(0)}K
            <span className="mx-2">•</span>
            New clients can expect to start construction in approximately <strong>{Math.ceil(capacityForecast.monthsOfBacklog)} months</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}