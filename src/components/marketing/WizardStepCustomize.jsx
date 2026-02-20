import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const CHANNEL_LABELS = {
  facebook: '📘 Facebook', instagram: '📸 Instagram', linkedin: '💼 LinkedIn', x: '🐦 X',
  tiktok: '🎵 TikTok', youtube: '📺 YouTube', blog: '📝 Blog', podcast: '🎙️ Podcast',
  video: '🎬 Video', infographic: '📊 Infographic', case_study: '📋 Case Study',
  email: '📧 Email', sms: '💬 SMS', direct_mail: '📮 Direct Mail',
  event: '🎪 Events', press_release: '📰 Press Release', partnership: '🤝 Partnerships',
  google_ads: '🔍 Google Ads', social_ads: '📢 Social Ads', retargeting: '🎯 Retargeting',
};

const DEFAULT_FREQUENCY = {
  facebook: '3/week', instagram: '4/week', linkedin: '2/week', x: '5/week',
  tiktok: '3/week', youtube: '1/week', blog: '1/week', podcast: '1/biweekly',
  video: '1/week', infographic: '1/biweekly', case_study: '1/month',
  email: '1/week', sms: '1/week', direct_mail: '1/month',
  event: '1/month', press_release: '1/month', partnership: '1/month',
  google_ads: 'Ongoing', social_ads: 'Ongoing', retargeting: 'Ongoing',
};

export default function WizardStepCustomize({ config, setConfig, onNext, onBack }) {
  const setFrequency = (channel, freq) => {
    setConfig(prev => ({
      ...prev,
      channel_frequency: { ...prev.channel_frequency, [channel]: freq }
    }));
  };

  const setChannelNote = (channel, note) => {
    setConfig(prev => ({
      ...prev,
      channel_notes: { ...prev.channel_notes, [channel]: note }
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Customize Per Channel</h2>
        <p className="text-slate-500">Set posting frequency and add channel-specific notes</p>
      </div>

      <div className="space-y-3">
        {config.channels.map(ch => (
          <Card key={ch}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 min-w-[150px]">
                  <span className="font-medium text-sm">{CHANNEL_LABELS[ch] || ch}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Frequency</Label>
                    <Input
                      value={config.channel_frequency?.[ch] || DEFAULT_FREQUENCY[ch] || '2/week'}
                      onChange={e => setFrequency(ch, e.target.value)}
                      placeholder="e.g., 3/week"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Special instructions</Label>
                    <Input
                      value={config.channel_notes?.[ch] || ''}
                      onChange={e => setChannelNote(ch, e.target.value)}
                      placeholder="e.g., focus on before/after photos"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label>Additional Campaign Notes</Label>
          <Textarea
            placeholder="Any overall messaging, upcoming events, seasonal themes, promotions, brand guidelines, or constraints the AI should know about..."
            value={config.additional_notes}
            onChange={e => setConfig(p => ({ ...p, additional_notes: e.target.value }))}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button className="bg-[#ea7924] hover:bg-[#d66a1f] gap-2" onClick={onNext}>
          Next: Review & Generate <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}