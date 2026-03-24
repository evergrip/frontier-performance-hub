import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const SECTIONS = [
  'Site & Zoning Analysis',
  'Structural & Building Condition',
  'Utility & Service Assessment',
  'Budget Analysis',
  'Regulatory & Permit Pathway',
  'Risk Assessment',
  'Recommendations & Next Steps'
];

export default function BulkClauseBuilder({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState('');
  const [parsedClauses, setParsedClauses] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [removedIdxs, setRemovedIdxs] = useState(new Set());

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setParsedClauses(null);
    setRemovedIdxs(new Set());

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a feasibility study clause parser for a construction company.
Parse the following raw text into structured feasibility clauses. Each clause should be categorized into one of these sections:
${SECTIONS.map((s, i) => `${i + 1}. ${s}`).join('\n')}

For each clause, extract:
- clause_id: Use the clause ID from the text (e.g. "FS-SZ-001"). Prefix with "FS-" if not already present.
- section: One of the sections listed above (exact match)
- title: The title from the text
- template_body: The template body text from the input. Keep all {{placeholder}} markers as-is.
- input_fields: An array of objects for each placeholder, with: key (matching the placeholder name), label (human-readable version of the key), type (text, textarea, number, select, or boolean), required (true/false based on "Req" marker)
- risk_level: "Low", "Medium", or "High" as specified in the text
- default_include: true if "Yes", false if "No"
- sort_order: Sequential numbering (10, 20, 30, etc.)
- triggers: Array of trigger objects. For "When this clause is selected" triggers, use condition_type "clause_selected" and list the target clause IDs (with FS- prefix) in target_clause_ids array. Include a description field.

IMPORTANT: Return ALL clauses from the text. There are 15 clauses in this text.

Raw text to parse:
${rawText}`,
        response_json_schema: {
          type: 'object',
          properties: {
            clauses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  clause_id: { type: 'string' },
                  section: { type: 'string' },
                  title: { type: 'string' },
                  template_body: { type: 'string' },
                  input_fields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        key: { type: 'string' },
                        label: { type: 'string' },
                        type: { type: 'string' },
                        options: { type: 'array', items: { type: 'string' } },
                        placeholder: { type: 'string' },
                        required: { type: 'boolean' }
                      }
                    }
                  },
                  risk_level: { type: 'string' },
                  default_include: { type: 'boolean' },
                  sort_order: { type: 'number' },
                  triggers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        condition_type: { type: 'string' },
                        target_clause_ids: { type: 'array', items: { type: 'string' } },
                        description: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        model: 'claude_sonnet_4_6'
      });

      // Handle different response shapes
      const clauses = result?.clauses || (Array.isArray(result) ? result : []);
      setParsedClauses(clauses);
      if (clauses.length === 0) {
        toast.error('No clauses were parsed. Try again or simplify the input.');
      }
    } catch (err) {
      toast.error('Failed to parse clauses: ' + (err.message || 'Unknown error'));
      setParsedClauses(null);
    }
    setParsing(false);
  };

  const handleCreateAll = async () => {
    const toCreate = parsedClauses.filter((_, i) => !removedIdxs.has(i));
    if (toCreate.length === 0) return;
    setCreating(true);

    const records = toCreate.map(c => ({
      clause_id: c.clause_id,
      section: c.section,
      title: c.title,
      template_body: c.template_body,
      input_fields: c.input_fields || [],
      risk_level: c.risk_level || 'Low',
      default_include: c.default_include ?? true,
      sort_order: c.sort_order || 10,
      is_active: true,
      triggers: []
    }));

    await base44.entities.FeasibilityClause.bulkCreate(records);
    queryClient.invalidateQueries(['all-feasibility-clauses']);
    queryClient.invalidateQueries(['feasibility-clauses']);
    toast.success(`${records.length} clauses created`);
    setCreating(false);
    setParsedClauses(null);
    setRawText('');
    onOpenChange(false);
  };

  const removeClause = (idx) => {
    setRemovedIdxs(prev => new Set([...prev, idx]));
  };

  const activeCount = parsedClauses ? parsedClauses.filter((_, i) => !removedIdxs.has(i)).length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Bulk Clause Builder
          </DialogTitle>
        </DialogHeader>

        {!parsedClauses ? (
          <div className="space-y-4 flex-1">
            <p className="text-sm text-slate-500">
              Paste your clause text below. The AI will parse it into structured clauses with appropriate sections, placeholders, and input fields. You can paste multiple clauses at once.
            </p>
            <Textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Paste your clauses here... e.g.

Lot Dimensions: The subject property is approximately 50ft x 120ft with a total lot area of 6,000 sq ft. The lot configuration is regular/rectangular.

Zoning Classification: The property falls under R-2 (Residential Two) zoning. Permitted uses include single-family dwellings and accessory dwelling units.

Structural Foundation: Visual inspection reveals the foundation is poured concrete in satisfactory condition. No significant cracking or settlement was observed."
              rows={12}
              className="resize-none"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleParse} disabled={parsing || !rawText.trim()} className="gap-2">
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {parsing ? 'Parsing...' : 'Parse Clauses'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {activeCount} clause{activeCount !== 1 ? 's' : ''} parsed. Review and remove any you don't want, then create.
              </p>
              <Button variant="ghost" size="sm" onClick={() => { setParsedClauses(null); setRemovedIdxs(new Set()); }}>
                ← Back to edit
              </Button>
            </div>

            {parsedClauses.map((clause, idx) => {
              if (removedIdxs.has(idx)) return null;
              const isExpanded = expandedIdx === idx;
              return (
                <Card key={idx} className="relative">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-slate-400">{clause.clause_id}</span>
                          <span className="text-sm font-medium text-slate-900">{clause.title}</span>
                          <Badge variant="outline" className="text-xs">{clause.section}</Badge>
                          {clause.risk_level && (
                            <Badge variant="outline" className={`text-xs ${clause.risk_level === 'High' ? 'border-red-300 text-red-600' : clause.risk_level === 'Medium' ? 'border-amber-300 text-amber-600' : 'border-green-300 text-green-600'}`}>
                              {clause.risk_level}
                            </Badge>
                          )}
                          {clause.default_include && <Badge className="text-xs bg-blue-100 text-blue-700 border-0">Default</Badge>}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-slate-400">{(clause.input_fields || []).length} input fields</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                        </div>
                      </button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeClause(idx)}>
                        <X className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Template Body</p>
                          <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded whitespace-pre-wrap">{clause.template_body}</p>
                        </div>
                        {(clause.input_fields || []).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Input Fields</p>
                            <div className="flex flex-wrap gap-1">
                              {clause.input_fields.map((f, fi) => (
                                <span key={fi} className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                                  {f.label} <span className="text-slate-400">({f.type})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <DialogFooter className="pt-3 border-t sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleCreateAll} disabled={creating || activeCount === 0} className="gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {creating ? 'Creating...' : `Create ${activeCount} Clause${activeCount !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}