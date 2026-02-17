import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { getFiscalYearLabel } from '../utils/fiscalYear';

export default function FiscalGoalProgress({ currentFiscalGoal, totalRevenue, marginPercent, filteredProjectsCount, fiscalYear, fiscalYearStartMonth }) {
  if (!currentFiscalGoal) return null;

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          {getFiscalYearLabel(fiscalYear, fiscalYearStartMonth, true)} Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {currentFiscalGoal.revenue_target && (
            <div>
              <p className="text-sm text-slate-600 mb-1">Revenue Target</p>
              <p className="text-2xl font-bold text-slate-900">
                ${(totalRevenue / 1000).toFixed(0)}K / ${(currentFiscalGoal.revenue_target / 1000).toFixed(0)}K
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((totalRevenue / currentFiscalGoal.revenue_target) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          {currentFiscalGoal.gross_margin_target && (
            <div>
              <p className="text-sm text-slate-600 mb-1">Margin Target</p>
              <p className="text-2xl font-bold text-slate-900">
                {marginPercent.toFixed(1)}% / {currentFiscalGoal.gross_margin_target}%
              </p>
              <div className="flex items-center gap-2 mt-2">
                {marginPercent >= currentFiscalGoal.gross_margin_target ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
              </div>
            </div>
          )}
          {currentFiscalGoal.project_count_target && (
            <div>
              <p className="text-sm text-slate-600 mb-1">Project Target</p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredProjectsCount} / {currentFiscalGoal.project_count_target}
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((filteredProjectsCount / currentFiscalGoal.project_count_target) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}