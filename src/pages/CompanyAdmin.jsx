import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Settings, DollarSign, Building2, Users as UsersIcon, ChevronDown, MessageSquare } from 'lucide-react';
import CommissionRulesTab from '@/components/admin/CommissionRulesTab';
import MeetingTypesTab from '@/components/admin/MeetingTypesTab';
import CommissionsAdminTab from '@/components/admin/CommissionsAdminTab';
import ProjectsAdminTab from '@/components/admin/ProjectsAdminTab';
import UsersAdminTab from '@/components/admin/UsersAdminTab';
import CompanySettingsTab from '@/components/admin/CompanySettingsTab';
import ReportingRelationshipsTab from '@/components/admin/ReportingRelationshipsTab';

function CollapsibleSection({ title, isOpen, onToggle, children }) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
          <span className="text-lg font-semibold text-slate-800">{title}</span>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function CompanyAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('sales');
  const [openSections, setOpenSections] = useState({
    commissionRules: true,
    commissionsAdmin: false,
    projectsAdmin: true,
    usersAdmin: false,
    reportingRelationships: false,
    meetingTypes: true,
  });

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
        <p className="text-lg text-slate-500">Configure your company profile, commission rules, team members, and meeting types — start here when setting up a new company</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="sales" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2">
            <Building2 className="w-4 h-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Company
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab - Commission Rules & Commission Admin */}
        <TabsContent value="sales" className="space-y-4">
          <CollapsibleSection
            title="Commission Rules"
            isOpen={openSections.commissionRules}
            onToggle={() => toggleSection('commissionRules')}
          >
            <CommissionRulesTab />
          </CollapsibleSection>
          <CollapsibleSection
            title="Commission Management"
            isOpen={openSections.commissionsAdmin}
            onToggle={() => toggleSection('commissionsAdmin')}
          >
            <CommissionsAdminTab />
          </CollapsibleSection>
        </TabsContent>

        {/* Operations Tab - Projects Admin & Users Admin */}
        <TabsContent value="operations" className="space-y-4">
          <CollapsibleSection
            title="Projects"
            isOpen={openSections.projectsAdmin}
            onToggle={() => toggleSection('projectsAdmin')}
          >
            <ProjectsAdminTab />
          </CollapsibleSection>
          <CollapsibleSection
            title="User Management"
            isOpen={openSections.usersAdmin}
            onToggle={() => toggleSection('usersAdmin')}
          >
            <UsersAdminTab />
          </CollapsibleSection>
          <CollapsibleSection
            title="Reporting Relationships"
            isOpen={openSections.reportingRelationships}
            onToggle={() => toggleSection('reportingRelationships')}
          >
            <ReportingRelationshipsTab />
          </CollapsibleSection>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-4">
          <CollapsibleSection
            title="Meeting Types"
            isOpen={openSections.meetingTypes}
            onToggle={() => toggleSection('meetingTypes')}
          >
            <MeetingTypesTab />
          </CollapsibleSection>
        </TabsContent>

        {/* Company Settings Tab */}
        <TabsContent value="settings">
          <CompanySettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}