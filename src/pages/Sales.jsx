import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';

export default function Sales() {
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date'),
    initialData: [],
  });

  const statusColumns = [
    { status: 'prospect', label: 'Prospect', color: 'bg-slate-100 border-slate-200' },
    { status: 'proposal_sent', label: 'Proposal Sent', color: 'bg-blue-100 border-blue-200' },
    { status: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 border-amber-200' },
    { status: 'closed_won', label: 'Closed Won', color: 'bg-emerald-100 border-emerald-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Sales Pipeline</h1>
        <p className="text-lg text-slate-500">Manage your active sales opportunities</p>
      </div>

      {sales.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusColumns.map(column => {
            const columnSales = sales.filter(s => s.status === column.status);
            const totalValue = columnSales.reduce((sum, s) => sum + (s.contract_value || 0), 0);
            return (
              <div key={column.status}>
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">{column.label}</h3>
                  <p className="text-sm text-slate-500">
                    {columnSales.length} deals • ${(totalValue / 1000).toFixed(0)}K
                  </p>
                </div>
                <div className="space-y-3">
                  {columnSales.map(sale => (
                    <Card key={sale.id} className={`border-2 ${column.color} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 flex-1">{sale.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            sale.sale_type === 'preconstruction' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {sale.sale_type}
                          </span>
                        </div>
                        {sale.contract_value && (
                          <p className="text-lg font-bold text-slate-900 mb-2">
                            ${sale.contract_value.toLocaleString()}
                          </p>
                        )}
                        {sale.estimated_margin && (
                          <p className="text-sm text-slate-600">
                            Margin: {sale.estimated_margin}%
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title="No sales yet"
              description="Convert leads to sales to start tracking your pipeline"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}