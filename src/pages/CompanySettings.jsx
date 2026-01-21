import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanySettings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    fiscal_year_start_month: 1,
    fiscal_year_start_day: 1,
    company_name: '',
    annual_construction_goal: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser?.role !== 'admin') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  const existingSetting = settings[0];

  useEffect(() => {
    if (existingSetting) {
      setFormData({
        fiscal_year_start_month: existingSetting.fiscal_year_start_month || 1,
        fiscal_year_start_day: existingSetting.fiscal_year_start_day || 1,
        company_name: existingSetting.company_name || '',
        annual_construction_goal: existingSetting.annual_construction_goal || ''
      });
    }
  }, [existingSetting]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSetting) {
        return base44.entities.CompanySettings.update(existingSetting.id, data);
      } else {
        return base44.entities.CompanySettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['company-settings']);
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSettingsMutation.mutate({
      fiscal_year_start_month: parseInt(formData.fiscal_year_start_month),
      fiscal_year_start_day: parseInt(formData.fiscal_year_start_day),
      company_name: formData.company_name,
      annual_construction_goal: formData.annual_construction_goal ? parseFloat(formData.annual_construction_goal) : null
    });
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company Settings</h1>
        <p className="text-slate-500 mt-1">Configure fiscal year and company-wide settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Frontier Building Group"
                />
              </div>

              <div>
                <Label>Annual Construction Revenue Goal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.annual_construction_goal}
                  onChange={(e) => setFormData({ ...formData, annual_construction_goal: e.target.value })}
                  placeholder="5000000"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Used for tracking whether preconstruction is keeping pace with construction capacity
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Fiscal Year Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fiscal Year Start Month</Label>
                  <Select
                    value={formData.fiscal_year_start_month.toString()}
                    onValueChange={(val) => setFormData({ ...formData, fiscal_year_start_month: parseInt(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fiscal Year Start Day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.fiscal_year_start_day}
                    onChange={(e) => setFormData({ ...formData, fiscal_year_start_day: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Your fiscal year starts on{' '}
                  <strong>
                    {months.find(m => m.value === parseInt(formData.fiscal_year_start_month))?.label} {formData.fiscal_year_start_day}
                  </strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saveSettingsMutation.isPending}>
              <DollarSign className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}