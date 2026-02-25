import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Upload, Save, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandingSettingsSection({ settings, settingsId, onSaved }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#ea7924');
  const [accentColor, setAccentColor] = useState('#d66a1f');
  const [companyName, setCompanyName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logo_url || '');
      setPrimaryColor(settings.primary_color || '#ea7924');
      setAccentColor(settings.accent_color || '#d66a1f');
      setCompanyName(settings.company_name || '');
    }
  }, [settings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    setUploading(false);
    toast.success('Logo uploaded');
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      logo_url: logoUrl,
      primary_color: primaryColor,
      accent_color: accentColor,
      company_name: companyName,
    };
    if (settingsId) {
      await base44.entities.CompanySettings.update(settingsId, data);
    } else {
      await base44.entities.CompanySettings.create(data);
    }
    setSaving(false);
    toast.success('Branding saved. Reload the page to see changes in the sidebar.');
    onSaved?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Branding &amp; Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Name */}
        <div>
          <Label>Company Name (shown in sidebar)</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Frontier Building Group"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <Label>Logo</Label>
          <p className="text-xs text-slate-500 mb-2">Upload a square logo (recommended 200×200px or larger). Displayed in the sidebar header.</p>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative w-16 h-16 rounded-xl border bg-white flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                <Building2 className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </Button>
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Primary Color</Label>
            <p className="text-xs text-slate-500 mb-2">Used for active nav items, buttons, and highlights</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#ea7924"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Accent Color</Label>
            <p className="text-xs text-slate-500 mb-2">Used for gradients and secondary highlights</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#d66a1f"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Label className="mb-2 block">Preview</Label>
          <div className="border rounded-xl p-4 bg-white flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{companyName || 'Company Name'}</h3>
              <p className="text-xs text-slate-500">Performance Hub</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Branding'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}