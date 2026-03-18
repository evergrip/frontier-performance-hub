import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const payload = await req.json();
        const { client, lead, sale, project } = payload;

        // Validate required fields
        if (!client?.contact_name) {
            return Response.json({ error: 'Client contact name is required' }, { status: 400 });
        }
        if (!sale?.title) {
            return Response.json({ error: 'Sale title is required' }, { status: 400 });
        }
        // Only validate project fields if project data is provided
        if (project && project.title && (!project.actual_costs && project.actual_costs !== 0)) {
            return Response.json({ error: 'Project actual costs are required when including a project' }, { status: 400 });
        }

        // Step 1: Create or use existing Client
        let clientId;
        const clientData = {
            company_name: client.company_name || client.contact_name,
            contact_name: client.contact_name,
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            status: 'active',
            notes: client.notes || ''
        };
        const createdClient = await base44.asServiceRole.entities.Client.create(clientData);
        clientId = createdClient.id;

        // Step 2: Create Lead
        let leadId = null;
        if (lead?.title) {
            const leadData = {
                client_id: clientId,
                title: lead.title,
                source: lead.source || 'other',
                status: 'converted',
                lead_score: lead.lead_score || 50,
                status_history: lead.status_history || [],
                estimated_precon_value: lead.estimated_precon_value || 0,
                estimated_construction_value: lead.estimated_construction_value || 0,
                assigned_to: lead.assigned_to || '',
                notes: lead.notes || ''
            };
            const createdLead = await base44.asServiceRole.entities.Lead.create(leadData);
            leadId = createdLead.id;
        }

        // Step 3: Create Sale
        // Use the provided sale_status, defaulting to closed_won for backward compatibility
        const resolvedSaleStatus = sale.sale_status || 'closed_won';
        // Precon value = actual precon fees earned (revenue for precon sale)
        // Construction contract value = the construction contract amount (revenue for construction sale/project)
        const preconValue = sale.precon_value ? parseFloat(sale.precon_value) : 0;
        const constructionContractValue = sale.construction_contract_value ? parseFloat(sale.construction_contract_value) : 0;

        const saleData = {
            client_id: clientId,
            lead_id: leadId,
            sale_type: sale.sale_type || 'construction',
            title: sale.title,
            status: resolvedSaleStatus,
            phase_history: sale.status_history || [],
            contract_value: preconValue,
            estimated_construction_budget: constructionContractValue,
            estimated_margin: sale.estimated_margin ? parseFloat(sale.estimated_margin) : undefined,
            close_date: sale.close_date || null,
            assigned_to: sale.assigned_to || '',
            commission_processed: sale.commission_processed || false,
            notes: sale.notes || ''
        };
        const createdSale = await base44.asServiceRole.entities.Sale.create(saleData);

        // Update lead with converted sale ID (only if sale is closed/converted)
        if (leadId && ['closed_won', 'converted'].includes(resolvedSaleStatus)) {
            await base44.asServiceRole.entities.Lead.update(leadId, {
                converted_to_sale_id: createdSale.id
            });
        } else if (leadId) {
            // For active precon sales, mark lead as converted since it became a sale
            await base44.asServiceRole.entities.Lead.update(leadId, {
                converted_to_sale_id: createdSale.id
            });
        }

        // Step 4: Create Project (only if project data is provided and not null)
        let projectId = null;
        if (project && project.title) {
            const projectContractValue = project.construction_contract_value ? parseFloat(project.construction_contract_value) : constructionContractValue;
            const projectData = {
                client_id: clientId,
                sale_id: createdSale.id,
                project_type: project.project_type || 'construction',
                title: project.title,
                status: project.project_status || 'closed',
                contract_value: projectContractValue,
                actual_costs: parseFloat(project.actual_costs),
                actual_margin: parseFloat(project.actual_margin),
                start_date: project.start_date || null,
                target_completion_date: project.target_completion_date || null,
                actual_completion_date: project.actual_completion_date || null,
                project_manager_id: project.project_manager || '',
                crew_assignment: project.crew_assignment || 'unassigned',
                color: project.color || '#3B82F6',
                phases: project.status_history?.filter(h => h.entered_date).map(h => ({
                    name: h.status,
                    status: 'completed',
                    start_date: h.entered_date,
                    end_date: h.entered_date
                })) || [],
                notes: project.notes || ''
            };
            const createdProject = await base44.asServiceRole.entities.Project.create(projectData);
            projectId = createdProject.id;

            // Update sale with converted project ID
            await base44.asServiceRole.entities.Sale.update(createdSale.id, {
                converted_to_project_id: createdProject.id
            });
        }

        // Step 5: Create Commission Transactions if specified
        const commissionTransactions = [];
        if (sale.assigned_to && (sale.precon_commission_amount || sale.construction_commission_amount)) {
            // Preconstruction commission
            if (sale.precon_commission_amount && parseFloat(sale.precon_commission_amount) > 0) {
                const preconCommission = {
                    user_id: sale.assigned_to,
                    sale_id: createdSale.id,
                    sale_type: 'preconstruction',
                    project_id: projectId || '',
                    transaction_type: 'sale_commission',
                    amount: parseFloat(sale.precon_commission_amount),
                    commission_rate: 0,
                    sale_amount: preconValue,
                    status: 'paid',
                    notes: 'Historical preconstruction commission import',
                    audit_log: [{
                        timestamp: new Date().toISOString(),
                        edited_by: user.email,
                        changes: 'Initial import',
                        note: 'Historical data import'
                    }]
                };
                const preconTrans = await base44.asServiceRole.entities.CommissionTransaction.create(preconCommission);
                commissionTransactions.push(preconTrans.id);

                // Update commission bank for preconstruction
                await updateCommissionBank(base44, sale.assigned_to, parseFloat(sale.precon_commission_amount), 'paid', preconValue, 'preconstruction', sale.close_date);
            }

            // Construction commission
            if (sale.construction_commission_amount && parseFloat(sale.construction_commission_amount) > 0) {
                const constructionCommission = {
                    user_id: sale.assigned_to,
                    sale_id: createdSale.id,
                    sale_type: 'construction',
                    project_id: projectId || '',
                    transaction_type: 'sale_commission',
                    amount: parseFloat(sale.construction_commission_amount),
                    commission_rate: 0,
                    sale_amount: constructionContractValue,
                    status: 'paid',
                    notes: 'Historical construction commission import',
                    audit_log: [{
                        timestamp: new Date().toISOString(),
                        edited_by: user.email,
                        changes: 'Initial import',
                        note: 'Historical data import'
                    }]
                };
                const constructionTrans = await base44.asServiceRole.entities.CommissionTransaction.create(constructionCommission);
                commissionTransactions.push(constructionTrans.id);

                // Update commission bank for construction
                await updateCommissionBank(base44, sale.assigned_to, parseFloat(sale.construction_commission_amount), 'paid', constructionContractValue, 'construction', sale.close_date);
            }

            // Update sale with commission transaction IDs
            if (commissionTransactions.length > 0) {
                await base44.asServiceRole.entities.Sale.update(createdSale.id, {
                    commission_processed: true,
                    commission_transaction_ids: commissionTransactions
                });
            }
        }

        // Step 5b: Even if no commission amounts, still update YTD sales volume for the assigned salesperson
        if (sale.assigned_to && !sale.precon_commission_amount && !sale.construction_commission_amount) {
            // Update YTD volumes: precon volume uses precon value, construction uses construction contract
            if (preconValue > 0) {
                await updateCommissionBank(base44, sale.assigned_to, 0, 'pending', preconValue, 'preconstruction', sale.close_date);
            }
            if (constructionContractValue > 0) {
                await updateCommissionBank(base44, sale.assigned_to, 0, 'pending', constructionContractValue, 'construction', sale.close_date);
            }
        }

        return Response.json({
            success: true,
            client_id: clientId,
            lead_id: leadId,
            sale_id: createdSale.id,
            project_id: projectId,
            commission_transaction_ids: commissionTransactions
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});

async function updateCommissionBank(base44, userId, amount, status, saleAmount, saleType, transactionDate) {
    const existingBanks = await base44.asServiceRole.entities.CommissionBank.filter({
        user_id: userId
    });

    const bankBalanceAdjustment = (status === 'banked' || status === 'pending') ? amount : 0;
    const availableBalanceAdjustment = (status === 'available') ? amount : 0;
    const paidOutAdjustment = (status === 'paid') ? amount : 0;

    // Determine if transaction is in current fiscal year
    const transDate = new Date(transactionDate);
    const transYear = transDate.getFullYear();
    const transMonth = transDate.getMonth() + 1;
    
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const fiscalStartMonth = settingsList[0]?.fiscal_year_start_month || 10;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    let currentFiscalYear;
    if (currentMonth >= fiscalStartMonth) {
        currentFiscalYear = currentYear + 1;
    } else {
        currentFiscalYear = currentYear;
    }
    
    let transFiscalYear;
    if (transMonth >= fiscalStartMonth) {
        transFiscalYear = transYear + 1;
    } else {
        transFiscalYear = transYear;
    }
    
    const isCurrentFiscalYear = transFiscalYear === currentFiscalYear;

    if (existingBanks.length > 0) {
        const bank = existingBanks[0];
        const updateData = {
            total_earned: bank.total_earned + amount,
            current_bank_balance: bank.current_bank_balance + bankBalanceAdjustment,
            available_balance: bank.available_balance + availableBalanceAdjustment,
            total_paid_out: bank.total_paid_out + paidOutAdjustment
        };

        if (isCurrentFiscalYear) {
            if (saleType === 'construction') {
                updateData.ytd_construction_volume = bank.ytd_construction_volume + saleAmount;
            } else if (saleType === 'preconstruction') {
                updateData.ytd_preconstruction_volume = bank.ytd_preconstruction_volume + saleAmount;
            }
            updateData.ytd_sales_volume = bank.ytd_sales_volume + saleAmount;
        }

        await base44.asServiceRole.entities.CommissionBank.update(bank.id, updateData);
    } else {
        const bankData = {
            user_id: userId,
            total_earned: amount,
            current_bank_balance: bankBalanceAdjustment,
            available_balance: availableBalanceAdjustment,
            total_paid_out: paidOutAdjustment,
            quarterly_payout_amount: 0,
            ytd_sales_volume: isCurrentFiscalYear ? saleAmount : 0,
            ytd_construction_volume: (isCurrentFiscalYear && saleType === 'construction') ? saleAmount : 0,
            ytd_preconstruction_volume: (isCurrentFiscalYear && saleType === 'preconstruction') ? saleAmount : 0,
            current_tier: ''
        };

        await base44.asServiceRole.entities.CommissionBank.create(bankData);
    }
}