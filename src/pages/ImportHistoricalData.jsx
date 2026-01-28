import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, FileText } from 'lucide-react';
import HistoricalProjectForm from '../components/import/HistoricalProjectForm';
import HistoricalProjectAuditForm from '../components/import/HistoricalProjectAuditForm';

export default function ImportHistoricalData() {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('form');
    const [preselectedLeadId, setPreselectedLeadId] = useState(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        const leadId = urlParams.get('lead_id');
        
        if (tab) {
            setActiveTab(tab);
        }
        if (leadId) {
            setPreselectedLeadId(leadId);
        }
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setResult(null);
        } else {
            alert('Please select a valid CSV file');
        }
    };

    const handleImport = async () => {
        if (!file) {
            alert('Please select a CSV file first');
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await base44.functions.invoke('importHistoricalData', formData);
            setResult(response.data);
        } catch (error) {
            setResult({
                message: 'Import failed',
                results: {
                    success: 0,
                    errors: [{ row: 0, error: error.message }]
                }
            });
        } finally {
            setImporting(false);
        }
    };

    const downloadSampleCSV = () => {
        const sampleData = `External_Client_ID,Client_CompanyName,Client_ContactName,Client_Email,Client_Phone,Client_Address,Client_Status,Client_Notes,External_Lead_ID,Lead_Title,Lead_Source,Lead_Status,Lead_Score,Lead_EstimatedPreconValue,Lead_EstimatedConstructionValue,Lead_AssignedToUserId,Lead_DisqualificationReason,Lead_Notes,External_Sale_ID,Sale_Type,Sale_Title,Sale_Status,Sale_ContractValue,Sale_CloseDate,Sale_TargetPreconCompletionDate,Sale_EstimatedConstructionBudget,Sale_AssignedToUserId,Sale_Notes,Project_Title,Project_Type,Project_Status,Project_ContractValue,Project_ActualCosts,Project_StartDate,Project_TargetCompletionDate,Project_ActualCompletionDate,Project_ManagerUserId,Project_CrewAssignment,Project_Color,Project_Notes,Commission_Amount,Commission_Rate,Commission_TierAtTime,Commission_SaleAmount,Commission_TransactionType,Commission_Status,Commission_Notes,Commission_HistoricalCreatedDate
CLIENT001,Acme Construction,John Smith,john@acme.com,555-0100,123 Main St,active,Existing client from 2024,LEAD001,Office Renovation Project,referral,converted,85,50000,250000,user_abc123,,Great referral from partner,SALE001,preconstruction,Office Renovation Preconstruction,closed_won,50000,2025-03-15,2025-06-30,250000,user_abc123,Completed all preconstruction phases,Office Renovation Preconstruction,preconstruction,closed,50000,45000,2025-03-15,2025-06-30,2025-06-28,user_pm001,crew_a,#3B82F6,Project completed on time,2500,5,Tier 2,50000,sale_commission,paid,Initial precon commission,2025-03-15
CLIENT001,Acme Construction,John Smith,john@acme.com,555-0100,123 Main St,active,,,,,,,,,,,,SALE002,construction,Office Renovation Construction,closed_won,250000,2025-07-01,,250000,user_abc123,Converting to construction phase,Office Renovation Construction,construction,closed,250000,220000,2025-07-15,2025-12-31,2025-12-20,user_pm001,crew_a,#3B82F6,Construction completed successfully,12500,5,Tier 2,250000,sale_commission,banked,Construction commission,2025-07-01
CLIENT002,Residential LLC,Jane Doe,jane@residential.com,555-0200,456 Oak Ave,active,New client from 2025,LEAD002,Kitchen Remodel,website,converted,75,35000,,user_abc123,,Website inquiry,SALE003,preconstruction,Kitchen Remodel Preconstruction,pending_construction_sale,35000,2025-08-10,2025-11-15,,user_abc123,Currently in engineering phase,,,,,,,,,,,,,1750,5,Tier 2,35000,sale_commission,banked,Precon commission banked,2025-08-10
CLIENT003,Builder Group,Mike Johnson,mike@buildergroup.com,555-0300,789 Pine Rd,active,Legacy client - multiple projects,,,,,,,,,,,,SALE004,construction,Warehouse Expansion,closed_won,500000,2024-11-20,,500000,user_xyz789,Large commercial project,Warehouse Expansion,construction,closed,500000,475000,2024-12-01,2025-05-31,2025-05-25,user_pm002,crew_b,#F59E0B,Completed last fiscal year,25000,5,Tier 3,500000,sale_commission,paid,Large project commission,2024-11-20`;

        const blob = new Blob([sampleData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'historical_data_sample.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Import Historical Data</h1>
                <p className="text-slate-600">
                    Import historical data either by filling out a form or uploading a CSV file.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="form" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Manual Form Entry
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Audit Tool
                    </TabsTrigger>
                    <TabsTrigger value="csv" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        CSV Upload
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="form" className="mt-6">
                    <HistoricalProjectForm />
                </TabsContent>

                <TabsContent value="audit" className="mt-6">
                    <HistoricalProjectAuditForm preselectedLeadId={preselectedLeadId} />
                </TabsContent>

                <TabsContent value="csv" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>CSV File Upload</CardTitle>
                    <CardDescription>
                        Download the sample CSV template to see the required format, then upload your completed file.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={downloadSampleCSV}
                            className="flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download Sample CSV
                        </Button>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-700 font-medium mb-2">
                                {file ? file.name : 'Click to select CSV file'}
                            </p>
                            <p className="text-sm text-slate-500">
                                Upload your historical data CSV file
                            </p>
                        </label>
                    </div>

                    <Button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className="w-full"
                    >
                        {importing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            'Import Data'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {result.results.errors.length === 0 ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            )}
                            Import Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-600 font-medium">Successful Rows</p>
                                <p className="text-2xl font-bold text-green-700">{result.results.success}</p>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-600 font-medium">Clients Created</p>
                                <p className="text-2xl font-bold text-blue-700">{result.results.summary.clients_created}</p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-sm text-purple-600 font-medium">Leads Created</p>
                                <p className="text-2xl font-bold text-purple-700">{result.results.summary.leads_created}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm text-amber-600 font-medium">Sales Created</p>
                                <p className="text-2xl font-bold text-amber-700">{result.results.summary.sales_created}</p>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <p className="text-sm text-indigo-600 font-medium">Projects Created</p>
                                <p className="text-2xl font-bold text-indigo-700">{result.results.summary.projects_created}</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-600 font-medium">Commissions Created</p>
                                <p className="text-2xl font-bold text-green-700">{result.results.summary.commissions_created}</p>
                            </div>
                        </div>

                        {result.results.errors.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    Errors ({result.results.errors.length})
                                </h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {result.results.errors.map((error, idx) => (
                                        <Alert key={idx} variant="destructive" className="text-sm">
                                            <p className="font-medium">Row {error.row}: {error.error}</p>
                                        </Alert>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900">Important Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-800 space-y-2">
                    <ul className="list-disc list-inside space-y-1">
                        <li>All dates must be in YYYY-MM-DD format</li>
                        <li>Sale_CloseDate is required and used for revenue reporting</li>
                        <li>Commission_Amount should be pre-calculated based on historical commission rates</li>
                        <li>Commission_HistoricalCreatedDate determines fiscal year for YTD calculations</li>
                        <li>External IDs are stored in the notes field for future reference</li>
                        <li>Only admin users can import historical data</li>
                    </ul>
                </CardContent>
            </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}