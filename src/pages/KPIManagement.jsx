import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, BarChart3, Sparkles, LineChart, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function KPIManagement() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nlpRequest, setNlpRequest] = useState('');
  const [generatedKPI, setGeneratedKPI] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState('sales');
  const [timePeriod, setTimePeriod] = useState('ytd');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Fetch KPI data
  const { data: kpiData, refetch: refetchKPIs } = useQuery({
    queryKey: ['kpis', timePeriod],
    queryFn: async () => {
      const response = await base44.functions.invoke('calculateKPIAggregates', {
        time_period: timePeriod,
        user_id: null // All users for admin view
      });
      return response.data;
    },
    enabled: !!user,
  });

  const generateKPIMutation = useMutation({
    mutationFn: async ({ description }) => {
      const response = await base44.functions.invoke('appBuilderAssistant', {
        request_type: 'generate_kpi',
        request_description: description,
        context: {}
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedKPI(data.kpi_design);
      toast.success('KPI design generated');
    },
    onError: () => {
      toast.error('Failed to generate KPI');
    }
  });

  const handleGenerateKPI = () => {
    if (!nlpRequest.trim()) {
      toast.error('Please describe the KPI you want');
      return;
    }
    generateKPIMutation.mutate({ description: nlpRequest });
  };

  // Prepare chart data
  const salesTrendData = [
    { month: 'Jan', revenue: 450, margin: 90 },
    { month: 'Feb', revenue: 520, margin: 105 },
    { month: 'Mar', revenue: 680, margin: 136 },
    { month: 'Apr', revenue: 590, margin: 118 },
    { month: 'May', revenue: 720, margin: 144 },
    { month: 'Jun', revenue: 810, margin: 162 },
  ];

  const pipelineDistribution = [
    { stage: 'Prospect', count: kpiData?.kpis?.sales?.prospect_sales || 0 },
    { stage: 'Proposal', count: kpiData?.kpis?.sales?.proposal_sent || 0 },
    { stage: 'Negotiation', count: kpiData?.kpis?.sales?.negotiation || 0 },
    { stage: 'Won', count: kpiData?.kpis?.sales?.closed_won || 0 },
  ];

  const kpiMetrics = {
    sales: {
      title: 'Sales Performance',
      metrics: [
        { label: 'Total Revenue', value: `$${((kpiData?.kpis?.sales?.total_contract_value || 0) / 1000).toFixed(0)}K`, trend: '+12.5%' },
        { label: 'Win Rate', value: `${kpiData?.kpis?.sales?.win_rate || 0}%`, trend: '+3.2%' },
        { label: 'Avg Deal Size', value: `$${((kpiData?.kpis?.sales?.avg_deal_size || 0) / 1000).toFixed(0)}K`, trend: '+8.1%' },
        { label: 'Deals Closed', value: kpiData?.kpis?.sales?.closed_won || 0, trend: '+5' },
      ]
    },
    projects: {
      title: 'Project Performance',
      metrics: [
        { label: 'Active Projects', value: kpiData?.kpis?.projects?.active_projects || 0, trend: '+3' },
        { label: 'Total Value', value: `$${((kpiData?.kpis?.projects?.total_contract_value || 0) / 1000).toFixed(0)}K`, trend: '+15%' },
        { label: 'Avg Margin', value: `${kpiData?.kpis?.projects?.avg_margin_percentage || 0}%`, trend: '+2.1%' },
        { label: 'Completed', value: kpiData?.kpis?.projects?.completed_projects || 0, trend: '+4' },
      ]
    },
    leads: {
      title: 'Lead Generation',
      metrics: [
        { label: 'Total Leads', value: kpiData?.kpis?.leads?.total_leads || 0, trend: '+12' },
        { label: 'Conversion Rate', value: `${kpiData?.kpis?.leads?.conversion_rate || 0}%`, trend: '+2.5%' },
        { label: 'Qualified', value: kpiData?.kpis?.leads?.qualified_leads || 0, trend: '+8' },
        { label: 'Avg Score', value: kpiData?.kpis?.leads?.avg_lead_score || 0, trend: '+5' },
      ]
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">KPI Management</h1>
          <p className="text-lg text-slate-500">Track, analyze, and create custom KPIs</p>
        </div>
        <div className="flex gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mtd">This Month</SelectItem>
              <SelectItem value="qtd">This Quarter</SelectItem>
              <SelectItem value="ytd">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Custom KPI
          </Button>
        </div>
      </div>

      {/* KPI Categories */}
      <Tabs value={selectedKPI} onValueChange={setSelectedKPI} className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales">
            <TrendingUp className="w-4 h-4 mr-2" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Activity className="w-4 h-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="leads">
            <BarChart3 className="w-4 h-4 mr-2" />
            Leads
          </TabsTrigger>
        </TabsList>

        {Object.keys(kpiMetrics).map((key) => (
          <TabsContent key={key} value={key} className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {kpiMetrics[key].metrics.map((metric, idx) => (
                <Card key={idx} className="border-2 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">{metric.label}</p>
                      <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                      <p className="text-sm text-emerald-600 font-medium">{metric.trend}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trend Over Time</CardTitle>
                  <CardDescription>Monthly performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsLine data={salesTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} name="Revenue ($K)" />
                      <Line type="monotone" dataKey="margin" stroke="#10B981" strokeWidth={2} name="Margin ($K)" />
                    </RechartsLine>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution</CardTitle>
                  <CardDescription>Breakdown by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={pipelineDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Custom KPI Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Create Custom KPI with AI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Label className="mb-2 block">Describe your KPI in natural language</Label>
              <Textarea
                placeholder="e.g., 'Track average time from lead to sale conversion' or 'Monitor project margin by type'"
                value={nlpRequest}
                onChange={(e) => setNlpRequest(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleGenerateKPI}
                disabled={generateKPIMutation.isPending}
                className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
              >
                {generateKPIMutation.isPending ? 'Generating...' : 'Generate KPI Design'}
              </Button>
            </div>

            {generatedKPI && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <h3 className="font-bold text-lg mb-1">{generatedKPI.kpi_name}</h3>
                  <p className="text-sm text-slate-600">{generatedKPI.description}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Data Sources</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {generatedKPI.data_sources?.map((source, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Calculation Formula</Label>
                  <p className="mt-1 text-sm bg-white p-3 rounded border font-mono">
                    {generatedKPI.calculation_formula}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Recommended Visualization</Label>
                  <p className="mt-1 text-sm">{generatedKPI.visualization_type}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Business Value</Label>
                  <p className="mt-1 text-sm text-slate-600">{generatedKPI.business_value}</p>
                </div>

                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Implement This KPI
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}