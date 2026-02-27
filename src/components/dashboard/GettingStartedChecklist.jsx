import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Circle, Settings, Users, Target, Briefcase, 
  Building2, CalendarDays, ChevronRight, Rocket
} from 'lucide-react';

const STEPS = [
  {
    key: 'company',
    label: 'Set up your company profile',
    description: 'Add your company name, logo, fiscal year, and branding.',
    page: 'CompanyAdmin',
    icon: Settings,
    adminOnly: true,
  },
  {
    key: 'users',
    label: 'Invite your team members',
    description: 'Add salespeople, project managers, and admins so they can log in.',
    page: 'CompanyAdmin',
    icon: Users,
    adminOnly: true,
  },
  {
    key: 'clients',
    label: 'Add your first client',
    description: 'Clients are the foundation — every lead and project ties back to a client.',
    page: 'Clients',
    icon: Users,
  },
  {
    key: 'leads',
    label: 'Create a lead from a client',
    description: 'Leads track potential projects through your consultation pipeline.',
    page: 'Leads',
    icon: Target,
  },
  {
    key: 'sales',
    label: 'Convert a lead to a pre-construction sale',
    description: 'When a lead is ready, convert it to track design, engineering & permits.',
    page: 'Sales',
    icon: Briefcase,
  },
  {
    key: 'projects',
    label: 'Start a construction project',
    description: 'Convert a completed pre-construction sale into an active construction project.',
    page: 'Projects',
    icon: Building2,
  },
];

export default function GettingStartedChecklist({ 
  clientCount, leadCount, saleCount, projectCount, hasCompanySettings, userCount, isAdmin 
}) {
  const completedMap = {
    company: hasCompanySettings,
    users: userCount > 1,
    clients: clientCount > 0,
    leads: leadCount > 0,
    sales: saleCount > 0,
    projects: projectCount > 0,
  };

  const visibleSteps = STEPS.filter(s => !s.adminOnly || isAdmin);
  const completedCount = visibleSteps.filter(s => completedMap[s.key]).length;
  const allDone = completedCount === visibleSteps.length;

  if (allDone) return null;

  const progressPercent = Math.round((completedCount / visibleSteps.length) * 100);

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Getting Started</h2>
            <p className="text-sm text-slate-500">
              Set up your company in {visibleSteps.length} simple steps
            </p>
          </div>
          <span className="text-sm font-semibold text-amber-600">{completedCount}/{visibleSteps.length}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-amber-100 rounded-full mt-3 mb-5">
          <div 
            className="h-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>

        <div className="space-y-3">
          {visibleSteps.map((step) => {
            const done = completedMap[step.key];
            const Icon = step.icon;
            return (
              <Link
                key={step.key}
                to={createPageUrl(step.page)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  done 
                    ? 'bg-emerald-50 border-emerald-200 opacity-70' 
                    : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {step.label}
                  </p>
                  {!done && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  )}
                </div>
                {!done && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}