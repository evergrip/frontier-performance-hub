import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { HardDrive, Loader2, CheckCircle2, AlertTriangle, Upload, FileText, ChevronDown, ChevronRight } from 'lucide-react';

export default function BuildertrendAnalyzer({ stage, leadId, leadData, progress }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await base44.functions.invoke('analyzeBuildertrend', {
      lead_id: leadId,
      stage_order: stage.stage_order,
      project_name: progress?.form_data?.bt_project_name || leadData?.title || '',
    });

    if (response.data?.error) {
      setError(response.data.error);
    } else {
      setResult(response.data);
    }
    setLoading(false);
  };

  const analysis = result?.analysis;
  const priorityColors = { high: 'text-red-700 bg-red-50', medium: 'text-amber-700 bg-amber-50', low: 'text-slate-600 bg-slate-50' };
  const statusIcons = { found: '✅', expected: '🔵', missing: '❌' };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        size="sm"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Buildertrend Files...</>
        ) : (
          <><HardDrive className="w-4 h-4 mr-2" /> Analyze Current Buildertrend Files</>
        )}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> Analysis Error
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {result && analysis && (
        <div className="space-y-3 border border-orange-200 rounded-lg bg-orange-50/30 p-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${result.bt_connection_status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-slate-600">
              Buildertrend: {result.bt_connection_status === 'connected' ? 'Connected' : 'Offline Mode (AI-assisted)'}
            </span>
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div className="p-2 bg-white border border-slate-200 rounded text-xs text-slate-700">
              {analysis.summary}
            </div>
          )}

          {/* Field Suggestions */}
          {analysis.field_suggestions && Object.keys(analysis.field_suggestions).length > 0 && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
              <p className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Suggested Form Values
              </p>
              <div className="space-y-1">
                {Object.entries(analysis.field_suggestions).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-[11px]">
                    <span className="text-slate-600 font-mono">{key}</span>
                    <span className="text-emerald-700 font-medium max-w-[60%] text-right truncate">{String(value)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 italic">Open the form above and use Co-Pilot to apply these suggestions.</p>
            </div>
          )}

          {/* Gaps */}
          {analysis.gaps?.length > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded">
              <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Missing Items ({analysis.gaps.length})
              </p>
              <ul className="text-[11px] text-amber-700 space-y-0.5">
                {analysis.gaps.map((gap, i) => (
                  <li key={i}>• {gap}</li>
                ))}
              </ul>
            </div>
          )}

          {/* File Inventory (collapsible) */}
          {analysis.file_inventory?.length > 0 && (
            <div>
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                {showFiles ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <FileText className="w-3 h-3" /> File Inventory ({analysis.file_inventory.length})
              </button>
              {showFiles && (
                <div className="mt-1 space-y-1">
                  {analysis.file_inventory.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] p-1.5 bg-white rounded border border-slate-100">
                      <span>{statusIcons[file.status] || '🔵'}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-800">{file.file_name}</span>
                        <span className="text-slate-400 ml-1">({file.category})</span>
                      </div>
                      {file.notes && <span className="text-slate-500 truncate max-w-[120px]">{file.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Checklist */}
          {analysis.upload_checklist?.length > 0 && (
            <div>
              <button
                onClick={() => setShowChecklist(!showChecklist)}
                className="flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-900"
              >
                {showChecklist ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Upload className="w-3 h-3" /> Upload Checklist ({analysis.upload_checklist.length})
              </button>
              {showChecklist && (
                <div className="mt-1 space-y-1">
                  {analysis.upload_checklist.map((item, i) => (
                    <div key={i} className={`flex items-start gap-2 text-[11px] p-1.5 rounded border ${priorityColors[item.priority] || 'bg-slate-50 text-slate-600'}`}>
                      <input type="checkbox" className="mt-0.5 rounded" />
                      <div className="flex-1">
                        <span className="font-medium">{item.item}</span>
                        {item.destination_folder && (
                          <span className="text-slate-500 ml-1">→ {item.destination_folder}</span>
                        )}
                      </div>
                      <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${priorityColors[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}