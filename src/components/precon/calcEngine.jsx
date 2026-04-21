/**
 * Simple formula evaluator for calculated fields.
 * Supports: +, -, *, / with field references.
 * E.g. "total_estimated_cost * contingency_pct / 100"
 */
export function evaluateFormula(formula, formData) {
  if (!formula) return NaN;
  // Replace field names with values
  let expr = formula;
  const fieldRefs = formula.match(/[a-z_][a-z0-9_]*/gi) || [];
  for (const ref of fieldRefs) {
    const val = parseFloat(formData[ref]);
    if (isNaN(val)) return NaN;
    expr = expr.replace(new RegExp(`\\b${ref}\\b`, 'g'), val.toString());
  }
  // Only allow numbers, operators, parentheses, decimal, space
  if (!/^[\d\s+\-*/().]+$/.test(expr)) return NaN;
  try {
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === 'number' && isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

/**
 * Resolve auto_from references.
 * Patterns:
 *   "lead.field"    → leadData.field
 *   "client.field"  → clientData.field
 *   "sale.field"    → saleData.field
 *   "stage.N.field" → allProgress[stageOrder=N].form_data.field
 */
export function resolveAutoFrom(autoFrom, ctx) {
  if (!autoFrom) return undefined;
  const parts = autoFrom.split('.');
  const source = parts[0];
  if (source === 'stage') {
    const stageOrder = parseInt(parts[1]);
    const field = parts[2];
    const stageProgress = ctx.allProgress?.find(p => ctx.stageOrderMap?.[p.stage_id] === stageOrder);
    return stageProgress?.form_data?.[field] ?? undefined;
  }
  const data = ctx[source + 'Data'];
  if (!data) return undefined;
  return data[parts.slice(1).join('.')] ?? data[parts[1]] ?? undefined;
}