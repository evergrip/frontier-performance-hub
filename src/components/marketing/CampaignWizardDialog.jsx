import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, ChevronRight, ChevronLeft, Rocket, Wand2, Lightbulb, RefreshCw } from 'lucide-react';
import WizardStepIndicator from './WizardStepIndicator';
import CampaignPreview from './CampaignPreview';

const CHANNELS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'events', label: 'Events' },
  { value: 'contests', label: 'Contests / Giveaways' },
  { value: 'video', label: 'Video Production' },
  { value: 'mailing', label: 'Physical Mailings' },
];

const STEPS = ['Brief', 'Focus Topic', 'Channels', 'AI Generation', 'Review & Launch'];

export default function CampaignWizardDialog({ open, onOpenChange, onComplete }) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState({
    name: '',
    objective: '',
    target_audience: '',
    budget: '',
    start_date: '',
    end_date: '',
    additional_context: '',
  });
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [generatedCampaign, setGeneratedCampaign] = useState(null);
  const [suggestedTopics, setSuggestedTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const toggleChannel = (ch) => {
    setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const generateTopics = async () => {
    setLoadingTopics(true);
    setSuggestedTopics([]);
    setSelectedTopic(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a world-class marketing strategist for a HOME BUILDING & RENOVATION construction company called "Frontier Building Group" based in Halifax, Nova Scotia.

Based on the following campaign brief, suggest 5 FOCUSED campaign topic angles. Each campaign should have ONE clear, singular theme — not a buffet of ideas. Think like a top CMO who knows that focused campaigns outperform scattered ones 10x.

CAMPAIGN NAME: ${brief.name}
OBJECTIVE: ${brief.objective}
TARGET AUDIENCE: ${brief.target_audience || 'General'}
BUDGET: $${brief.budget || 'Flexible'}
DATE RANGE: ${brief.start_date || 'TBD'} to ${brief.end_date || 'TBD'}
ADDITIONAL CONTEXT: ${brief.additional_context || 'None'}

For each topic, provide:
- topic_title: A sharp, compelling campaign angle (e.g. "Before & After: The $50K Kitchen That Changed Everything")
- hook: The core emotional/logical hook in one sentence — why people will care
- narrative: 2-3 sentences describing the story arc — how this campaign unfolds from first impression to conversion
- key_message: The ONE message the audience should walk away with
- content_pillars: Exactly 3 content pillars (sub-themes) that ALL content should ladder up to
- why_it_works: One sentence on why this angle is strategically strong for a home builder

IMPORTANT: Each topic must be FOCUSED on a single narrative. No "let's do everything" approaches. Each one should feel like a different creative direction a marketing team could rally behind.`,
      response_json_schema: {
        type: "object",
        properties: {
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic_title: { type: "string" },
                hook: { type: "string" },
                narrative: { type: "string" },
                key_message: { type: "string" },
                content_pillars: { type: "array", items: { type: "string" } },
                why_it_works: { type: "string" }
              }
            }
          }
        }
      }
    });
    setSuggestedTopics(result.topics || []);
    setLoadingTopics(false);
  };

  const generateCampaign = async () => {
    setGenerating(true);
    const prompt = `You are a world-class marketing strategist and creative director for a HOME BUILDING & RENOVATION construction company called "Frontier Building Group". 

Create a comprehensive marketing campaign with the following brief:

CAMPAIGN NAME: ${brief.name}
OBJECTIVE: ${brief.objective}
TARGET AUDIENCE: ${brief.target_audience}
BUDGET: $${brief.budget || 'Flexible'}
DATE RANGE: ${brief.start_date || 'TBD'} to ${brief.end_date || 'TBD'}
CHANNELS: ${selectedChannels.join(', ')}
ADDITIONAL CONTEXT: ${brief.additional_context || 'None'}

CRITICAL — CAMPAIGN FOCUS TOPIC (all content MUST revolve around this single theme):
Topic: ${selectedTopic?.topic_title}
Hook: ${selectedTopic?.hook}
Narrative: ${selectedTopic?.narrative}
Key Message: ${selectedTopic?.key_message}
Content Pillars: ${(selectedTopic?.content_pillars || []).join(', ')}

IMPORTANT: Every single piece of content, every task, every event, every post MUST tie back to this focus topic and its 3 content pillars. Do NOT create content that doesn't serve this narrative. This campaign should feel cohesive and intentional — like every piece is part of one story.

Generate a complete campaign with:
1. strategy_summary: A strategic overview (2-3 paragraphs)
2. content_calendar: Array of scheduled posts across all selected channels. For each post include: date (YYYY-MM-DD format within the campaign date range), channel, content_type (post/story/reel/article/carousel/video/live), title, caption (full ready-to-post caption with emojis), hashtags, visual_direction (what the image/video should look like), status "planned"
3. tasks: Array of actionable tasks. For each task include: title, description, category (video_production/photography/graphic_design/copywriting/event_planning/podcast/mailing/contest/social_media/other), channel, due_date (YYYY-MM-DD), priority (low/medium/high/urgent), status "todo", details (very detailed instructions - for video include shot lists, b-roll needs, voiceover scripts; for events include logistics; for podcasts include guest suggestions and talking points), deliverables (array of specific deliverable items)
4. video_productions: Array of video briefs with title, purpose, shot_list (array), b_roll_needed (array), voiceover_script, music_direction, duration_seconds, platforms (array)
5. events: Array of event plans with name, type, date, location, description, budget, expected_attendance, promotion_plan
6. podcasts: Array of podcast episode plans with episode_title, topic, suggested_guests (array), talking_points (array), target_date, duration_minutes, promotion_plan
7. contests: Array of contest plans with name, description, prize, rules, start_date, end_date, platforms (array), promotion_plan
8. mailings: Array of mailing plans with type (email/physical/newsletter), subject, content_summary, target_audience, send_date, call_to_action

Make it INCREDIBLE. Think like a genius marketing strategist. Be specific, creative, and actionable. Include at least 15-20 content calendar items spread across the campaign period. Include detailed video production briefs with specific shot lists and b-roll needs. Suggest real podcast guest types relevant to home building/renovation.

IMPORTANT: Generate content ONLY for the selected channels. If a channel isn't selected, don't create content for it. Dates must be within the campaign date range.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          strategy_summary: { type: "string" },
          content_calendar: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                channel: { type: "string" },
                content_type: { type: "string" },
                title: { type: "string" },
                caption: { type: "string" },
                hashtags: { type: "string" },
                visual_direction: { type: "string" },
                status: { type: "string" }
              }
            }
          },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                channel: { type: "string" },
                due_date: { type: "string" },
                priority: { type: "string" },
                status: { type: "string" },
                details: { type: "string" },
                deliverables: { type: "array", items: { type: "string" } }
              }
            }
          },
          video_productions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                purpose: { type: "string" },
                shot_list: { type: "array", items: { type: "string" } },
                b_roll_needed: { type: "array", items: { type: "string" } },
                voiceover_script: { type: "string" },
                music_direction: { type: "string" },
                duration_seconds: { type: "number" },
                platforms: { type: "array", items: { type: "string" } }
              }
            }
          },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                date: { type: "string" },
                location: { type: "string" },
                description: { type: "string" },
                budget: { type: "number" },
                expected_attendance: { type: "number" },
                promotion_plan: { type: "string" }
              }
            }
          },
          podcasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                episode_title: { type: "string" },
                topic: { type: "string" },
                suggested_guests: { type: "array", items: { type: "string" } },
                talking_points: { type: "array", items: { type: "string" } },
                target_date: { type: "string" },
                duration_minutes: { type: "number" },
                promotion_plan: { type: "string" }
              }
            }
          },
          contests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                prize: { type: "string" },
                rules: { type: "string" },
                start_date: { type: "string" },
                end_date: { type: "string" },
                platforms: { type: "array", items: { type: "string" } },
                promotion_plan: { type: "string" }
              }
            }
          },
          mailings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                subject: { type: "string" },
                content_summary: { type: "string" },
                target_audience: { type: "string" },
                send_date: { type: "string" },
                call_to_action: { type: "string" }
              }
            }
          }
        }
      }
    });

    setGeneratedCampaign(result);
    setGenerating(false);
    setStep(4);
  };

  const saveCampaign = async () => {
    setSaving(true);
    await base44.entities.MarketingCampaign.create({
      name: brief.name,
      objective: brief.objective,
      target_audience: brief.target_audience,
      budget: brief.budget ? parseFloat(brief.budget) : undefined,
      start_date: brief.start_date || undefined,
      end_date: brief.end_date || undefined,
      status: 'planning',
      channels: selectedChannels,
      strategy_summary: generatedCampaign.strategy_summary,
      content_calendar: generatedCampaign.content_calendar || [],
      tasks: generatedCampaign.tasks || [],
      video_productions: generatedCampaign.video_productions || [],
      events: generatedCampaign.events || [],
      podcasts: generatedCampaign.podcasts || [],
      contests: generatedCampaign.contests || [],
      mailings: generatedCampaign.mailings || [],
    });
    setSaving(false);
    // Reset state
    setStep(0);
    setBrief({ name: '', objective: '', target_audience: '', budget: '', start_date: '', end_date: '', additional_context: '' });
    setSelectedChannels([]);
    setGeneratedCampaign(null);
    setSuggestedTopics([]);
    setSelectedTopic(null);
    onComplete();
  };

  const canProceedStep0 = brief.name && brief.objective;
  const canProceedStep1 = !!selectedTopic;
  const canProceedStep2 = selectedChannels.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o && !generating && !saving) onOpenChange(false);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="w-6 h-6 text-[#ea7924]" />
            Marketing Campaign Wizard
          </DialogTitle>
        </DialogHeader>

        <WizardStepIndicator steps={STEPS} currentStep={step} />

        {/* Step 0: Brief */}
        {step === 0 && (
          <div className="space-y-4 mt-4">
            <div>
              <Label>Campaign Name *</Label>
              <Input value={brief.name} onChange={e => setBrief({ ...brief, name: e.target.value })} placeholder="e.g. Spring Renovation Showcase 2026" />
            </div>
            <div>
              <Label>Campaign Objective *</Label>
              <Textarea value={brief.objective} onChange={e => setBrief({ ...brief, objective: e.target.value })} placeholder="What do you want to achieve? e.g. Generate 50 new renovation leads, increase brand awareness in Halifax area, promote new luxury kitchen line..." rows={3} />
            </div>
            <div>
              <Label>Target Audience</Label>
              <Input value={brief.target_audience} onChange={e => setBrief({ ...brief, target_audience: e.target.value })} placeholder="e.g. Homeowners aged 35-55 in Halifax with properties valued $400K+" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Budget ($)</Label>
                <Input type="number" value={brief.budget} onChange={e => setBrief({ ...brief, budget: e.target.value })} placeholder="5000" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={brief.start_date} onChange={e => setBrief({ ...brief, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={brief.end_date} onChange={e => setBrief({ ...brief, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Additional Context</Label>
              <Textarea value={brief.additional_context} onChange={e => setBrief({ ...brief, additional_context: e.target.value })} placeholder="Any specific themes, promotions, company updates, recent projects to showcase, brand voice notes..." rows={3} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setStep(1); if (suggestedTopics.length === 0) generateTopics(); }} disabled={!canProceedStep0}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Focus Topic */}
        {step === 1 && (
          <div className="space-y-4 mt-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#ea7924]" />
                  Choose Your Campaign Focus
                </h3>
                <p className="text-sm text-slate-500 mt-1">Pick ONE focused angle. Great campaigns tell one story, not ten.</p>
              </div>
              <Button variant="outline" size="sm" onClick={generateTopics} disabled={loadingTopics}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loadingTopics ? 'animate-spin' : ''}`} /> New Ideas
              </Button>
            </div>

            {loadingTopics ? (
              <div className="text-center py-12">
                <Loader2 className="w-10 h-10 text-[#ea7924] mx-auto mb-3 animate-spin" />
                <p className="text-slate-600">Brainstorming focused campaign angles...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto">
                {suggestedTopics.map((topic, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedTopic(topic)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTopic === topic
                        ? 'border-[#ea7924] bg-orange-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                        selectedTopic === topic ? 'bg-[#ea7924] text-white' : 'bg-slate-200 text-slate-600'
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900">{topic.topic_title}</h4>
                        <p className="text-sm text-[#ea7924] font-medium mt-1">🎯 {topic.hook}</p>
                        <p className="text-sm text-slate-600 mt-2">{topic.narrative}</p>
                        <div className="mt-3 p-2 bg-white rounded-lg border border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Key Message</p>
                          <p className="text-sm font-medium text-slate-800">"{topic.key_message}"</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(topic.content_pillars || []).map((pillar, j) => (
                            <Badge key={j} variant="outline" className="text-xs bg-slate-50">{pillar}</Badge>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 italic">💡 {topic.why_it_works}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Channels */}
        {step === 2 && (
          <div className="space-y-4 mt-4">
            <p className="text-slate-600">Select the marketing channels for this campaign:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CHANNELS.map(ch => (
                <div
                  key={ch.value}
                  onClick={() => toggleChannel(ch.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedChannels.includes(ch.value)
                      ? 'border-[#ea7924] bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Checkbox checked={selectedChannels.includes(ch.value)} />
                  <span className="font-medium text-sm">{ch.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: AI Generation */}
        {step === 3 && (
          <div className="space-y-6 mt-4 text-center py-8">
            {!generating ? (
              <>
                <div className="max-w-md mx-auto">
                  <Sparkles className="w-16 h-16 text-[#ea7924] mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Generate</h3>
                  <p className="text-slate-600 mb-2">The AI Marketing Wizard will create a complete campaign plan including:</p>
                  <div className="text-left space-y-1 text-sm text-slate-600 bg-slate-50 rounded-xl p-4">
                    <p>✅ Strategy overview</p>
                    <p>✅ Content calendar with ready-to-post captions</p>
                    <p>✅ Actionable task list with detailed instructions</p>
                    {selectedChannels.includes('video') && <p>✅ Video production briefs with shot lists</p>}
                    {selectedChannels.includes('events') && <p>✅ Event planning details</p>}
                    {selectedChannels.includes('podcast') && <p>✅ Podcast episode plans with guest suggestions</p>}
                    {selectedChannels.includes('contests') && <p>✅ Contest / giveaway plans</p>}
                    {(selectedChannels.includes('email') || selectedChannels.includes('mailing')) && <p>✅ Email & mailing plans</p>}
                  </div>
                </div>
                {selectedTopic && (
                  <div className="text-left bg-orange-50 border border-[#ea7924]/20 rounded-xl p-4 mt-4 max-w-md mx-auto">
                    <p className="text-xs font-semibold text-[#ea7924] uppercase tracking-wide mb-1">Campaign Focus</p>
                    <p className="font-semibold text-slate-900">{selectedTopic.topic_title}</p>
                    <p className="text-sm text-slate-600 mt-1">"{selectedTopic.key_message}"</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(selectedTopic.content_pillars || []).map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-center gap-3 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={generateCampaign} className="bg-gradient-to-r from-[#ea7924] to-[#d66a1f] px-8">
                    <Sparkles className="w-4 h-4 mr-2" /> Generate Campaign
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-12">
                <Loader2 className="w-16 h-16 text-[#ea7924] mx-auto mb-4 animate-spin" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">AI is working its magic...</h3>
                <p className="text-slate-600">Creating your complete marketing campaign. This may take 30-60 seconds.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review & Launch */}
        {step === 4 && generatedCampaign && (
          <div className="space-y-4 mt-4">
            <CampaignPreview campaign={generatedCampaign} brief={brief} channels={selectedChannels} />
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => { setStep(3); setGeneratedCampaign(null); }}>
                <Sparkles className="w-4 h-4 mr-1" /> Regenerate
              </Button>
              <Button onClick={saveCampaign} disabled={saving} className="bg-gradient-to-r from-[#ea7924] to-[#d66a1f] px-8">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                Save & Launch Campaign
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}