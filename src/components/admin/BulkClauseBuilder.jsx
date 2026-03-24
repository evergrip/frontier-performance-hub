import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import BulkClauseEditForm from './BulkClauseEditForm';
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

function parseClausesFromText(text) {
  const clauses = [];
  // Split by "Clause N" or "Clause ID:" patterns
  const clauseBlocks = text.split(/(?=Clause\s+\d+\s*\n)/i).filter(b => b.trim());

  for (const block of clauseBlocks) {
    const get = (label) => {
      const regex = new RegExp(`${label}\\s*:\\s*(.+?)(?=\n[A-Z][a-z]+ ?[A-Z]|\n*$)`, 's');
      const match = block.match(regex);
      return match ? match[1].trim() : '';
    };

    const clauseId = get('Clause ID');
    const section = get('Section');
    const title = get('Title');
    
    // Extract template body (between "Template Body:" and "Risk Level:")
    const bodyMatch = block.match(/Template Body:\s*\n([\s\S]*?)(?=\nRisk Level:)/i);
    const templateBody = bodyMatch ? bodyMatch[1].trim() : '';

    const riskMatch = block.match(/Risk Level:\s*(Low|Medium|High)/i);
    const riskLevel = riskMatch ? riskMatch[1] : 'Medium';

    const defaultMatch = block.match(/Include by default:\s*(Yes|No)/i);
    const defaultInclude = defaultMatch ? defaultMatch[1].toLowerCase() === 'yes' : true;

    // Parse input fields
    const inputFields = [];
    const fieldSection = block.match(/Input Fields:\s*\n([\s\S]*?)(?=\nTriggers:|$)/i);
    if (fieldSection) {
      const fieldLines = fieldSection[1].split('\n').filter(l => l.trim() && l.includes('→'));
      for (const line of fieldLines) {
        const parts = line.trim().split('→').map(p => p.trim());
        if (parts.length >= 3) {
          const fieldType = parts[0].toLowerCase();
          const required = parts[1].toLowerCase() === 'req';
          const keyRaw = parts[2].split('(')[0].trim();
          inputFields.push({
            key: keyRaw,
            label: keyRaw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: fieldType === 'textarea' ? 'textarea' : fieldType === 'number' ? 'number' : fieldType === 'boolean' ? 'boolean' : fieldType === 'select' ? 'select' : 'text',
            required,
            placeholder: parts[2].includes('(') ? parts[2].match(/\((.+)\)/)?.[1] || '' : ''
          });
        }
      }
    }

    // Parse triggers
    const triggers = [];
    const triggerSection = block.match(/Triggers:\s*\n([\s\S]*?)$/i);
    if (triggerSection && !triggerSection[1].trim().startsWith('None')) {
      const triggerText = triggerSection[1];
      if (triggerText.includes('When this clause is selected')) {
        const targetLines = triggerText.split('\n').filter(l => l.trim().match(/^[A-Z]{2,}-\d+/));
        const targetIds = targetLines.map(l => {
          const idMatch = l.trim().match(/^([A-Z]+-\d+)/);
          return idMatch ? `FS-${idMatch[1]}` : null;
        }).filter(Boolean);

        if (targetIds.length > 0) {
          triggers.push({
            condition_type: 'clause_selected',
            target_clause_ids: targetIds,
            description: `When selected, requires ${targetIds.join(', ')}`
          });
        }
      }
    }

    if (clauseId && title && section) {
      clauses.push({
        clause_id: clauseId.startsWith('FS-') ? clauseId : `FS-${clauseId}`,
        section,
        title,
        template_body: templateBody,
        input_fields: inputFields,
        risk_level: riskLevel,
        default_include: defaultInclude,
        sort_order: clauses.length * 10 + 10,
        triggers,
        is_active: true
      });
    }
  }

  return clauses;
}

export default function BulkClauseBuilder({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState('');
  const [parsedClauses, setParsedClauses] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [removedIdxs, setRemovedIdxs] = useState(new Set());
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingClause, setEditingClause] = useState(null);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setParsedClauses(null);
    setRemovedIdxs(new Set());

    try {
      // First try direct text parsing for well-structured input
      const directParsed = parseClausesFromText(rawText);
      if (directParsed.length > 0) {
        setParsedClauses(directParsed);
        toast.success(`Parsed ${directParsed.length} clauses from text`);
        setParsing(false);
        return;
      }

      // Fallback to AI parsing for unstructured input
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a feasibility study clause parser for a construction company.
Parse the following raw text into structured feasibility clauses. Each clause should be categorized into one of these sections:
${SECTIONS.map((s, i) => `${i + 1}. ${s}`).join('\n')}

For each clause extract: clause_id, section, title, template_body, input_fields (array with key, label, type, required), risk_level, default_include, sort_order, triggers (array with condition_type, target_clause_ids, description).

Raw text:
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
                  input_fields: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, label: { type: 'string' }, type: { type: 'string' }, required: { type: 'boolean' } } } },
                  risk_level: { type: 'string' },
                  default_include: { type: 'boolean' },
                  sort_order: { type: 'number' },
                  triggers: { type: 'array', items: { type: 'object', properties: { condition_type: { type: 'string' }, target_clause_ids: { type: 'array', items: { type: 'string' } }, description: { type: 'string' } } } }
                }
              }
            }
          }
        }
      });

      console.log('LLM result:', JSON.stringify(result));
      const clauses = result?.clauses || (Array.isArray(result) ? result : []);
      setParsedClauses(clauses);
      if (clauses.length === 0) {
        toast.error('No clauses were parsed. Check the format and try again.');
      }
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse: ' + (err.message || 'Unknown error'));
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

              if (editingIdx === idx) {
                return (
                  <BulkClauseEditForm
                    key={idx}
                    clause={editingClause}
                    onChange={setEditingClause}
                    onSave={() => {
                      const updated = [...parsedClauses];
                      updated[idx] = editingClause;
                      setParsedClauses(updated);
                      setEditingIdx(null);
                      setEditingClause(null);
                    }}
                    onCancel={() => { setEditingIdx(null); setEditingClause(null); }}
                  />
                );
              }

              const isExpanded = expandedIdx === idx;
              return (
                <Card key={idx} className="relative cursor-pointer hover:border-blue-300 transition-colors" onClick={() => { setEditingIdx(idx); setEditingClause({ ...clause }); setExpandedIdx(null); }}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
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
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{(clause.input_fields || []).length} input fields</span>
                          <Pencil className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-blue-500">Click to edit</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); removeClause(idx); }}>
                        <X className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
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