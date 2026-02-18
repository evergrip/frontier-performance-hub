import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, DollarSign, Building2, Users as UsersIcon } from 'lucide-react';
import CommissionRulesTab from '@/components/admin/CommissionRulesTab';
import CommissionsAdminTab from '@/components/admin/CommissionsAdminTab';
import ProjectsAdminTab from '@/components/admin/ProjectsAdminTab';
import UsersAdminTab from '@/components/admin/UsersAdminTab';
import CompanySettingsTab from '@/components/admin/CompanySettingsTab';
import ReportingRelationshipsTab from '@/components/admin/ReportingRelationshipsTab';

export default function CompanyAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('sales');

  React.useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      if (user?.role !== 'admin') {
        base44.auth.redirectToLogin('/');
      }
    };
    loadUser();
  }, []);

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Company Admin</h1>
        <p className="text-lg text-slate-500">Manage company-wide settings and data</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="sales" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2">
            <Building2 className="w-4 h-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Company
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab - Commission Rules & Commission Admin */}
        <TabsContent value="sales" className="space-y-8">
          <div id="commission-rules">
            <CommissionRulesTab />
          </div>
          <div className="border-t pt-8" id="commissions-admin">
            <CommissionsAdminTab />
          </div>
        </TabsContent>

        {/* Operations Tab - Projects Admin & Users Admin */}
        <TabsContent value="operations" className="space-y-8">
          <div id="projects-admin">
            <ProjectsAdminTab />
          </div>
          <div className="border-t pt-8" id="users-admin">
            <UsersAdminTab />
          </div>
          <div className="border-t pt-8" id="reporting-relationships">
            <ReportingRelationshipsTab />
          </div>
        </TabsContent>

        {/* Company Settings Tab */}
        <TabsContent value="settings">
          <CompanySettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}