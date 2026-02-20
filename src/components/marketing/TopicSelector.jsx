import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SUGGESTED_TOPICS = [
  { label: "Brand Awareness", desc: "Showcase your company's expertise and values" },
  { label: "Project Showcase", desc: "Highlight completed or in-progress projects" },
  { label: "Customer Testimonials", desc: "Share client success stories and reviews" },
  { label: "Seasonal Promotions", desc: "Tie campaigns to seasonal demand" },
  { label: "Industry Thought Leadership", desc: "Position your team as industry experts" },
  { label: "Behind the Scenes", desc: "Show your team culture and daily operations" },
  { label: "Community Engagement", desc: "Local events, sponsorships, and giving back" },
  { label: "New Service Launch", desc: "Announce and promote new offerings" },
];

export default function TopicSelector({ onTopicSelected, loading }) {
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [aiTopics, setAiTopics] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const handleGenerateTopics = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a marketing genius for a construction/building company called Frontier Building Group. 
Suggest 5 unique, creative marketing campaign topics that would be highly engaging. 
Consider current trends, seasonal opportunities, and construction industry specifics.
Make them creative, not generic.`,
      response_json_schema: {
        type: "object",
        properties: {
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                desc: { type: "string" }
              }
            }
          }
        }
      }
    });
    setAiTopics(res.topics || []);
    setLoadingAI(false);
  };

  const allTopics = [...SUGGESTED_TOPICS, ...aiTopics];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Choose a Campaign Topic</h2>
        <p className="text-slate-500">Select a suggested topic, generate AI ideas, or create your own</p>
      </div>

      {/* AI Generate Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={handleGenerateTopics} disabled={loadingAI} className="gap-2">
          {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
          {loadingAI ? 'Generating ideas...' : 'Generate AI Topic Ideas'}
        </Button>
      </div>

      {/* Topic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allTopics.map((topic, i) => (
          <Card
            key={i}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTopic?.label === topic.label ? 'ring-2 ring-[#ea7924] bg-orange-50' : ''
            }`}
            onClick={() => setSelectedTopic(topic)}
          >
            <CardContent className="p-4">
              <p className="font-semibold text-slate-900">{topic.label}</p>
              <p className="text-sm text-slate-500 mt-1">{topic.desc}</p>
              {i >= SUGGESTED_TOPICS.length && (
                <Badge className="mt-2 bg-purple-100 text-purple-700">AI Suggested</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Topic */}
      <Card>
        <CardContent className="p-4">
          <p className="font-medium text-slate-700 mb-2">Or create your own topic:</p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your campaign topic..."
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (customTopic.trim()) {
                  setSelectedTopic({ label: customTopic.trim(), desc: 'Custom topic' });
                }
              }}
              disabled={!customTopic.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Proceed */}
      {selectedTopic && (
        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-[#ea7924] hover:bg-[#d66a1f] gap-2"
            onClick={() => onTopicSelected(selectedTopic)}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Generating Campaign...' : `Create Campaign: "${selectedTopic.label}"`}
          </Button>
        </div>
      )}
    </div>
  );
}