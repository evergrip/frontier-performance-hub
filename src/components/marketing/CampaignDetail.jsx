import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, CheckCircle2, Copy, Edit2, Image } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ContentPieceEditor from './ContentPieceEditor';

const CHANNEL_CONFIG = {
  facebook: { label: 'Facebook', icon: '📘', color: 'bg-blue-100 text-blue-700' },
  instagram: { label: 'Instagram', icon: '📸', color: 'bg-pink-100 text-pink-700' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'bg-sky-100 text-sky-700' },
  x: { label: 'X (Twitter)', icon: '🐦', color: 'bg-slate-100 text-slate-700' },
  email: { label: 'Email', icon: '📧', color: 'bg-amber-100 text-amber-700' },
  blog: { label: 'Blog', icon: '📝', color: 'bg-green-100 text-green-700' },
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
  { value: 'skipped', label: 'Skipped' },
];

export default function CampaignDetail({ campaign, onBack, onUpdateCampaign }) {
  const [channelFilter, setChannelFilter] = useState('all');
  const [editingPiece, setEditingPiece] = useState(null);

  const pieces = campaign.content_pieces || [];
  const filteredPieces = channelFilter === 'all' ? pieces : pieces.filter(p => p.channel === channelFilter);
  const sortedPieces = [...filteredPieces].sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const handleStatusChange = (pieceId, newStatus) => {
    const updated = pieces.map(p => p.id === pieceId ? { ...p, status: newStatus } : p);
    onUpdateCampaign(campaign.id, { content_pieces: updated });
  };

  const handleCopy = (piece) => {
    const text = `${piece.title}\n\n${piece.body}${piece.hashtags ? '\n\n' + piece.hashtags : ''}${piece.call_to_action ? '\n\n' + piece.call_to_action : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Content copied to clipboard!');
  };

  const handleSavePiece = (updatedPiece) => {
    const updated = pieces.map(p => p.id === updatedPiece.id ? updatedPiece : p);
    onUpdateCampaign(campaign.id, { content_pieces: updated });
    setEditingPiece(null);
  };

  const handleCampaignStatusChange = (newStatus) => {
    onUpdateCampaign(campaign.id, { status: newStatus });
  };

  // Group by date for calendar view
  const dateGroups = {};
  sortedPieces.forEach(p => {
    const date = p.scheduled_date || 'Unscheduled';
    if (!dateGroups[date]) dateGroups[date] = [];
    dateGroups[date].push(p);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{campaign.name}</h2>
            <p className="text-slate-500">{campaign.topic}</p>
          </div>
        </div>
        <Select value={campaign.status} onValueChange={handleCampaignStatusChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Strategy Summary */}
      {campaign.ai_strategy_summary && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-900 mb-2">📋 Campaign Strategy</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{campaign.ai_strategy_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Pieces', value: pieces.length },
          { label: 'Approved', value: pieces.filter(p => p.status === 'approved').length },
          { label: 'Posted', value: pieces.filter(p => p.status === 'posted').length },
          { label: 'Channels', value: (campaign.channels || []).length },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-[#ea7924]">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Filter */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          className={`cursor-pointer ${channelFilter === 'all' ? 'bg-[#ea7924] text-white' : 'bg-slate-100 text-slate-600'}`}
          onClick={() => setChannelFilter('all')}
        >
          All Channels
        </Badge>
        {(campaign.channels || []).map(ch => {
          const cfg = CHANNEL_CONFIG[ch] || {};
          return (
            <Badge
              key={ch}
              className={`cursor-pointer ${channelFilter === ch ? 'bg-[#ea7924] text-white' : cfg.color}`}
              onClick={() => setChannelFilter(ch)}
            >
              {cfg.icon} {cfg.label}
            </Badge>
          );
        })}
      </div>

      {/* Content by Date */}
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4 space-y-4">
          {Object.entries(dateGroups).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-700">
                  {date === 'Unscheduled' ? date : format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <Badge variant="outline">{items.length} posts</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-6">
                {items.map(piece => (
                  <ContentCard
                    key={piece.id}
                    piece={piece}
                    onStatusChange={handleStatusChange}
                    onCopy={handleCopy}
                    onEdit={() => setEditingPiece(piece)}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-3">
          {sortedPieces.map(piece => (
            <ContentCard
              key={piece.id}
              piece={piece}
              onStatusChange={handleStatusChange}
              onCopy={handleCopy}
              onEdit={() => setEditingPiece(piece)}
              expanded
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit Piece Dialog */}
      {editingPiece && (
        <ContentPieceEditor
          piece={editingPiece}
          open={!!editingPiece}
          onClose={() => setEditingPiece(null)}
          onSave={handleSavePiece}
        />
      )}
    </div>
  );
}

function ContentCard({ piece, onStatusChange, onCopy, onEdit, expanded }) {
  const cfg = CHANNEL_CONFIG[piece.channel] || {};
  const statusColor = {
    draft: 'bg-slate-100 text-slate-600',
    approved: 'bg-green-100 text-green-700',
    posted: 'bg-blue-100 text-blue-700',
    skipped: 'bg-red-100 text-red-600',
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{cfg.icon}</span>
            <span className="text-xs font-medium text-slate-500">{cfg.label}</span>
            {piece.scheduled_time && (
              <span className="text-xs text-slate-400">{piece.scheduled_time}</span>
            )}
          </div>
          <Select value={piece.status} onValueChange={(v) => onStatusChange(piece.id, v)}>
            <SelectTrigger className="h-6 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {piece.title && <p className="font-semibold text-sm text-slate-900">{piece.title}</p>}
        <p className={`text-sm text-slate-600 ${expanded ? '' : 'line-clamp-3'}`}>{piece.body}</p>

        {piece.hashtags && (
          <p className="text-xs text-blue-600">{piece.hashtags}</p>
        )}
        {piece.call_to_action && (
          <p className="text-xs font-medium text-[#ea7924]">CTA: {piece.call_to_action}</p>
        )}

        <div className="flex gap-1 pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onCopy(piece)}>
            <Copy className="w-3 h-3" /> Copy
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onEdit}>
            <Edit2 className="w-3 h-3" /> Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}