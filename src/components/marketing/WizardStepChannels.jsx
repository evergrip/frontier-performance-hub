import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const CHANNEL_CATEGORIES = [
  {
    category: 'Social Media',
    channels: [
      { value: 'facebook', label: 'Facebook', icon: '📘', desc: 'Community posts, stories, engagement' },
      { value: 'instagram', label: 'Instagram', icon: '📸', desc: 'Visual posts, reels, stories, carousels' },
      { value: 'linkedin', label: 'LinkedIn', icon: '💼', desc: 'Professional thought leadership' },
      { value: 'x', label: 'X (Twitter)', icon: '🐦', desc: 'Quick updates, threads, engagement' },
      { value: 'tiktok', label: 'TikTok', icon: '🎵', desc: 'Short-form video, trends, behind-the-scenes' },
      { value: 'youtube', label: 'YouTube', icon: '📺', desc: 'Long-form video, tutorials, vlogs' },
    ],
  },
  {
    category: 'Content & Media',
    channels: [
      { value: 'blog', label: 'Blog Posts', icon: '📝', desc: 'SEO articles, guides, project stories' },
      { value: 'podcast', label: 'Podcast', icon: '🎙️', desc: 'Episodes, guest interviews, industry talk' },
      { value: 'video', label: 'Video Production', icon: '🎬', desc: 'Produced videos, testimonials, showcases' },
      { value: 'infographic', label: 'Infographics', icon: '📊', desc: 'Visual data, process diagrams, stats' },
      { value: 'case_study', label: 'Case Studies', icon: '📋', desc: 'Detailed project breakdowns & results' },
    ],
  },
  {
    category: 'Direct Outreach',
    channels: [
      { value: 'email', label: 'Email Newsletter', icon: '📧', desc: 'Newsletters, drip campaigns, announcements' },
      { value: 'sms', label: 'SMS / Text', icon: '💬', desc: 'Short promotional messages, reminders' },
      { value: 'direct_mail', label: 'Direct Mail', icon: '📮', desc: 'Physical mailers, postcards, brochures' },
    ],
  },
  {
    category: 'Events & PR',
    channels: [
      { value: 'event', label: 'Events', icon: '🎪', desc: 'Open houses, trade shows, workshops, webinars' },
      { value: 'press_release', label: 'Press Releases', icon: '📰', desc: 'Media announcements, news coverage' },
      { value: 'partnership', label: 'Partnerships', icon: '🤝', desc: 'Co-marketing, sponsorships, collabs' },
    ],
  },
  {
    category: 'Paid Advertising',
    channels: [
      { value: 'google_ads', label: 'Google Ads', icon: '🔍', desc: 'Search, display, and video ads' },
      { value: 'social_ads', label: 'Social Media Ads', icon: '📢', desc: 'Paid promotions on social platforms' },
      { value: 'retargeting', label: 'Retargeting', icon: '🎯', desc: 'Re-engage website visitors' },
    ],
  },
];

export default function WizardStepChannels({ config, setConfig, onNext, onBack }) {
  const toggleChannel = (ch) => {
    setConfig(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(c => c !== ch)
        : [...prev.channels, ch]
    }));
  };

  const selectAll = (categoryChannels) => {
    const vals = categoryChannels.map(c => c.value);
    const allSelected = vals.every(v => config.channels.includes(v));
    setConfig(prev => ({
      ...prev,
      channels: allSelected
        ? prev.channels.filter(c => !vals.includes(c))
        : [...new Set([...prev.channels, ...vals])]
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Choose Your Channels</h2>
        <p className="text-slate-500">
          Select all the channels you want content for — the AI will tailor content for each
        </p>
        <Badge className="bg-[#ea7924] text-white">{config.channels.length} selected</Badge>
      </div>

      {CHANNEL_CATEGORIES.map(cat => {
        const catValues = cat.channels.map(c => c.value);
        const allSelected = catValues.every(v => config.channels.includes(v));
        return (
          <div key={cat.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">{cat.category}</h3>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectAll(cat.channels)}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {cat.channels.map(ch => (
                <Card
                  key={ch.value}
                  className={`cursor-pointer transition-all ${
                    config.channels.includes(ch.value) ? 'ring-2 ring-[#ea7924] bg-orange-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => toggleChannel(ch.value)}
                >
                  <CardContent className="p-3 flex items-start gap-2">
                    <Checkbox checked={config.channels.includes(ch.value)} className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{ch.icon}</span>
                        <span className="font-medium text-sm text-slate-900">{ch.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{ch.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button className="bg-[#ea7924] hover:bg-[#d66a1f] gap-2" onClick={onNext} disabled={config.channels.length === 0}>
          Next: Customize <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}