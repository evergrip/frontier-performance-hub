import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Briefcase, Building2, FileText, TrendingUp } from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Reports & Analytics</h1>
        <p className="text-lg text-slate-500">Department-specific reporting and insights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="preconstruction" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Pre-Construction
          </TabsTrigger>
          <TabsTrigger value="construction" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Construction
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Company
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Sales reports and metrics will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preconstruction" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pre-Construction Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Pre-construction reports and metrics will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="construction" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Construction Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Construction reports and metrics will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Company-wide reports and metrics will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}