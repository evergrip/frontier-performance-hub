import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Megaphone, Calendar, Eye, Trash2, 
  Sparkles, Target, DollarSign, Play, Pause, CheckCircle2
} from 'lucide-react';
import CampaignWizardDialog from '../components/marketing/CampaignWizardDialog';
import CampaignDetailDialog from '../components/marketing/CampaignDetailDialog';
import { format } from 'date-fns';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  planning: { label: 'Planning', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function MarketingCampaigns() {
  const [user, setUser] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list('-created_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingCampaign.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] }),
  });

  const isMarketingManager = user?.role === 'admin' || 
    user?.department === 'Marketing' || 
    (user?.departments || []).includes('Marketing') ||
    (user?.managed_departments || []).includes('Marketing');

  if (!isMarketingManager) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Marketing Campaigns</h2>
        <p className="text-slate-500">This module is only available to marketing managers and admins.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Marketing Campaigns</h1>
          <p className="text-lg text-slate-500">AI-powered campaign creation and management</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-[#ea7924] to-[#d66a1f] hover:from-[#d66a1f] hover:to-[#c55e1a]">
          <Sparkles className="w-4 h-4 mr-2" />
          New Campaign Wizard
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center">
            <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No campaigns yet</h3>
            <p className="text-slate-500 mb-6">Launch the Campaign Wizard to create your first AI-generated marketing campaign.</p>
            <Button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-[#ea7924] to-[#d66a1f]">
              <Sparkles className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => {
            const st = statusConfig[campaign.status] || statusConfig.draft;
            const tasksDone = (campaign.tasks || []).filter(t => t.status === 'done').length;
            const totalTasks = (campaign.tasks || []).length;
            const contentItems = (campaign.content_calendar || []).length;
            
            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setDetailCampaign(campaign)}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-2">{campaign.name}</CardTitle>
                    <Badge className={st.color}>{st.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600 line-clamp-2">{campaign.objective}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {(campaign.channels || []).slice(0, 5).map(ch => (
                      <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>
                    ))}
                    {(campaign.channels || []).length > 5 && (
                      <Badge variant="outline" className="text-xs">+{(campaign.channels || []).length - 5}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{contentItems}</p>
                      <p className="text-xs text-slate-500">Content</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{tasksDone}/{totalTasks}</p>
                      <p className="text-xs text-slate-500">Tasks</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {campaign.start_date ? format(new Date(campaign.start_date), 'MMM d') : '—'}
                      </p>
                      <p className="text-xs text-slate-500">Start</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); setDetailCampaign(campaign); }}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this campaign?')) deleteMutation.mutate(campaign.id);
                    }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignWizardDialog 
        open={wizardOpen} 
        onOpenChange={setWizardOpen}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
          setWizardOpen(false);
        }}
      />

      {detailCampaign && (
        <CampaignDetailDialog
          campaign={detailCampaign}
          open={!!detailCampaign}
          onOpenChange={(open) => !open && setDetailCampaign(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] })}
        />
      )}
    </div>
  );
}