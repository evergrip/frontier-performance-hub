import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  CheckCircle, 
  Target, 
  TrendingUp, 
  Users, 
  Calculator,
  X,
  ChevronRight
} from 'lucide-react';

export default function KPITutorial({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: BookOpen,
      title: "Welcome to KPI Management",
      description: "Track, measure, and improve your team's performance with our comprehensive KPI system.",
      content: (
        <div className="space-y-3">
          <p className="text-slate-600">This system allows you to:</p>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Define custom KPIs for any department or role</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Automatically calculate metrics from your existing data</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Set targets and get alerts when thresholds are crossed</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Track team performance and provide feedback</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      icon: Target,
      title: "Two Types of KPIs",
      description: "Choose the right type for your needs",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">📊 Calculated KPIs</h4>
            <p className="text-blue-700 text-sm mb-2">Automatically computed from your data</p>
            <p className="text-slate-600 text-sm">
              Examples: "Total Revenue", "Lead Conversion Rate", "Average Project Duration"
            </p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2">✍️ Manual KPIs</h4>
            <p className="text-amber-700 text-sm mb-2">Require user input</p>
            <p className="text-slate-600 text-sm">
              Examples: "Customer Satisfaction Score", "Team Morale Rating", "Quality Checklist"
            </p>
          </div>
        </div>
      )
    },
    {
      icon: Calculator,
      title: "Creating Calculated KPIs",
      description: "Let the system do the work for you",
      content: (
        <div className="space-y-3">
          <p className="text-slate-600">For calculated KPIs, you'll define:</p>
          <ol className="space-y-3 text-slate-600 ml-4">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-amber-600 min-w-[24px]">1.</span>
              <div>
                <strong>Source Entity:</strong> Where to get the data (Leads, Sales, Projects)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-amber-600 min-w-[24px]">2.</span>
              <div>
                <strong>Metric Field:</strong> What to measure (contract_value, status, etc.)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-amber-600 min-w-[24px]">3.</span>
              <div>
                <strong>Aggregation:</strong> How to calculate (count, sum, average)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-amber-600 min-w-[24px]">4.</span>
              <div>
                <strong>Filters:</strong> Optional conditions to narrow results
              </div>
            </li>
          </ol>
          <div className="bg-slate-50 p-3 rounded-lg mt-4">
            <p className="text-sm text-slate-600">
              <strong>Example:</strong> To track "Converted Leads This Month", you'd select Lead as the source, 
              status as the metric, count as aggregation, and filter by status = "converted".
            </p>
          </div>
        </div>
      )
    },
    {
      icon: TrendingUp,
      title: "Targets & Thresholds",
      description: "Set expectations and get notified",
      content: (
        <div className="space-y-3">
          <p className="text-slate-600">Control performance expectations:</p>
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-1">🎯 Target Value</h4>
              <p className="text-sm text-slate-600">
                The goal you want to achieve (e.g., "10 converted leads per month")
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-1">⚠️ Threshold Value</h4>
              <p className="text-sm text-slate-600">
                When crossed, the system flags the KPI and can require an explanation
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg mt-3">
            <p className="text-sm text-slate-600">
              <strong>Example:</strong> If your target is 10 leads but threshold is 5, anyone with less than 
              5 leads will be flagged to provide an explanation.
            </p>
          </div>
        </div>
      )
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Track individual and team performance",
      content: (
        <div className="space-y-3">
          <p className="text-slate-600">The KPI system automatically:</p>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Assigns KPI results to the responsible user from your data</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Allows managers to review team member explanations</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Provides dashboard views for executives to see company-wide trends</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Tracks historical performance over time</span>
            </li>
          </ul>
          <div className="bg-blue-50 p-3 rounded-lg mt-4">
            <p className="text-sm text-slate-600">
              <strong>Pro Tip:</strong> Set up reporting relationships in Company Admin to enable 
              manager reviews and team roll-ups.
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {currentStepData.content}
          </div>

          {/* Progress indicators */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? 'w-8 bg-amber-500' 
                      : index < currentStep
                      ? 'w-2 bg-amber-300'
                      : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  Back
                </Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button 
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  onClick={onClose}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Get Started <CheckCircle className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}