import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Paperclip, Link2, X, Upload, Loader2, ExternalLink, FileText } from 'lucide-react';

export default function MeetingMaterials({ materials = [], onChange, readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const newMaterials = [...materials];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newMaterials.push({ type: 'file', name: file.name, url: file_url });
    }
    onChange(newMaterials);
    setUploading(false);
    e.target.value = '';
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    const name = linkName.trim() || linkUrl.trim();
    onChange([...materials, { type: 'link', name, url: linkUrl.trim() }]);
    setLinkName('');
    setLinkUrl('');
    setShowLinkForm(false);
  };

  const handleRemove = (index) => {
    onChange(materials.filter((_, i) => i !== index));
  };

  const getFileName = (item) => {
    if (item.name) return item.name;
    try { return decodeURIComponent(item.url.split('/').pop().split('?')[0]); } catch { return 'File'; }
  };

  return (
    <div>
      <Label className="text-base font-semibold flex items-center gap-2 mb-2">
        <Paperclip className="w-4 h-4" /> Meeting Materials
      </Label>

      {/* List of materials */}
      {materials.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {materials.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 group">
              {item.type === 'link' ? (
                <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate flex-1"
              >
                {getFileName(item)}
              </a>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </a>
              {!readOnly && (
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleRemove(idx)}>
                  <X className="w-3.5 h-3.5 text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {materials.length === 0 && readOnly && (
        <p className="text-sm text-slate-400 mb-2">No materials attached.</p>
      )}

      {/* Add buttons */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="relative" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              {uploading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowLinkForm(!showLinkForm)}>
              <Link2 className="w-4 h-4 mr-1" /> Add Link
            </Button>
          </div>

          {showLinkForm && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  value={linkName}
                  onChange={e => setLinkName(e.target.value)}
                  placeholder="e.g. Project Brief"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">URL *</Label>
                <Input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                />
              </div>
              <Button type="button" size="sm" className="h-8" onClick={handleAddLink} disabled={!linkUrl.trim()}>
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setShowLinkForm(false); setLinkName(''); setLinkUrl(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}