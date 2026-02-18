import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, Save, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import MonthlyCapacitySchedule from '../components/admin/MonthlyCapacitySchedule';

export default function CompanySettings() {
  const queryClient = useQueryClient();
  const [settingsId, setSettingsId] = useState(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(new Date().getFullYear());

  const { data: settings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    initialData: [],
  });

  const { data: fiscalGoals = [] } = useQuery({
    queryKey: ['fiscalGoals'],
    queryFn: () => base44.entities.FiscalGoal.list(),
    initialData: [],
  });

  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    fiscal_year_start_month: '',
    project_closeout_variance_threshold: 3,
    default_currency: 'USD',
    next_year_revenue_target: '',
    notes: ''
  });

  const [fiscalData, setFiscalData] = useState({
    revenue_target: '',
    gross_margin_target: '',
    net_margin_target: '',
    operating_expense_budget: '',
    project_count_target: '',
    sales_volume_target: '',
    ebitda_target: '',
    cash_flow_target: '',
    notes: ''
  });

  React.useEffect(() => {
    if (settings.length > 0) {
      const setting = settings[0];
      setSettingsId(setting.id);
      setFormData({
        company_name: setting.company_name || '',
        address: setting.address || '',
        phone: setting.phone || '',
        email: setting.email || '',
        website: setting.website || '',
        tax_id: setting.tax_id || '',
        fiscal_year_start_month: setting.fiscal_year_start_month || '',
        project_closeout_variance_threshold: setting.project_closeout_variance_threshold || 3,
        default_currency: setting.default_currency || 'USD',
        next_year_revenue_target: setting.next_year_revenue_target || '',
        notes: setting.notes || ''
      });
    }
  }, [settings]);

  React.useEffect(() => {
    const currentGoal = fiscalGoals.find(g => g.fiscal_year === selectedFiscalYear);
    if (currentGoal) {
      setFiscalData({
        revenue_target: currentGoal.revenue_target || '',
        gross_margin_target: currentGoal.gross_margin_target || '',
        net_margin_target: currentGoal.net_margin_target || '',
        operating_expense_budget: currentGoal.operating_expense_budget || '',
        project_count_target: currentGoal.project_count_target || '',
        sales_volume_target: currentGoal.sales_volume_target || '',
        ebitda_target: currentGoal.ebitda_target || '',
        cash_flow_target: currentGoal.cash_flow_target || '',
        notes: currentGoal.notes || ''
      });
    } else {
      setFiscalData({
        revenue_target: '',
        gross_margin_target: '',
        net_margin_target: '',
        operating_expense_budget: '',
        project_count_target: '',
        sales_volume_target: '',
        ebitda_target: '',
        cash_flow_target: '',
        notes: ''
      });
    }
  }, [selectedFiscalYear, fiscalGoals]);

  const saveSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (settingsId) {
        return base44.entities.CompanySettings.update(settingsId, data);
      } else {
        return base44.entities.CompanySettings.create(data);
      }
    },
    onSuccess: (result) => {
      if (!settingsId) {
        setSettingsId(result.id);
      }
      queryClient.invalidateQueries(['companySettings']);
      toast.success('Settings saved successfully');
    }
  });

  const handleSaveCompanyInfo = (e) => {
    e.preventDefault();
    saveSettingsMutation.mutate({
      company_name: formData.company_name,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      website: formData.website,
      tax_id: formData.tax_id,
      notes: formData.notes
    });
  };

  const handleSaveBusinessSettings = (e) => {
    e.preventDefault();
    saveSettingsMutation.mutate({
      fiscal_year_start_month: formData.fiscal_year_start_month ? Number(formData.fiscal_year_start_month) : null,
      project_closeout_variance_threshold: formData.project_closeout_variance_threshold ? Number(formData.project_closeout_variance_threshold) : 3,
      default_currency: formData.default_currency,
      next_year_revenue_target: formData.next_year_revenue_target ? Number(formData.next_year_revenue_target) : null
    });
  };

  const saveFiscalGoalsMutation = useMutation({
    mutationFn: (data) => {
      const existingGoal = fiscalGoals.find(g => g.fiscal_year === selectedFiscalYear);
      if (existingGoal) {
        return base44.entities.FiscalGoal.update(existingGoal.id, data);
      } else {
        return base44.entities.FiscalGoal.create({ ...data, fiscal_year: selectedFiscalYear });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fiscalGoals']);
      toast.success('Fiscal goals saved successfully');
    }
  });

  const handleSaveFiscalGoals = (e) => {
    e.preventDefault();
    saveFiscalGoalsMutation.mutate(fiscalData);
  };

  const availableYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Company Settings</h1>
        <p className="text-lg text-slate-500">Manage company information and configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCompanyInfo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Frontier Construction"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="info@frontier.com"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://frontier.com"
                />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div>
              <Label>Tax ID / EIN</Label>
              <Input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                placeholder="12-3456789"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional company information..."
                rows={4}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saveSettingsMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBusinessSettings} className="space-y-4">
            <div>
              <Label>Fiscal Year Start Month</Label>
              <Select 
                value={formData.fiscal_year_start_month.toString()}
                onValueChange={(value) => setFormData({...formData, fiscal_year_start_month: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project Closeout Variance Threshold (%)</Label>
              <p className="text-xs text-slate-500 mb-2">
                When actual gross revenue differs from contract value by more than this percentage, 
                construction managers must explain the variance during project closeout.
              </p>
              <Input 
                type="number" 
                step="0.1"
                value={formData.project_closeout_variance_threshold}
                onChange={(e) => setFormData({...formData, project_closeout_variance_threshold: e.target.value})}
                placeholder="3" 
              />
            </div>
            <div>
              <Label>Default Currency</Label>
              <Input 
                type="text" 
                value={formData.default_currency}
                onChange={(e) => setFormData({...formData, default_currency: e.target.value})}
                placeholder="USD" 
              />
            </div>
            <div>
              <Label>Next Year Revenue Target</Label>
              <p className="text-xs text-slate-500 mb-2">
                Set the revenue target for next fiscal year to forecast growth capacity
              </p>
              <Input 
                type="number" 
                value={formData.next_year_revenue_target}
                onChange={(e) => setFormData({...formData, next_year_revenue_target: e.target.value})}
                placeholder="6000000" 
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saveSettingsMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Staff Scheduler</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable the staff scheduling module for project day assignments, employee scheduling, and subtrade management
              </p>
            </div>
            <Switch
              checked={settings[0]?.scheduler_enabled || false}
              onCheckedChange={(checked) => {
                saveSettingsMutation.mutate({ scheduler_enabled: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <MonthlyCapacitySchedule
        settings={settings[0] || {}}
        settingsId={settingsId}
        onSave={(data) => saveSettingsMutation.mutate(data)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Annual Fiscal Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveFiscalGoals} className="space-y-4">
            <div>
              <Label>Fiscal Year</Label>
              <Select 
                value={selectedFiscalYear.toString()} 
                onValueChange={(value) => setSelectedFiscalYear(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Revenue Target
                </Label>
                <Input
                  type="number"
                  value={fiscalData.revenue_target}
                  onChange={(e) => setFiscalData({...fiscalData, revenue_target: e.target.value})}
                  placeholder="5000000"
                />
              </div>
              <div>
                <Label>Sales Volume Target</Label>
                <Input
                  type="number"
                  value={fiscalData.sales_volume_target}
                  onChange={(e) => setFiscalData({...fiscalData, sales_volume_target: e.target.value})}
                  placeholder="6000000"
                />
              </div>
              <div>
                <Label>Gross Margin Target (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={fiscalData.gross_margin_target}
                  onChange={(e) => setFiscalData({...fiscalData, gross_margin_target: e.target.value})}
                  placeholder="30"
                />
              </div>
              <div>
                <Label>Net Margin Target (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={fiscalData.net_margin_target}
                  onChange={(e) => setFiscalData({...fiscalData, net_margin_target: e.target.value})}
                  placeholder="15"
                />
              </div>
              <div>
                <Label>Operating Expense Budget</Label>
                <Input
                  type="number"
                  value={fiscalData.operating_expense_budget}
                  onChange={(e) => setFiscalData({...fiscalData, operating_expense_budget: e.target.value})}
                  placeholder="750000"
                />
              </div>
              <div>
                <Label>EBITDA Target</Label>
                <Input
                  type="number"
                  value={fiscalData.ebitda_target}
                  onChange={(e) => setFiscalData({...fiscalData, ebitda_target: e.target.value})}
                  placeholder="1000000"
                />
              </div>
              <div>
                <Label>Cash Flow Target</Label>
                <Input
                  type="number"
                  value={fiscalData.cash_flow_target}
                  onChange={(e) => setFiscalData({...fiscalData, cash_flow_target: e.target.value})}
                  placeholder="800000"
                />
              </div>
              <div>
                <Label>Project Count Target</Label>
                <Input
                  type="number"
                  value={fiscalData.project_count_target}
                  onChange={(e) => setFiscalData({...fiscalData, project_count_target: e.target.value})}
                  placeholder="25"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={fiscalData.notes}
                onChange={(e) => setFiscalData({...fiscalData, notes: e.target.value})}
                placeholder="Additional fiscal goals and objectives..."
                rows={3}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saveFiscalGoalsMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Fiscal Goals
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}