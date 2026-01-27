import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BarChart3, Briefcase, Building2, FileText, TrendingUp, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';
import { getFiscalYearDates } from '../components/utils/fiscalYear';
import SalesReport from '../components/reports/SalesReport';
import PreConstructionReport from '../components/reports/PreConstructionReport';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRangeType, setDateRangeType] = useState('fiscal');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('all');

  const { data: companySettings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    initialData: [],
  });

  const { data: fiscalGoals = [] } = useQuery({
    queryKey: ['fiscalGoals'],
    queryFn: () => base44.entities.FiscalGoal.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const getDateRange = () => {
    switch (dateRangeType) {
      case 'month': {
        const date = new Date(selectedMonth);
        return {
          start: startOfMonth(date),
          end: endOfMonth(date)
        };
      }
      case 'quarter': {
        const quarterNum = parseInt(selectedQuarter.replace('Q', ''));
        const date = new Date(new Date().getFullYear(), (quarterNum - 1) * 3, 1);
        return {
          start: startOfQuarter(date),
          end: endOfQuarter(date)
        };
      }
      case 'fiscal': {
        const settings = companySettings[0];
        const fiscalStartMonth = settings?.fiscal_year_start_month;
        
        if (fiscalStartMonth) {
          // Use centralized fiscal year calculation
          const { startDate, endDate } = getFiscalYearDates(selectedFiscalYear, fiscalStartMonth);
          return {
            start: startDate,
            end: endDate
          };
        } else {
          // Fallback to calendar year if no fiscal start month is set
          const date = new Date(selectedFiscalYear, 0, 1);
          return {
            start: startOfYear(date),
            end: endOfYear(date)
          };
        }
      }
      case 'custom': {
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null
        };
      }
      default:
        return { start: null, end: null };
    }
  };

  const dateRange = getDateRange();
  const availableYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Reports & Analytics</h1>
        <p className="text-lg text-slate-500">Department-specific reporting and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Report Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Range Type</Label>
              <Select value={dateRangeType} onValueChange={setDateRangeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="fiscal">Fiscal Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRangeType === 'month' && (
              <div>
                <Label>Select Month</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {dateRangeType === 'quarter' && (
              <div>
                <Label>Select Quarter</Label>
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 (Jan - Mar)</SelectItem>
                    <SelectItem value="Q2">Q2 (Apr - Jun)</SelectItem>
                    <SelectItem value="Q3">Q3 (Jul - Sep)</SelectItem>
                    <SelectItem value="Q4">Q4 (Oct - Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {dateRangeType === 'fiscal' && (
              <div>
                <Label>Fiscal Year</Label>
                <Select value={selectedFiscalYear.toString()} onValueChange={(v) => setSelectedFiscalYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => {
                      const settings = companySettings[0];
                      const fiscalStartMonth = settings?.fiscal_year_start_month || 1;
                      const { label } = getFiscalYearDates(year, fiscalStartMonth);
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dateRangeType === 'custom' && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {dateRange.start && dateRange.end && (
              <div className="md:col-span-2">
                <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium mb-1">Selected Range:</p>
                  <p>{format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Filter by Staff Member</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="preconstruction" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Pre-Construction
          </TabsTrigger>
          <TabsTrigger value="construction" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Construction
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Company
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 mt-6">
          <SalesReport dateRange={dateRange} staffId={selectedStaffId} />
        </TabsContent>

        <TabsContent value="preconstruction" className="space-y-6 mt-6">
          <PreConstructionReport dateRange={dateRange} staffId={selectedStaffId} />
        </TabsContent>

        <TabsContent value="construction" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Construction Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Construction reports and metrics will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Company-wide reports and metrics will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}