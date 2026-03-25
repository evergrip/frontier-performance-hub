import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Upload, Image, FileText, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AppendixPhotosTab({ study, onStudyUpdated }) {
  const [appendixItems, setAppendixItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (study) {
      setAppendixItems((study.appendix_items || []).map((item, i) => ({ ...item, sort_order: item.sort_order ?? i })));
      setPhotos((study.photos || []).map((p, i) => ({ ...p, sort_order: p.sort_order ?? i })));
      setSaved(false);
    }
  }, [study?.id]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.FeasibilityStudy.update(study.id, {
      appendix_items: appendixItems.map((item, i) => ({ ...item, sort_order: i })),
      photos: photos.map((p, i) => ({ ...p, sort_order: i }))
    });
    onStudyUpdated?.();
    setSaving(false);
    setSaved(true);
    toast.success('Appendix & photos saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const addAppendixItem = () => {
    setAppendixItems(prev => [...prev, { title: '', content: '', sort_order: prev.length }]);
    setSaved(false);
  };

  const updateAppendixItem = (index, field, value) => {
    setAppendixItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    setSaved(false);
  };

  const removeAppendixItem = (index) => {
    setAppendixItems(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos(prev => [...prev, { url: file_url, caption: '', sort_order: prev.length }]);
    }
    setUploading(false);
    setSaved(false);
  };

  const updatePhoto = (index, field, value) => {
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    setSaved(false);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Appendix Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Appendix Items
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Add text sections that appear in the report appendix</p>
          </div>
          <Button size="sm" variant="outline" onClick={addAppendixItem} className="gap-1">
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>

        {appendixItems.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center text-sm text-slate-400">
            No appendix items yet. Click "Add Item" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {appendixItems.map((item, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-slate-300 mt-2 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Appendix item title"
                        value={item.title || ''}
                        onChange={e => updateAppendixItem(idx, 'title', e.target.value)}
                      />
                      <Textarea
                        placeholder="Content / description..."
                        value={item.content || ''}
                        onChange={e => updateAppendixItem(idx, 'content', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button size="icon" variant="ghost" className="shrink-0 text-slate-400 hover:text-red-500" onClick={() => removeAppendixItem(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Photos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Image className="w-4 h-4" /> Photos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Upload photos to include in the report appendix</p>
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              multiple
              id="photo-upload"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button size="sm" variant="outline" onClick={() => document.getElementById('photo-upload').click()} className="gap-1" disabled={uploading}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Uploading...' : 'Upload Photos'}
            </Button>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center text-sm text-slate-400">
            No photos yet. Upload images to include in the report.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="relative aspect-video bg-slate-100">
                  <img src={photo.url} alt={photo.caption || `Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => removePhoto(idx)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <CardContent className="p-3">
                  <Input
                    placeholder="Photo caption..."
                    value={photo.caption || ''}
                    onChange={e => updatePhoto(idx, 'caption', e.target.value)}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Appendix & Photos'}
        </Button>
      </div>
    </div>
  );
}