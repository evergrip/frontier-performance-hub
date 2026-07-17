export function getProjectRevenue(project) {
  const value = Number(project?.contract_value);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateProjectFinancials(project) {
  const revenue = getProjectRevenue(project);
  const costs = Number(project?.actual_costs) || 0;
  const grossProfit = revenue - costs;
  return {
    revenue,
    costs,
    grossProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
  };
}

export function calculateAllocatedRevenue(project, percentage) {
  return getProjectRevenue(project) * ((Number(percentage) || 0) / 100);
}

export function getCloseoutCommissionDecision(project, sale) {
  if (!sale) return { shouldProcess: false, reason: 'no linked Sale was found' };
  if (sale.sale_type !== 'construction') return { shouldProcess: false, reason: 'the linked Sale is not a construction sale' };
  const finalAmount = Number(sale.contract_value);
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) return { shouldProcess: false, reason: 'the linked Sale has no valid positive contract value' };
  const projectValue = Number(project?.contract_value);
  const hasContractMismatch = Number.isFinite(projectValue) && projectValue > 0 && projectValue !== finalAmount;
  return { shouldProcess: true, finalAmount, hasContractMismatch };
}