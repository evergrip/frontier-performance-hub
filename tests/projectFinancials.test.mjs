import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAllocatedRevenue, calculateProjectFinancials, getCloseoutCommissionDecision, getProjectRevenue } from '../src/lib/projectFinancials.js';

const project = { title: 'Example Project', contract_value: 1000000, actual_costs: 750000 };

test('uses contract value for revenue and actual costs for margin', () => {
  assert.deepEqual(calculateProjectFinancials(project), { revenue: 1000000, costs: 750000, grossProfit: 250000, grossMargin: 25 });
});

test('forecast allocations remain based on contract value after costs are entered', () => {
  assert.equal(calculateAllocatedRevenue(project, 100), 1000000);
  assert.equal(calculateAllocatedRevenue(project, 25), 250000);
});

test('closeout uses the verified linked construction Sale contract value', () => {
  const decision = getCloseoutCommissionDecision(project, { sale_type: 'construction', contract_value: 1000000 });
  assert.deepEqual(decision, { shouldProcess: true, finalAmount: 1000000, hasContractMismatch: false });
});

test('missing linked Sale blocks commission processing but not project closeout', () => {
  assert.deepEqual(getCloseoutCommissionDecision(project, null), { shouldProcess: false, reason: 'no linked Sale was found' });
});

test('project and Sale contract mismatch produces an administrative-review warning', () => {
  const decision = getCloseoutCommissionDecision(project, { sale_type: 'construction', contract_value: 900000 });
  assert.equal(decision.shouldProcess, true);
  assert.equal(decision.finalAmount, 900000);
  assert.equal(decision.hasContractMismatch, true);
});

test('dashboard and drilldown construction totals use the same project revenue', () => {
  const projects = [project, { contract_value: 500000, actual_costs: 250000 }];
  const dashboardTotal = projects.reduce((sum, item) => sum + getProjectRevenue(item), 0);
  const drilldownTotal = projects.reduce((sum, item) => sum + getProjectRevenue(item), 0);
  assert.equal(dashboardTotal, 1500000);
  assert.equal(drilldownTotal, dashboardTotal);
});