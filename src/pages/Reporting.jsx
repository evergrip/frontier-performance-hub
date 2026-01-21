import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, PieChart, LineChart, Table2, Save, Share2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PivotTableBuilder from '@/components/reporting/PivotTableBuilder';
import WidgetDashboard from '@/components/reporting/WidgetDashboard';
import SavedReportsList from '@/components/reporting/SavedReportsList';

export default function Reporting() {
  const queryClient = useQueryClient();
  const [dataSource, setDataSource] = useState('sales');
  const [activeReport, setActiveReport] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    enabled: dataSource === 'leads'
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    enabled: dataSource === 'sales'
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: dataSource === 'projects'
  });

  const { data: savedReports = [] } = useQuery({
    queryKey: ['report-configurations'],
    queryFn: () => base44.entities.ReportConfiguration.list()
  });

  const currentData = useMemo(() => {
    if (dataSource === 'leads') return leads;
    if (dataSource === 'sales') return sales;
    if (dataSource === 'projects') return projects;
    return [];
  }, [dataSource, leads, sales, projects]);

  const saveReportMutation = useMutation({
    mutationFn: (data) => {
      if (activeReport?.id) {
        return base44.entities.ReportConfiguration.update(activeReport.id, data);
      }
      return base44.entities.ReportConfiguration.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['report-configurations']);
      toast.success('Report saved successfully');
      setShowSaveDialog(false);
      setReportName('');
      setReportDescription('');
    },
    onError: () => {
      toast.error('Failed to save report');
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportConfiguration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['report-configurations']);
      toast.success('Report deleted');
      if (activeReport?.id === arguments[0]) {
        setActiveReport(null);
      }
    }
  });

  const handleSaveReport = (config) => {
    setActiveReport(config);
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    if (!reportName) {
      toast.error('Please enter a report name');
      return;
    }

    saveReportMutation.mutate({
      name: reportName,
      description: reportDescription,
      data_source: dataSource,
      configuration: activeReport?.configuration || {},
      widgets: activeReport?.widgets || [],
      is_public: isPublic
    });
  };

  const handleLoadReport = (report) => {
    setActiveReport(report);
    setDataSource(report.data_source);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Advanced Reporting</h1>
          <p className="text-slate-500 mt-1">Build custom reports with pivot tables and interactive dashboards</p>
        </div>
        <Button onClick={() => setActiveReport(null)} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <SavedReportsList
            reports={savedReports}
            onLoad={handleLoadReport}
            onDelete={(id) => deleteReportMutation.mutate(id)}
            activeReportId={activeReport?.id}
          />
        </div>

        <div className="col-span-3">
          <Tabs defaultValue="builder" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="builder">Pivot Builder</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              </TabsList>

              <div className="flex gap-2 items-center">
                <Label>Data Source:</Label>
                <Select value={dataSource} onValueChange={setDataSource}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="sales">Pre-Construction</SelectItem>
                    <SelectItem value="projects">Construction Projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="builder">
              <PivotTableBuilder
                data={currentData}
                dataSource={dataSource}
                initialConfig={activeReport?.configuration}
                onSave={handleSaveReport}
              />
            </TabsContent>

            <TabsContent value="dashboard">
              <WidgetDashboard
                data={currentData}
                dataSource={dataSource}
                initialWidgets={activeReport?.widgets}
                onSave={handleSaveReport}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Report Name</Label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Q1 Sales Performance"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <Label>Share with entire team</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSave} disabled={saveReportMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}