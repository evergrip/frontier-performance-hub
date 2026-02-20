import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function WizardStepGoals({ config, setConfig, onNext }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Campaign Details</h2>
        <p className="text-slate-500">Define the basics — name, timing, and goals</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input
              value={config.name}
              onChange={e => setConfig(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Spring Launch 2026"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={config.start_date}
                onChange={e => setConfig(p => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign Duration</Label>
              <Select value={config.duration_weeks} onValueChange={v => setConfig(p => ({ ...p, duration_weeks: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Week</SelectItem>
                  <SelectItem value="2">2 Weeks</SelectItem>
                  <SelectItem value="4">4 Weeks (1 Month)</SelectItem>
                  <SelectItem value="8">8 Weeks (2 Months)</SelectItem>
                  <SelectItem value="12">12 Weeks (3 Months)</SelectItem>
                  <SelectItem value="24">24 Weeks (6 Months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Campaign Goal</Label>
            <Textarea
              placeholder="e.g., Generate 50 new leads, increase brand awareness, promote new service..."
              value={config.goal}
              onChange={e => setConfig(p => ({ ...p, goal: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Textarea
              placeholder="e.g., Homeowners aged 30-55, commercial property managers, real estate developers..."
              value={config.target_audience}
              onChange={e => setConfig(p => ({ ...p, target_audience: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Content Tone</Label>
            <Select value={config.tone} onValueChange={v => setConfig(p => ({ ...p, tone: v }))}>
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-[#ea7924] hover:bg-[#d66a1f] gap-2" onClick={onNext} disabled={!config.name.trim()}>
          Next: Choose Channels <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}