import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import WizardStepNav from '../components/budget/wizard/WizardStepNav';
import WizardBasicsStep from '../components/budget/wizard/WizardBasicsStep';
import WizardPrefillStep from '../components/budget/wizard/WizardPrefillStep';
import WizardDepartmentStep from '../components/budget/wizard/WizardDepartmentStep';
import WizardReviewStep from '../components/budget/wizard/WizardReviewStep';
import WizardProfitSharingStep from '../components/budget/wizard/WizardProfitSharingStep';

const EMPLOYER_TAX_RATE = 0.1222; // CPP + EI + WSIB + EHT

function buildSteps(departments) {
  const steps = [{ key: 'basics', label: 'Basics' }];
  (departments || []).forEach(dept => {
    steps.push({ key: `dept_${dept}`, label: dept, isDepartment: true, department: dept });
  });
  // Company-wide items for things not tied to a department
  steps.push({ key: 'company_wide', label: 'Company-Wide' });
  steps.push({ key: 'profit_sharing', label: 'Profit Sharing' });
  steps.push({ key: 'review', label: 'Review' });
  return steps;
}

export default function BudgetWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    fiscal_year: new Date().getFullYear() + 1,
    description: '',
    gross_revenue_projection: '',
    net_profit_target_percentage: '',
    departments: [],
  });

  // Department-keyed selections: { "Sales": { staff: [], expenses: [], ... }, ... }
  const [deptSelections, setDeptSelections] = useState({});

  // Company-wide selections (not department-specific)
  const [companySelections, setCompanySelections] = useState({
    staff: [],
    expenses: [],
    assets: [],
    liabilities: [],
    vehicles: [],
  });

  const [profitSharingConfig, setProfitSharingConfig] = useState({
    company_retention_amount: '',
    distribution_tiers: [],
    notes: '',
  });

  const STEPS = buildSteps(form.departments);
  const stepKey = STEPS[currentStep]?.key || 'basics';
  const currentStepDef = STEPS[currentStep] || STEPS[0];
  const canProceedFromBasics = form.name && form.fiscal_year;
  const isLastStep = currentStep === STEPS.length - 1;

  // Keep step in bounds when departments change
  const safeStep = Math.min(currentStep, STEPS.length - 1);
  if (safeStep !== currentStep) setCurrentStep(safeStep);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Helper to flatten all selections across departments + company-wide
  const getAllSelections = () => {
    const all = { staff: [], expenses: [], assets: [], liabilities: [], vehicles: [] };
    // Department items
    Object.entries(deptSelections).forEach(([dept, cats]) => {
      Object.keys(all).forEach(cat => {
        (cats[cat] || []).forEach(item => {
          all[cat].push({ ...item, department: dept });
        });
      });
    });
    // Company-wide items
    Object.keys(all).forEach(cat => {
      companySelections[cat].forEach(item => {
        all[cat].push({ ...item });
      });
    });
    return all;
  };

  const handleCreate = async () => {
    setIsCreating(true);

    const budget = await base44.entities.Budget.create({
      name: form.name,
      fiscal_year: Number(form.fiscal_year),
      description: form.description,
      status: 'draft',
      departments: form.departments || [],
      gross_revenue_projection: Number(form.gross_revenue_projection) || 0,
      net_profit_target_percentage: Number(form.net_profit_target_percentage) || 0,
      net_profit_target_amount: Math.round((Number(form.gross_revenue_projection) || 0) * (Number(form.net_profit_target_percentage) || 0) / 100),
    });

    const budgetId = budget.id;
    const selections = getAllSelections();

    // Prepare bulk items, stripping internal marker fields
    const staffItems = selections.staff.map(({ _presetIdx, _source, ...rest }) => {
      const salary = rest.salary || 0;
      const commissionForTax = rest.cost_category === 'split' ? (rest.commission_amount || 0) : 0;
      const taxBase = salary + commissionForTax;
      return { ...rest, budget_id: budgetId, taxes_cost: Math.round(taxBase * EMPLOYER_TAX_RATE * 100) / 100 };
    });
    const expenseItems = selections.expenses.map(({ _presetIdx, _source, ...rest }) => ({ ...rest, budget_id: budgetId }));
    const assetItems = selections.assets.map(({ _presetIdx, _source, ...rest }) => ({ ...rest, budget_id: budgetId }));
    const liabilityItems = selections.liabilities.map(({ _presetIdx, _source, ...rest }) => ({ ...rest, budget_id: budgetId }));
    const vehicleItems = selections.vehicles.map(({ _presetIdx, _source, ...rest }) => ({ ...rest, budget_id: budgetId }));

    const bulkOps = [];
    if (staffItems.length) bulkOps.push(base44.entities.StaffDetail.bulkCreate(staffItems));
    if (expenseItems.length) bulkOps.push(base44.entities.ExpenseDetail.bulkCreate(expenseItems));
    if (assetItems.length) bulkOps.push(base44.entities.AssetDetail.bulkCreate(assetItems));
    if (liabilityItems.length) bulkOps.push(base44.entities.LiabilityDetail.bulkCreate(liabilityItems));
    if (vehicleItems.length) bulkOps.push(base44.entities.VehicleDetail.bulkCreate(vehicleItems));

    // Save profit sharing plan if configured
    if (Number(profitSharingConfig.company_retention_amount) > 0 || (profitSharingConfig.distribution_tiers || []).length > 0) {
      bulkOps.push(base44.entities.ProfitSharingPlan.create({
        budget_id: budgetId,
        company_retention_amount: Number(profitSharingConfig.company_retention_amount) || 0,
        distribution_tiers: (profitSharingConfig.distribution_tiers || []).map(t => ({
          ...t,
          value: Number(t.value) || 0,
          recipients: (t.recipients || []).map(r => ({
            ...r,
            weight: Number(r.weight) || 0,
            cap_amount: r.cap_amount ? Number(r.cap_amount) : null,
          })),
        })),
        notes: profitSharingConfig.notes || '',
      }));
    }

    await Promise.all(bulkOps);

    toast.success('Budget created successfully!');
    navigate(createPageUrl(`BudgetDetail?id=${budgetId}`));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Budgets'))}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            New Budget Wizard
          </h1>
          <p className="text-sm text-slate-500">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
      </div>

      <WizardStepNav steps={STEPS} currentStep={currentStep} onStepClick={(idx) => {
        if (idx === 0 || canProceedFromBasics) setCurrentStep(idx);
      }} />

      <Card className="mt-6">
        <CardContent className="p-6">
          {stepKey === 'basics' && (
            <WizardBasicsStep form={form} setForm={setForm} />
          )}

          {['staff', 'expenses', 'assets', 'liabilities', 'vehicles'].includes(stepKey) && (
            <WizardPrefillStep
              category={stepKey}
              selectedItems={selections[stepKey]}
              setSelectedItems={(updater) => {
                setSelections(prev => ({
                  ...prev,
                  [stepKey]: typeof updater === 'function' ? updater(prev[stepKey]) : updater,
                }));
              }}
            />
          )}

          {stepKey === 'profit_sharing' && (
            <WizardProfitSharingStep
              config={profitSharingConfig}
              setConfig={setProfitSharingConfig}
              netProfitEstimate={(() => {
                const revenue = Number(form.gross_revenue_projection) || 0;
                const staffTotal = selections.staff.reduce((s, i) => s + (i.salary || 0) + (i.benefits_cost || 0) + (i.commission_amount || 0), 0);
                const expenseTotal = selections.expenses.reduce((s, i) => {
                  const a = Number(i.amount) || 0;
                  if (i.period === 'monthly') return s + a * 12;
                  if (i.period === 'quarterly') return s + a * 4;
                  return s + a;
                }, 0);
                const liabilityTotal = selections.liabilities.reduce((s, i) => s + (i.monthly_payment || 0) * 12, 0);
                return Math.max(0, revenue - staffTotal - expenseTotal - liabilityTotal);
              })()}
            />
          )}

          {stepKey === 'review' && (
            <WizardReviewStep form={form} selections={selections} profitSharingConfig={profitSharingConfig} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {isLastStep ? (
          <Button
            onClick={handleCreate}
            disabled={!canProceedFromBasics || isCreating}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
          >
            {isCreating ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1" /> Create Budget</>
            )}
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={currentStep === 0 && !canProceedFromBasics}
          >
            {currentStep === 0 && !canProceedFromBasics ? 'Fill in basics first' : 'Next'} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}