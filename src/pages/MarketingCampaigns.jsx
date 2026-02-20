import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, Megaphone } from 'lucide-react';
import TopicSelector from '../components/marketing/TopicSelector';
import CampaignConfigurator from '../components/marketing/CampaignConfigurator';
import CampaignList from '../components/marketing/CampaignList';
import CampaignDetail from '../components/marketing/CampaignDetail';
import { addWeeks, format, addDays } from 'date-fns';

export default function MarketingCampaigns() {
  const [view, setView] = useState('list'); // list, topic, configure, detail
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list('-created_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingCampaign.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] }),
  });

  const handleTopicSelected = (topic) => {
    setSelectedTopic(topic);
    setView('configure');
  };

  const handleGenerateCampaign = async (config) => {
    setGenerating(true);

    const startDate = new Date(config.start_date);
    const endDate = addWeeks(startDate, parseInt(config.duration_weeks));
    const durationWeeks = parseInt(config.duration_weeks);

    // Calculate how many content pieces per channel
    const postsPerWeek = {
      facebook: 3, instagram: 4, linkedin: 2, x: 5, email: 1, blog: 1,
    };

    const channelSchedule = config.channels.map(ch => ({
      channel: ch,
      total: (postsPerWeek[ch] || 2) * durationWeeks,
      per_week: postsPerWeek[ch] || 2,
    }));

    const toneMap = {
      professional_friendly: "professional yet warm and approachable",
      bold_energetic: "bold, energetic, and attention-grabbing with power words",
      educational: "educational, informative, and data-driven",
      casual_fun: "casual, fun, with humor and personality",
      luxury_premium: "sophisticated, luxury, and premium feel",
    };

    const prompt = `You are a world-class marketing strategist and copywriter for Frontier Building Group, a construction company.

CAMPAIGN BRIEF:
- Topic: ${selectedTopic.label} — ${selectedTopic.desc}
- Campaign Name: ${config.name}
- Goal: ${config.goal || 'Increase brand awareness and engagement'}
- Target Audience: ${config.target_audience || 'Homeowners and commercial property owners'}
- Tone: ${toneMap[config.tone] || 'professional yet friendly'}
- Duration: ${durationWeeks} weeks (${format(startDate, 'MMM d')} to ${format(endDate, 'MMM d, yyyy')})
- Additional Notes: ${config.additional_notes || 'None'}

CHANNELS & FREQUENCY:
${channelSchedule.map(s => `- ${s.channel}: ${s.per_week}/week = ${s.total} total pieces`).join('\n')}

INSTRUCTIONS:
1. First, create a brilliant campaign STRATEGY SUMMARY (2-3 paragraphs) explaining the campaign arc, key messages, content themes by week, and how channels work together.

2. Then generate ALL content pieces for EVERY channel for the entire campaign duration. Each piece should be:
   - Highly engaging and scroll-stopping
   - Tailored to the specific platform's style and audience behavior
   - Include relevant emojis for social posts
   - Include strong calls-to-action
   - Be interconnected as a cohesive campaign (pieces reference each other)
   - For blogs: write a full blog post (500+ words)
   - For emails: write a complete newsletter with subject line
   - For social: write platform-optimized posts (LinkedIn longer/professional, X concise, Instagram visual-first, Facebook conversational)

3. Space content across the ${durationWeeks} weeks starting ${format(startDate, 'yyyy-MM-dd')}.
   Assign specific dates (YYYY-MM-DD format) and optimal posting times for each piece.

4. For each piece, include an image_prompt describing the perfect visual to accompany the post.

Generate a MAXIMUM of 40 content pieces total, prioritizing quality over quantity. If the math calls for more, reduce frequency.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          strategy_summary: { type: "string" },
          content_pieces: {
            type: "array",
            items: {
              type: "object",
              properties: {
                channel: { type: "string" },
                scheduled_date: { type: "string" },
                scheduled_time: { type: "string" },
                title: { type: "string" },
                body: { type: "string" },
                hashtags: { type: "string" },
                call_to_action: { type: "string" },
                image_prompt: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Add IDs and defaults
    const contentPieces = (res.content_pieces || []).map((p, i) => ({
      ...p,
      id: `piece_${Date.now()}_${i}`,
      status: 'draft',
    }));

    const campaignData = {
      name: config.name,
      topic: selectedTopic.label,
      goal: config.goal,
      target_audience: config.target_audience,
      status: 'draft',
      start_date: config.start_date,
      end_date: format(endDate, 'yyyy-MM-dd'),
      duration_weeks: durationWeeks,
      channels: config.channels,
      content_pieces: contentPieces,
      ai_strategy_summary: res.strategy_summary || '',
    };

    const created = await base44.entities.MarketingCampaign.create(campaignData);
    queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
    setSelectedCampaign({ ...campaignData, ...created });
    setView('detail');
    setGenerating(false);
  };

  const handleUpdateCampaign = async (id, data) => {
    await base44.entities.MarketingCampaign.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
    // Update local state
    setSelectedCampaign(prev => prev ? { ...prev, ...data } : null);
  };

  const handleDelete = (campaign) => {
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      deleteMutation.mutate(campaign.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (view === 'configure') setView('topic');
                else setView('list');
                setSelectedCampaign(null);
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-8 h-8 text-[#ea7924]" />
              Marketing Campaigns
            </h1>
            <p className="text-slate-500">AI-powered campaign creation and content scheduling</p>
          </div>
        </div>
        {view === 'list' && (
          <Button className="bg-[#ea7924] hover:bg-[#d66a1f]" onClick={() => setView('topic')}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        )}
      </div>

      {/* Views */}
      {view === 'list' && (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active & Draft ({campaigns.filter(c => c.status !== 'completed').length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({campaigns.filter(c => c.status === 'completed').length})</TabsTrigger>
            <TabsTrigger value="all">All ({campaigns.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            <CampaignList
              campaigns={campaigns.filter(c => c.status !== 'completed')}
              onView={(c) => { setSelectedCampaign(c); setView('detail'); }}
              onDelete={handleDelete}
            />
          </TabsContent>
          <TabsContent value="completed" className="mt-4">
            <CampaignList
              campaigns={campaigns.filter(c => c.status === 'completed')}
              onView={(c) => { setSelectedCampaign(c); setView('detail'); }}
              onDelete={handleDelete}
            />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <CampaignList
              campaigns={campaigns}
              onView={(c) => { setSelectedCampaign(c); setView('detail'); }}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>
      )}

      {view === 'topic' && (
        <TopicSelector onTopicSelected={handleTopicSelected} loading={false} />
      )}

      {view === 'configure' && selectedTopic && (
        <CampaignConfigurator
          topic={selectedTopic}
          onGenerate={handleGenerateCampaign}
          loading={generating}
        />
      )}

      {view === 'detail' && selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={() => { setView('list'); setSelectedCampaign(null); }}
          onUpdateCampaign={handleUpdateCampaign}
        />
      )}
    </div>
  );
}