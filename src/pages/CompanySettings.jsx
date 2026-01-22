import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanySettings() {
  const queryClient = useQueryClient();
  const [settingsId, setSettingsId] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
    initialData: [],
  });

  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    fiscal_year_start: '',
    default_currency: 'USD',
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
        fiscal_year_start: setting.fiscal_year_start || '',
        default_currency: setting.default_currency || 'USD',
        notes: setting.notes || ''
      });
    }
  }, [settings]);

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
      fiscal_year_start: formData.fiscal_year_start,
      default_currency: formData.default_currency
    });
  };

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
              <Label>Fiscal Year Start</Label>
              <Input 
                type="month" 
                value={formData.fiscal_year_start}
                onChange={(e) => setFormData({...formData, fiscal_year_start: e.target.value})}
                placeholder="Select month" 
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
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saveSettingsMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}