import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all closed_won preconstruction sales
        const allSales = await base44.asServiceRole.entities.Sale.filter({});
        const preconSales = allSales.filter(s => 
            s.sale_type === 'preconstruction' && s.status === 'closed_won'
        );

        const results = [];

        for (const sale of preconSales) {
            // Skip if already has actual_precon_costs set
            if (sale.actual_precon_costs && sale.actual_precon_costs > 0) {
                results.push({ id: sale.id, title: sale.title, action: 'skipped', reason: 'already has value', value: sale.actual_precon_costs });
                continue;
            }

            // Calculate from invoices
            const totalInvoiced = (sale.invoices || []).reduce((sum, inv) => sum + (inv.amount || 0), 0);
            
            // If no invoices, use contract_value as the cost (precon revenue = precon cost for these)
            // Only backfill if we have some data to work with
            const costValue = totalInvoiced > 0 ? totalInvoiced : (sale.contract_value || 0);

            if (costValue > 0) {
                await base44.asServiceRole.entities.Sale.update(sale.id, {
                    actual_precon_costs: costValue
                });
                results.push({ id: sale.id, title: sale.title, action: 'updated', source: totalInvoiced > 0 ? 'invoices' : 'contract_value', value: costValue });
            } else {
                results.push({ id: sale.id, title: sale.title, action: 'skipped', reason: 'no data to derive cost from', value: 0 });
            }
        }

        return Response.json({ 
            success: true, 
            total_precon_sales: preconSales.length,
            updated: results.filter(r => r.action === 'updated').length,
            skipped: results.filter(r => r.action === 'skipped').length,
            details: results 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});