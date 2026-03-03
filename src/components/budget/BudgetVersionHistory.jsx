import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { History, RotateCcw, Eye, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

export default function BudgetVersionHistory({ budget, onRevert }) {
  const [previewVersion, setPreviewVersion] = useState(null);
  const [confirmRevert, setConfirmRevert] = useState(null);

  const history = [...(budget?.version_history || [])].sort((a, b) => b.version - a.version);
  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Version History</CardTitle>
          <p className="text-sm text-slate-500">Current version: <strong>v{budget?.current_version || 1}</strong></p>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No version history yet. Changes will be tracked automatically when you save.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.version} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">v{entry.version}</Badge>
                        {entry.version === budget?.current_version && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Current</Badge>
                        )}
                        <span className="text-xs text-slate-400">
                          {entry.change_summary || 'Budget updated'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {entry.changed_by_name || entry.changed_by || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a') : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {entry.snapshot && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPreviewVersion(entry)}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                      )}
                      {entry.version !== budget?.current_version && entry.snapshot && (
                        <Button variant="ghost" size="sm" className="text-xs text-amber-600 hover:text-amber-700" onClick={() => setConfirmRevert(entry)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Revert
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Version {previewVersion?.version} Snapshot</DialogTitle></DialogHeader>
          {previewVersion?.snapshot && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Name:</span> <strong>{previewVersion.snapshot.name || '—'}</strong></div>
                <div><span className="text-slate-500">Status:</span> <strong>{previewVersion.snapshot.status || '—'}</strong></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Revenue:</span> <strong>{fmt(previewVersion.snapshot.gross_revenue_projection)}</strong></div>
                <div><span className="text-slate-500">COGS:</span> <strong>{fmt(previewVersion.snapshot.cost_of_goods_sold_projection)}</strong></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Net Profit Target:</span> <strong>{fmt(previewVersion.snapshot.net_profit_target_amount)}</strong></div>
                <div><span className="text-slate-500">Net Profit %:</span> <strong>{previewVersion.snapshot.net_profit_target_percentage != null ? `${previewVersion.snapshot.net_profit_target_percentage}%` : '—'}</strong></div>
              </div>
              {previewVersion.snapshot.line_items?.length > 0 && (
                <div>
                  <p className="text-slate-500 mb-1">Line Items ({previewVersion.snapshot.line_items.length}):</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {previewVersion.snapshot.line_items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs bg-slate-50 rounded px-2 py-1">
                        <span>{item.category || 'Untitled'} ({item.type})</span>
                        <span>{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewVersion(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation */}
      <Dialog open={!!confirmRevert} onOpenChange={() => setConfirmRevert(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revert to Version {confirmRevert?.version}?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            This will restore the budget's summary fields and line items to version {confirmRevert?.version}. 
            A new version entry will be created to record this revert. Staff, assets, liabilities, and vehicles are not affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevert(null)}>Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { onRevert(confirmRevert); setConfirmRevert(null); }}>
              Revert to v{confirmRevert?.version}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}