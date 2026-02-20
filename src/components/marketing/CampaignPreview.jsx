import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Calendar, ListChecks, Video, PartyPopper, Mic, Gift, Mail, FileText, 
  ChevronDown, ChevronUp
} from 'lucide-react';

const channelColors = {
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-sky-100 text-sky-700',
  x: 'bg-slate-100 text-slate-700',
  email: 'bg-amber-100 text-amber-700',
  podcast: 'bg-purple-100 text-purple-700',
  events: 'bg-green-100 text-green-700',
  contests: 'bg-red-100 text-red-700',
  video: 'bg-indigo-100 text-indigo-700',
  mailing: 'bg-teal-100 text-teal-700',
};

const categoryIcons = {
  video_production: Video,
  photography: Video,
  graphic_design: FileText,
  copywriting: FileText,
  event_planning: PartyPopper,
  podcast: Mic,
  mailing: Mail,
  contest: Gift,
  social_media: Calendar,
  other: ListChecks,
};

function ExpandableCard({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader className="cursor-pointer py-3" onClick={() => setOpen(!open)}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">{title}</CardTitle>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

export default function CampaignPreview({ campaign, brief, channels }) {
  const content = campaign.content_calendar || [];
  const tasks = campaign.tasks || [];
  const videos = campaign.video_productions || [];
  const events = campaign.events || [];
  const podcasts = campaign.podcasts || [];
  const contests = campaign.contests || [];
  const mailings = campaign.mailings || [];

  return (
    <div className="space-y-4">
      {/* Strategy */}
      <Card className="border-[#ea7924]/20 bg-orange-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📋 Strategy Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 whitespace-pre-line">{campaign.strategy_summary}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="calendar" className="text-xs">📅 Content ({content.length})</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">✅ Tasks ({tasks.length})</TabsTrigger>
          {videos.length > 0 && <TabsTrigger value="videos" className="text-xs">🎬 Videos ({videos.length})</TabsTrigger>}
          {events.length > 0 && <TabsTrigger value="events" className="text-xs">🎉 Events ({events.length})</TabsTrigger>}
          {podcasts.length > 0 && <TabsTrigger value="podcasts" className="text-xs">🎙️ Podcasts ({podcasts.length})</TabsTrigger>}
          {contests.length > 0 && <TabsTrigger value="contests" className="text-xs">🎁 Contests ({contests.length})</TabsTrigger>}
          {mailings.length > 0 && <TabsTrigger value="mailings" className="text-xs">📧 Mailings ({mailings.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="calendar" className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
          {content.sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((item, i) => (
            <ExpandableCard key={i} title={
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 text-xs">{item.date}</span>
                <Badge className={channelColors[item.channel] || 'bg-slate-100 text-slate-600'} >{item.channel}</Badge>
                <Badge variant="outline" className="text-xs">{item.content_type}</Badge>
                <span className="font-medium">{item.title}</span>
              </div>
            }>
              <div className="space-y-2 text-sm">
                <div><strong>Caption:</strong> <p className="text-slate-600 whitespace-pre-line">{item.caption}</p></div>
                {item.hashtags && <div><strong>Hashtags:</strong> <span className="text-blue-600">{item.hashtags}</span></div>}
                {item.visual_direction && <div><strong>Visual:</strong> <span className="text-slate-600">{item.visual_direction}</span></div>}
              </div>
            </ExpandableCard>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
          {tasks.map((task, i) => {
            const Icon = categoryIcons[task.category] || ListChecks;
            return (
              <ExpandableCard key={i} title={
                <div className="flex items-center gap-2 flex-wrap">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <Badge variant="outline" className={`text-xs ${task.priority === 'urgent' ? 'border-red-300 text-red-700' : task.priority === 'high' ? 'border-orange-300 text-orange-700' : ''}`}>
                    {task.priority}
                  </Badge>
                  <span className="font-medium">{task.title}</span>
                  <span className="text-slate-500 text-xs ml-auto">{task.due_date}</span>
                </div>
              }>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-600">{task.description}</p>
                  {task.details && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <strong>Detailed Instructions:</strong>
                      <p className="text-slate-600 whitespace-pre-line mt-1">{task.details}</p>
                    </div>
                  )}
                  {task.deliverables?.length > 0 && (
                    <div>
                      <strong>Deliverables:</strong>
                      <ul className="list-disc list-inside text-slate-600 mt-1">
                        {task.deliverables.map((d, j) => <li key={j}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </ExpandableCard>
            );
          })}
        </TabsContent>

        {videos.length > 0 && (
          <TabsContent value="videos" className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
            {videos.map((vid, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Video className="w-4 h-4 text-indigo-500" /> {vid.title}
                    <Badge variant="outline" className="text-xs ml-auto">{vid.duration_seconds}s</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-slate-600">{vid.purpose}</p>
                  <div><strong>Shot List:</strong><ul className="list-decimal list-inside text-slate-600">{(vid.shot_list || []).map((s, j) => <li key={j}>{s}</li>)}</ul></div>
                  <div><strong>B-Roll Needed:</strong><ul className="list-disc list-inside text-slate-600">{(vid.b_roll_needed || []).map((b, j) => <li key={j}>{b}</li>)}</ul></div>
                  {vid.voiceover_script && <div className="bg-slate-50 p-3 rounded-lg"><strong>Voiceover Script:</strong><p className="text-slate-600 mt-1 whitespace-pre-line">{vid.voiceover_script}</p></div>}
                  {vid.music_direction && <div><strong>Music Direction:</strong> <span className="text-slate-600">{vid.music_direction}</span></div>}
                  <div className="flex gap-1">{(vid.platforms || []).map(p => <Badge key={p} className={channelColors[p] || 'bg-slate-100'}>{p}</Badge>)}</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {events.length > 0 && (
          <TabsContent value="events" className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
            {events.map((evt, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PartyPopper className="w-4 h-4 text-green-500" /> {evt.name}
                    <Badge variant="outline" className="text-xs ml-auto">{evt.date}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="text-slate-600">{evt.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 pt-2">
                    <span>📍 {evt.location || 'TBD'}</span>
                    <span>💰 ${evt.budget || 0}</span>
                    <span>👥 {evt.expected_attendance || '?'} expected</span>
                  </div>
                  {evt.promotion_plan && <div className="bg-slate-50 p-2 rounded text-xs"><strong>Promotion:</strong> {evt.promotion_plan}</div>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {podcasts.length > 0 && (
          <TabsContent value="podcasts" className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
            {podcasts.map((pod, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-500" /> {pod.episode_title}
                    <Badge variant="outline" className="text-xs ml-auto">{pod.duration_minutes}min</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-slate-600">{pod.topic}</p>
                  <div><strong>Suggested Guests:</strong><ul className="list-disc list-inside text-slate-600">{(pod.suggested_guests || []).map((g, j) => <li key={j}>{g}</li>)}</ul></div>
                  <div><strong>Talking Points:</strong><ul className="list-decimal list-inside text-slate-600">{(pod.talking_points || []).map((t, j) => <li key={j}>{t}</li>)}</ul></div>
                  {pod.promotion_plan && <div className="bg-slate-50 p-2 rounded text-xs"><strong>Promotion:</strong> {pod.promotion_plan}</div>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {contests.length > 0 && (
          <TabsContent value="contests" className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
            {contests.map((c, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gift className="w-4 h-4 text-red-500" /> {c.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="text-slate-600">{c.description}</p>
                  <p><strong>Prize:</strong> {c.prize}</p>
                  <p><strong>Rules:</strong> {c.rules}</p>
                  <p className="text-xs text-slate-500">{c.start_date} → {c.end_date}</p>
                  <div className="flex gap-1">{(c.platforms || []).map(p => <Badge key={p} className={channelColors[p] || 'bg-slate-100'}>{p}</Badge>)}</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {mailings.length > 0 && (
          <TabsContent value="mailings" className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
            {mailings.map((m, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-teal-500" /> {m.subject}
                    <Badge variant="outline" className="text-xs">{m.type}</Badge>
                    <span className="text-slate-500 text-xs ml-auto">{m.send_date}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="text-slate-600">{m.content_summary}</p>
                  <p><strong>Audience:</strong> {m.target_audience}</p>
                  <p><strong>CTA:</strong> {m.call_to_action}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}