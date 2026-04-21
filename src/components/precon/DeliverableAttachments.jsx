import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Paperclip, Upload, Trash2, FileText, Image, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

function getFileIcon(name) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(name)) return Image;
  return FileText;
}

export default function DeliverableAttachments({ attachments = [], onSave }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (inputRef.current) inputRef.current.value = '';
    setUploading(true);
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return { url: result.file_url, name: file.name, uploaded_at: new Date().toISOString() };
      })
    );
    onSave([...attachments, ...uploaded]);
    setUploading(false);
    toast.success(`${uploaded.length} file(s) uploaded`);
  };

  const handleDelete = (index) => {
    onSave(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFiles} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Paperclip className="w-3.5 h-3.5" /> Attachments ({attachments.length})
        </p>
        <Button
          type="button" variant="outline" size="sm" className="text-xs h-7 px-2"
          disabled={uploading} onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
          Upload
        </Button>
      </div>
      {attachments.length === 0 && <p className="text-xs text-slate-400 italic">No files attached yet.</p>}
      <div className="space-y-1">
        {attachments.map((att, i) => {
          const Icon = getFileIcon(att.name);
          return (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5 group">
              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-700 flex-1 truncate">{att.name}</span>
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button type="button" onClick={() => handleDelete(i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}