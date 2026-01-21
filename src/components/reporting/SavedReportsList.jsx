import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Users } from 'lucide-react';

export default function SavedReportsList({ reports, onLoad, onDelete, activeReportId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Saved Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No saved reports yet</p>
        ) : (
          reports.map(report => (
            <div
              key={report.id}
              className={`p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors ${
                activeReportId === report.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200'
              }`}
              onClick={() => onLoad(report)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-slate-900 truncate">{report.name}</p>
                  </div>
                  {report.description && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{report.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {report.data_source}
                    </Badge>
                    {report.is_public && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        Shared
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(report.id);
                  }}
                  className="flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}