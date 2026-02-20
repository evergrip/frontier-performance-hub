import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Hash, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-purple-100 text-purple-700',
};

const CHANNEL_ICONS = {
  facebook: '📘',
  instagram: '📸',
  linkedin: '💼',
  x: '🐦',
  email: '📧',
  blog: '📝',
};

export default function CampaignList({ campaigns, onView, onDelete }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No campaigns yet</p>
        <p className="text-sm">Create your first marketing campaign to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {campaigns.map(campaign => {
        const totalPieces = campaign.content_pieces?.length || 0;
        const approvedPieces = (campaign.content_pieces || []).filter(p => p.status === 'approved' || p.status === 'posted').length;
        
        return (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{campaign.topic}</p>
                </div>
                <Badge className={STATUS_COLORS[campaign.status] || STATUS_COLORS.draft}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.goal && (
                <p className="text-sm text-slate-600 line-clamp-2">{campaign.goal}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-slate-500">
                {campaign.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(campaign.start_date), 'MMM d')} - {campaign.end_date ? format(new Date(campaign.end_date), 'MMM d, yyyy') : `${campaign.duration_weeks}w`}
                  </span>
                )}
                <span>{totalPieces} content pieces</span>
              </div>

              {/* Channels */}
              <div className="flex gap-1">
                {(campaign.channels || []).map(ch => (
                  <span key={ch} className="text-lg" title={ch}>{CHANNEL_ICONS[ch] || '📌'}</span>
                ))}
              </div>

              {/* Progress */}
              {totalPieces > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Content ready</span>
                    <span>{approvedPieces}/{totalPieces}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ea7924] rounded-full transition-all"
                      style={{ width: `${(approvedPieces / totalPieces) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => onView(campaign)}>
                  <Eye className="w-3.5 h-3.5" /> View Campaign
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => onDelete(campaign)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}