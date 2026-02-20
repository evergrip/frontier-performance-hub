import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Sparkles, Calendar, Target, Users, Palette } from 'lucide-react';
import { format, addWeeks } from 'date-fns';

const CHANNEL_LABELS = {
  facebook: '📘 Facebook', instagram: '📸 Instagram', linkedin: '💼 LinkedIn', x: '🐦 X',
  tiktok: '🎵 TikTok', youtube: '📺 YouTube', blog: '📝 Blog', podcast: '🎙️ Podcast',
  video: '🎬 Video', infographic: '📊 Infographic', case_study: '📋 Case Study',
  email: '📧 Email', sms: '💬 SMS', direct_mail: '📮 Direct Mail',
  event: '🎪 Events', press_release: '📰 Press Release', partnership: '🤝 Partnerships',
  google_ads: '🔍 Google Ads', social_ads: '📢 Social Ads', retargeting: '🎯 Retargeting',
};

const TONE_LABELS = {
  professional_friendly: 'Professional & Friendly',
  bold_energetic: 'Bold & Energetic',
  educational: 'Educational & Informative',
  casual_fun: 'Casual & Fun',
  luxury_premium: 'Luxury & Premium',
};

export default function WizardStepReview({ config, topic, onGenerate, onBack, loading }) {
  const startDate = config.start_date ? new Date(config.start_date) : new Date();
  const endDate = addWeeks(startDate, parseInt(config.duration_weeks));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Review Your Campaign</h2>
        <p className="text-slate-500">Everything look good? The AI will generate your full campaign.</p>
      </div>

      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-slate-500">Campaign</p>
            <p className="text-xl font-bold text-slate-900">{config.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Topic</p>
            <p className="font-semibold text-[#ea7924]">{topic?.label}</p>
            {topic?.desc && topic.desc !== 'Custom topic' && (
              <p className="text-sm text-slate-600">{topic.desc}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Duration</p>
                <p className="text-sm font-medium">{format(startDate, 'MMM d')} — {format(endDate, 'MMM d, yyyy')}</p>
                <p className="text-xs text-slate-400">{config.duration_weeks} weeks</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Palette className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Tone</p>
                <p className="text-sm font-medium">{TONE_LABELS[config.tone] || config.tone}</p>
              </div>
            </div>
          </div>

          {config.goal && (
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Goal</p>
                <p className="text-sm">{config.goal}</p>
              </div>
            </div>
          )}

          {config.target_audience && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Audience</p>
                <p className="text-sm">{config.target_audience}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-500 mb-2">Channels ({config.channels.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {config.channels.map(ch => (
                <Badge key={ch} className="bg-white text-slate-700 border">
                  {CHANNEL_LABELS[ch] || ch}
                  {config.channel_frequency?.[ch] && (
                    <span className="ml-1 text-slate-400">({config.channel_frequency[ch]})</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {config.additional_notes && (
            <div>
              <p className="text-sm text-slate-500">Additional Notes</p>
              <p className="text-sm text-slate-600">{config.additional_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          size="lg"
          className="bg-[#ea7924] hover:bg-[#d66a1f] gap-2 shadow-lg shadow-orange-200"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI is Crafting Your Campaign...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Campaign
            </>
          )}
        </Button>
      </div>

      {loading && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 text-center text-sm text-slate-500">
            <p className="font-medium mb-1">This may take 30-60 seconds</p>
            <p>The AI is creating a comprehensive strategy, scheduling content, and writing all your posts, emails, scripts, and more...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}