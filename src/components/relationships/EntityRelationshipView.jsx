import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Network, Users, Target, Briefcase, Building2, 
  ArrowRight, AlertCircle, TrendingUp, Sparkles,
  CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function EntityRelationshipView({ entityType, entityId }) {
  const [validationLogs, setValidationLogs] = useState([]);
  const [aiHighlights, setAiHighlights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch entity and related data
  const { data: entity } = useQuery({
    queryKey: [entityType.toLowerCase(), entityId],
    queryFn: async () => {
      const entities = await base44.entities[entityType].list();
      return entities.find(e => e.id === entityId);
    },
    enabled: !!entityId,
  });

  const { data: relatedData } = useQuery({
    queryKey: ['relationships', entityType, entityId],
    queryFn: async () => {
      const data = {};
      
      if (entityType === 'Client') {
        data.leads = await base44.entities.Lead.filter({ client_id: entityId });
        data.sales = await base44.entities.Sale.filter({ client_id: entityId });
        data.projects = await base44.entities.Project.filter({ client_id: entityId });
      } else if (entityType === 'Lead') {
        if (entity?.client_id) {
          const clients = await base44.entities.Client.list();
          data.client = clients.find(c => c.id === entity.client_id);
        }
        if (entity?.converted_to_sale_id) {
          const sales = await base44.entities.Sale.list();
          data.convertedSale = sales.find(s => s.id === entity.converted_to_sale_id);
        }
      } else if (entityType === 'Sale') {
        if (entity?.client_id) {
          const clients = await base44.entities.Client.list();
          data.client = clients.find(c => c.id === entity.client_id);
        }
        if (entity?.lead_id) {
          const leads = await base44.entities.Lead.list();
          data.lead = leads.find(l => l.id === entity.lead_id);
        }
        if (entity?.converted_to_project_id) {
          const projects = await base44.entities.Project.list();
          data.project = projects.find(p => p.id === entity.converted_to_project_id);
        }
        const transactions = await base44.entities.CommissionTransaction.filter({ sale_id: entityId });
        data.commissionTransactions = transactions;
      } else if (entityType === 'Project') {
        if (entity?.client_id) {
          const clients = await base44.entities.Client.list();
          data.client = clients.find(c => c.id === entity.client_id);
        }
        if (entity?.sale_id) {
          const sales = await base44.entities.Sale.list();
          data.sale = sales.find(s => s.id === entity.sale_id);
        }
      }
      
      return data;
    },
    enabled: !!entity,
  });

  // AI Analysis
  const analyzeRelationships = async () => {
    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke('aiRecommender', {
        context_type: 'entity_relationships',
        entity_data: {
          entity_type: entityType,
          entity: entity,
          related: relatedData
        }
      });

      setAiHighlights(response.data.recommendations);
      toast.success('AI analysis complete');
    } catch (error) {
      toast.error('Analysis failed');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Validation logging
  const runValidation = async () => {
    const logs = [];
    
    // Data integrity checks
    logs.push({
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `Validating ${entityType} relationships...`
    });

    if (entityType === 'Sale') {
      if (!entity?.client_id) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'Missing client_id - Sale must be linked to a Client'
        });
      } else {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'success',
          message: 'Client relationship validated'
        });
      }

      if (entity?.status === 'closed_won' && !entity?.converted_to_project_id) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'warning',
          message: 'Closed Won sale without project - consider creating project'
        });
      }

      if (entity?.contract_value && entity.contract_value > 5000000) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'warning',
          message: 'High value contract - ensure proper approvals'
        });
      }
    }

    if (entityType === 'Project') {
      if (!entity?.sale_id) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'Missing sale_id - Project must originate from a Sale'
        });
      }

      if (entity?.actual_margin && entity.actual_margin < 0) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'Negative margin detected - review project costs'
        });
      }
    }

    if (entityType === 'Lead') {
      if (entity?.status === 'converted' && !entity?.converted_to_sale_id) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'Lead marked converted but no sale_id reference'
        });
      }
    }

    // Run AI validation
    try {
      const response = await base44.functions.invoke('aiDataValidator', {
        validation_type: 'data_quality',
        entity_type: entityType,
        entity_id: entityId
      });

      if (response.data.validation_results?.anomalies?.length > 0) {
        response.data.validation_results.anomalies.forEach(anomaly => {
          logs.push({
            timestamp: new Date().toISOString(),
            type: 'warning',
            message: `AI detected: ${anomaly}`
          });
        });
      } else {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'success',
          message: 'AI validation passed - no anomalies detected'
        });
      }
    } catch (error) {
      logs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: 'AI validation failed to run'
      });
    }

    setValidationLogs(logs);
  };

  useEffect(() => {
    if (entity && relatedData) {
      runValidation();
    }
  }, [entity, relatedData]);

  if (!entity) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-400">
          <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select an entity to view relationships</p>
        </CardContent>
      </Card>
    );
  }

  const getEntityIcon = (type) => {
    switch(type) {
      case 'Client': return Users;
      case 'Lead': return Target;
      case 'Sale': return Briefcase;
      case 'Project': return Building2;
      default: return Network;
    }
  };

  const Icon = getEntityIcon(entityType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100">
                <Icon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">{entity.title || entity.company_name || entity.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {entityType} • ID: {entityId.slice(0, 8)}...
                  <Badge variant="outline">{entity.status}</Badge>
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={analyzeRelationships}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* AI Highlights */}
      {aiHighlights && aiHighlights.length > 0 && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiHighlights.map((highlight, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-purple-200">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{highlight.title || highlight.recommendation}</p>
                    {highlight.description && (
                      <p className="text-xs text-slate-600 mt-1">{highlight.description}</p>
                    )}
                    {highlight.priority && (
                      <Badge className="mt-2" variant={highlight.priority === 'high' ? 'destructive' : 'default'}>
                        {highlight.priority} priority
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Relationship Map */}
      <Tabs defaultValue="relationships" className="space-y-4">
        <TabsList>
          <TabsTrigger value="relationships">
            <Network className="w-4 h-4 mr-2" />
            Relationships
          </TabsTrigger>
          <TabsTrigger value="validation">
            <AlertCircle className="w-4 h-4 mr-2" />
            Validation Logs ({validationLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="relationships" className="space-y-4">
          {/* Upstream */}
          {(relatedData?.client || relatedData?.lead) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upstream (Source)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedData?.client && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{relatedData.client.company_name}</p>
                      <p className="text-sm text-slate-500">Client</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                {relatedData?.lead && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Target className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{relatedData.lead.title}</p>
                      <p className="text-sm text-slate-500">Lead</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Downstream */}
          {(relatedData?.leads || relatedData?.sales || relatedData?.projects || relatedData?.convertedSale || relatedData?.project) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Downstream (Converted To)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedData?.leads?.map(lead => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Target className="w-5 h-5 text-slate-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{lead.title}</p>
                      <p className="text-sm text-slate-500">Lead • {lead.status}</p>
                    </div>
                  </div>
                ))}
                {relatedData?.sales?.map(sale => (
                  <div key={sale.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{sale.title}</p>
                      <p className="text-sm text-slate-500">Sale • ${(sale.contract_value || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {relatedData?.projects?.map(project => (
                  <div key={project.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{project.title}</p>
                      <p className="text-sm text-slate-500">Project • {project.status}</p>
                    </div>
                  </div>
                ))}
                {relatedData?.convertedSale && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-emerald-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{relatedData.convertedSale.title}</p>
                      <p className="text-sm text-slate-500">Converted to Sale</p>
                    </div>
                  </div>
                )}
                {relatedData?.project && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{relatedData.project.title}</p>
                      <p className="text-sm text-slate-500">Converted to Project</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Commission Tracking */}
          {relatedData?.commissionTransactions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Commission Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {relatedData.commissionTransactions.map(txn => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{txn.transaction_type}</p>
                      <p className="text-sm text-slate-500">
                        Rate: {txn.commission_rate}% • Tier: {txn.tier_at_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">${(txn.amount || 0).toLocaleString()}</p>
                      <Badge variant="outline">{txn.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="validation" className="space-y-2">
          <Card>
            <CardContent className="p-4">
              {validationLogs.length > 0 ? (
                <div className="space-y-2">
                  {validationLogs.map((log, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                      log.type === 'error' ? 'bg-red-50 border border-red-200' :
                      log.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                      log.type === 'success' ? 'bg-green-50 border border-green-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      {log.type === 'error' && <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                      {log.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />}
                      {log.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />}
                      {log.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{log.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">No validation logs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}