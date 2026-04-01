import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Building2, Wrench, Layers } from 'lucide-react';
import { getFiscalYearLabel } from '../utils/fiscalYear';

export default function BuildCapacityForecast({ capacityForecast, currentFiscalGoal, fiscalYear, fiscalYearStartMonth, settings }) {
  if (!capacityForecast) return null;

  const buildTypeColors = {
    in_house: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'In-House' },
    subcontractor: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Subcontractor' },
    mixed: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: 'Mixed' },
  };

  const {
    activeInHouse = 0, activeSub = 0, activeMixed = 0,
    preconInHouse = 0, preconSub = 0, preconMixed = 0,
    excludedProjectsCount = 0, excludedSalesCount = 0,
  } = capacityForecast;

  const totalInHouse = activeInHouse + preconInHouse;
  const totalSub = activeSub + preconSub;
  const totalMixed = activeMixed + preconMixed;
  const totalExcluded = excludedProjectsCount + excludedSalesCount;

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
          {totalExcluded > 0 && (
            <span className="ml-2 text-amber-600">· {totalExcluded} excluded from forecast</span>
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
            {(activeInHouse > 0 || activeSub > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activeInHouse > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{Building2 && '🏠'} ${(activeInHouse / 1000).toFixed(0)}K in-house</span>}
                {activeSub > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">🔧 ${(activeSub / 1000).toFixed(0)}K sub</span>}
                {activeMixed > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">⚙️ ${(activeMixed / 1000).toFixed(0)}K mixed</span>}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-emerald-200">
            <p className="text-xs text-slate-600 mb-1">Precon Pipeline</p>
            <p className="text-2xl font-bold text-emerald-700">
              ${(capacityForecast.preconPipelineValue / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-slate-500 mt-1">Expected construction</p>
            {(preconInHouse > 0 || preconSub > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {preconInHouse > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">🏠 ${(preconInHouse / 1000).toFixed(0)}K in-house</span>}
                {preconSub > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">🔧 ${(preconSub / 1000).toFixed(0)}K sub</span>}
                {preconMixed > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">⚙️ ${(preconMixed / 1000).toFixed(0)}K mixed</span>}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg border-2 border-slate-300">
            <p className="text-xs text-slate-600 mb-1 font-semibold">New Client Wait Time</p>
            <p className="text-3xl font-bold text-slate-900">
              {capacityForecast.monthsOfBacklog.toFixed(1)}
            </p>
            <p className="text-xs text-slate-600 mt-1">Months backlog</p>
          </div>
        </div>

        {/* Summary bar with in-house vs sub breakdown */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Total Pipeline:</strong> ${(capacityForecast.totalPipeline / 1000).toFixed(0)}K
            <span className="mx-2">•</span>
            New clients can expect to start construction in approximately <strong>{Math.ceil(capacityForecast.monthsOfBacklog)} months</strong>
          </p>
          {(totalInHouse > 0 || totalSub > 0 || totalMixed > 0) && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              {totalInHouse > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                  <Building2 className="w-3 h-3" /> In-House: ${(totalInHouse / 1000).toFixed(0)}K
                </span>
              )}
              {totalSub > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-800 font-medium">
                  <Wrench className="w-3 h-3" /> Subcontractor: ${(totalSub / 1000).toFixed(0)}K
                </span>
              )}
              {totalMixed > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium">
                  <Layers className="w-3 h-3" /> Mixed: ${(totalMixed / 1000).toFixed(0)}K
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}