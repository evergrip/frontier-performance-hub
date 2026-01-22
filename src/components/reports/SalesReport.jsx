import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export default function SalesReport({ dateRange, staffId }) {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const analyzeDisqualifiedLeads = () => {
    const disqualifiedAfterProposal = leads.filter(lead => {
      if (lead.status !== 'disqualified') return false;
      
      // Filter by staff if specified
      if (staffId && staffId !== 'all' && lead.assigned_to !== staffId) return false;
      
      const statusHistory = lead.status_history || [];
      const reachedProposal = statusHistory.some(h => h.status === 'preconstruction_proposal');
      
      return reachedProposal;
    });

    const bySalesperson = {};
    
    disqualifiedAfterProposal.forEach(lead => {
      const salesPersonId = lead.assigned_to;
      if (!salesPersonId) return;
      
      if (!bySalesperson[salesPersonId]) {
        bySalesperson[salesPersonId] = {
          count: 0,
          leads: []
        };
      }
      
      bySalesperson[salesPersonId].count++;
      bySalesperson[salesPersonId].leads.push(lead);
    });

    return bySalesperson;
  };

  const disqualifiedData = analyzeDisqualifiedLeads();
  const salespeopleWithData = Object.keys(disqualifiedData);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Leads Disqualified After Proposal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {salespeopleWithData.length === 0 ? (
          <p className="text-sm text-slate-500">No leads disqualified after proposal presentation in this period</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesperson</TableHead>
                <TableHead className="text-right">Disqualified After Proposal</TableHead>
                <TableHead>Recent Leads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salespeopleWithData.map(salesPersonId => {
                const user = users.find(u => u.id === salesPersonId);
                const data = disqualifiedData[salesPersonId];
                
                return (
                  <TableRow key={salesPersonId}>
                    <TableCell className="font-medium">
                      {user?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{data.count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {data.leads.slice(0, 3).map(lead => (
                          <Badge key={lead.id} variant="outline" className="text-xs">
                            {lead.title}
                          </Badge>
                        ))}
                        {data.leads.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{data.leads.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}