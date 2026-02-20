import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';

const CHANNELS = [
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'x', label: 'X (Twitter)', icon: '🐦' },
  { value: 'email', label: 'Email Newsletter', icon: '📧' },
  { value: 'blog', label: 'Blog Post', icon: '📝' },
];

export default function CampaignConfigurator({ topic, onGenerate, loading }) {
  const [config, setConfig] = useState({
    name: `${topic.label} Campaign`,
    goal: '',
    target_audience: '',
    channels: ['facebook', 'instagram', 'linkedin', 'x', 'email', 'blog'],
    duration_weeks: '4',
    start_date: new Date().toISOString().split('T')[0],
    tone: 'professional_friendly',
    additional_notes: '',
  });

  const toggleChannel = (ch) => {
    setConfig(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(c => c !== ch)
        : [...prev.channels, ch]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Configure Your Campaign</h2>
        <p className="text-slate-500">Topic: <span className="font-semibold text-[#ea7924]">{topic.label}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Campaign Name</Label>
          <Input value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="date" value={config.start_date} onChange={e => setConfig({ ...config, start_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Campaign Duration</Label>
          <Select value={config.duration_weeks} onValueChange={v => setConfig({ ...config, duration_weeks: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Week</SelectItem>
              <SelectItem value="2">2 Weeks</SelectItem>
              <SelectItem value="4">4 Weeks (1 Month)</SelectItem>
              <SelectItem value="8">8 Weeks (2 Months)</SelectItem>
              <SelectItem value="12">12 Weeks (3 Months)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Content Tone</Label>
          <Select value={config.tone} onValueChange={v => setConfig({ ...config, tone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional_friendly">Professional & Friendly</SelectItem>
              <SelectItem value="bold_energetic">Bold & Energetic</SelectItem>
              <SelectItem value="educational">Educational & Informative</SelectItem>
              <SelectItem value="casual_fun">Casual & Fun</SelectItem>
              <SelectItem value="luxury_premium">Luxury & Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Campaign Goal</Label>
        <Textarea
          placeholder="e.g., Generate 50 new leads, increase brand awareness, promote new service..."
          value={config.goal}
          onChange={e => setConfig({ ...config, goal: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Target Audience</Label>
        <Textarea
          placeholder="e.g., Homeowners aged 30-55, commercial property managers, real estate developers..."
          value={config.target_audience}
          onChange={e => setConfig({ ...config, target_audience: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Channels</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CHANNELS.map(ch => (
            <Card
              key={ch.value}
              className={`cursor-pointer transition-all ${
                config.channels.includes(ch.value) ? 'ring-2 ring-[#ea7924] bg-orange-50' : 'hover:bg-slate-50'
              }`}
              onClick={() => toggleChannel(ch.value)}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <Checkbox checked={config.channels.includes(ch.value)} />
                <span className="text-lg">{ch.icon}</span>
                <span className="font-medium text-sm">{ch.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Additional Notes for AI</Label>
        <Textarea
          placeholder="Any specific messaging, promotions, upcoming events, or constraints..."
          value={config.additional_notes}
          onChange={e => setConfig({ ...config, additional_notes: e.target.value })}
        />
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="bg-[#ea7924] hover:bg-[#d66a1f] gap-2"
          onClick={() => onGenerate(config)}
          disabled={loading || config.channels.length === 0}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {loading ? 'AI is Creating Your Campaign...' : 'Generate Campaign Content'}
        </Button>
      </div>
    </div>
  );
}