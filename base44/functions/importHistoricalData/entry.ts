import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        const csvText = await file.text();
        const rows = parseCSV(csvText);

        if (rows.length === 0) {
            return Response.json({ error: 'CSV file is empty' }, { status: 400 });
        }

        const results = {
            success: 0,
            errors: [],
            summary: {
                clients_created: 0,
                leads_created: 0,
                sales_created: 0,
                projects_created: 0,
                commissions_created: 0
            }
        };

        // Pre-fetch company settings once (not per-row)
        const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
        const fiscalStartMonth = settingsList[0]?.fiscal_year_start_month || 10;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // +2 because row 1 is header and we're 0-indexed

            try {
                // Step 1: Handle Client
                let clientId = null;
                if (row.External_Client_ID) {
                    // Try to find existing client
                    const existingClients = await base44.asServiceRole.entities.Client.filter({
                        notes: row.External_Client_ID // Using notes field to store external ID
                    });
                    if (existingClients.length > 0) {
                        clientId = existingClients[0].id;
                    }
                }

                if (!clientId && row.Client_ContactName) {
                    // Create new client
                    const clientData = {
                        company_name: row.Client_CompanyName || row.Client_ContactName,
                        contact_name: row.Client_ContactName,
                        email: row.Client_Email || '',
                        phone: row.Client_Phone || '',
                        address: row.Client_Address || '',
                        status: row.Client_Status || 'active',
                        notes: row.External_Client_ID ? `External ID: ${row.External_Client_ID}\n${row.Client_Notes || ''}` : (row.Client_Notes || '')
                    };
                    const client = await base44.asServiceRole.entities.Client.create(clientData);
                    clientId = client.id;
                    results.summary.clients_created++;
                }

                if (!clientId) {
                    throw new Error('Client information is required');
                }

                // Step 2: Handle Lead (optional)
                let leadId = null;
                if (row.Lead_Title) {
                    const leadData = {
                        client_id: clientId,
                        title: row.Lead_Title,
                        source: row.Lead_Source || 'other',
                        status: row.Lead_Status || 'converted',
                        lead_score: parseFloat(row.Lead_Score) || 50,
                        estimated_precon_value: parseFloat(row.Lead_EstimatedPreconValue) || 0,
                        estimated_construction_value: parseFloat(row.Lead_EstimatedConstructionValue) || 0,
                        assigned_to: row.Lead_AssignedToUserId || '',
                        disqualification_reason: row.Lead_DisqualificationReason || '',
                        notes: row.External_Lead_ID ? `External ID: ${row.External_Lead_ID}\n${row.Lead_Notes || ''}` : (row.Lead_Notes || '')
                    };
                    const lead = await base44.asServiceRole.entities.Lead.create(leadData);
                    leadId = lead.id;
                    results.summary.leads_created++;
                }

                // Step 3: Handle Sale (required)
                if (!row.Sale_Type || !row.Sale_Title || !row.Sale_ContractValue || !row.Sale_CloseDate) {
                    throw new Error('Sale_Type, Sale_Title, Sale_ContractValue, and Sale_CloseDate are required');
                }

                const saleData = {
                    client_id: clientId,
                    lead_id: leadId,
                    sale_type: row.Sale_Type,
                    title: row.Sale_Title,
                    status: row.Sale_Status || 'closed_won',
                    contract_value: parseFloat(row.Sale_ContractValue),
                    close_date: row.Sale_CloseDate,
                    target_precon_completion_date: row.Sale_TargetPreconCompletionDate || null,
                    estimated_construction_budget: parseFloat(row.Sale_EstimatedConstructionBudget) || 0,
                    assigned_to: row.Sale_AssignedToUserId || '',
                    commission_processed: false,
                    notes: row.External_Sale_ID ? `External ID: ${row.External_Sale_ID}\n${row.Sale_Notes || ''}` : (row.Sale_Notes || '')
                };

                const sale = await base44.asServiceRole.entities.Sale.create(saleData);
                results.summary.sales_created++;

                // Update lead with converted sale ID if lead exists
                if (leadId) {
                    await base44.asServiceRole.entities.Lead.update(leadId, {
                        converted_to_sale_id: sale.id
                    });
                }

                // Step 4: Handle Project (optional)
                let projectId = null;
                if (row.Project_Title && row.Project_Type) {
                    const projectData = {
                        client_id: clientId,
                        sale_id: sale.id,
                        project_type: row.Project_Type,
                        title: row.Project_Title,
                        status: row.Project_Status || 'closed',
                        contract_value: parseFloat(row.Project_ContractValue) || parseFloat(row.Sale_ContractValue),
                        actual_costs: parseFloat(row.Project_ActualCosts) || 0,
                        start_date: row.Project_StartDate || null,
                        target_completion_date: row.Project_TargetCompletionDate || null,
                        actual_completion_date: row.Project_ActualCompletionDate || null,
                        project_manager_id: row.Project_ManagerUserId || '',
                        crew_assignment: row.Project_CrewAssignment || 'unassigned',
                        color: row.Project_Color || '',
                        phases: [],
                        notes: row.Project_Notes || ''
                    };

                    const project = await base44.asServiceRole.entities.Project.create(projectData);
                    projectId = project.id;
                    results.summary.projects_created++;

                    // Update sale with converted project ID
                    await base44.asServiceRole.entities.Sale.update(sale.id, {
                        converted_to_project_id: project.id
                    });
                }

                // Step 5: Handle Commission (optional)
                if (row.Commission_Amount && row.Sale_AssignedToUserId) {
                    const commissionAmount = parseFloat(row.Commission_Amount);
                    const saleAmount = parseFloat(row.Commission_SaleAmount) || parseFloat(row.Sale_ContractValue);
                    const commissionRate = parseFloat(row.Commission_Rate) || 0;
                    const transactionDate = row.Commission_HistoricalCreatedDate || row.Sale_CloseDate;

                    // Create commission transaction
                    const transactionData = {
                        user_id: row.Sale_AssignedToUserId,
                        sale_id: sale.id,
                        sale_type: row.Sale_Type,
                        project_id: projectId || '',
                        transaction_type: row.Commission_TransactionType || 'sale_commission',
                        amount: commissionAmount,
                        commission_rate: commissionRate,
                        sale_amount: saleAmount,
                        tier_at_time: row.Commission_TierAtTime || '',
                        status: row.Commission_Status || 'banked',
                        notes: row.Commission_Notes || 'Historical import',
                        audit_log: [{
                            timestamp: new Date().toISOString(),
                            edited_by: user.email,
                            changes: 'Initial import',
                            note: 'Historical data import'
                        }]
                    };

                    const transaction = await base44.asServiceRole.entities.CommissionTransaction.create(transactionData);
                    results.summary.commissions_created++;

                    // Update or create CommissionBank
                    const existingBanks = await base44.asServiceRole.entities.CommissionBank.filter({
                        user_id: row.Sale_AssignedToUserId
                    });

                    const commissionStatus = row.Commission_Status || 'banked';
                    const bankBalanceAdjustment = (commissionStatus === 'banked' || commissionStatus === 'pending') ? commissionAmount : 0;
                    const availableBalanceAdjustment = (commissionStatus === 'available') ? commissionAmount : 0;
                    const paidOutAdjustment = (commissionStatus === 'paid') ? commissionAmount : 0;

                    // Determine fiscal year from transaction date
                    const transDate = new Date(transactionDate);
                    const transYear = transDate.getFullYear();
                    const transMonth = transDate.getMonth() + 1;
                    
                    // Calculate if this transaction is in current fiscal year
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
                            total_earned: bank.total_earned + commissionAmount,
                            current_bank_balance: bank.current_bank_balance + bankBalanceAdjustment,
                            available_balance: bank.available_balance + availableBalanceAdjustment,
                            total_paid_out: bank.total_paid_out + paidOutAdjustment
                        };

                        // Only update YTD volumes if in current fiscal year
                        if (isCurrentFiscalYear) {
                            if (row.Sale_Type === 'construction') {
                                updateData.ytd_construction_volume = bank.ytd_construction_volume + saleAmount;
                            } else if (row.Sale_Type === 'preconstruction') {
                                updateData.ytd_preconstruction_volume = bank.ytd_preconstruction_volume + saleAmount;
                            }
                            updateData.ytd_sales_volume = bank.ytd_sales_volume + saleAmount;
                        }

                        await base44.asServiceRole.entities.CommissionBank.update(bank.id, updateData);
                    } else {
                        const bankData = {
                            user_id: row.Sale_AssignedToUserId,
                            total_earned: commissionAmount,
                            current_bank_balance: bankBalanceAdjustment,
                            available_balance: availableBalanceAdjustment,
                            total_paid_out: paidOutAdjustment,
                            quarterly_payout_amount: 0,
                            ytd_sales_volume: isCurrentFiscalYear ? saleAmount : 0,
                            ytd_construction_volume: (isCurrentFiscalYear && row.Sale_Type === 'construction') ? saleAmount : 0,
                            ytd_preconstruction_volume: (isCurrentFiscalYear && row.Sale_Type === 'preconstruction') ? saleAmount : 0,
                            current_tier: row.Commission_TierAtTime || ''
                        };

                        await base44.asServiceRole.entities.CommissionBank.create(bankData);
                    }

                    // Mark sale as commission processed
                    await base44.asServiceRole.entities.Sale.update(sale.id, {
                        commission_processed: true,
                        commission_transaction_ids: [transaction.id]
                    });
                }

                results.success++;

            } catch (error) {
                results.errors.push({
                    row: rowNum,
                    error: error.message,
                    data: row
                });
            }
        }

        return Response.json({
            message: 'Import completed',
            results
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        rows.push(row);
    }

    return rows;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}