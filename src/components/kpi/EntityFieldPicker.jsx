import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// All entities in the system
const ENTITY_NAMES = [
  'Lead', 'Sale', 'Project', 'Client', 'CommissionTransaction', 'CommissionBank',
  'CommissionPayout', 'EmployeeAssignment', 'EmployeeUnavailability', 'Holiday',
  'Subtrade', 'ProjectOverrun', 'FiscalGoal', 'DataFlag', 'User',
  'KPI', 'KPIEntry', 'KPITarget', 'CompanySettings', 'CommissionRule', 'LeadSource',
  'ReportingRelationship'
];

export default function EntityFieldPicker({ 
  selectedEntity, 
  onEntityChange, 
  selectedField, 
  onFieldChange, 
  label = "Field",
  filterTypes,
  showBuiltIns = true 
}) {
  const [schemas, setSchemas] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedEntity && !schemas[selectedEntity]) {
      loadSchema(selectedEntity);
    }
  }, [selectedEntity]);

  const loadSchema = async (entityName) => {
    setLoading(true);
    try {
      const schema = await base44.entities[entityName].schema();
      setSchemas(prev => ({ ...prev, [entityName]: schema }));
    } catch (e) {
      console.error(`Failed to load schema for ${entityName}:`, e);
    } finally {
      setLoading(false);
    }
  };

  const getFieldsForEntity = () => {
    if (!selectedEntity || !schemas[selectedEntity]) return [];
    
    const schema = schemas[selectedEntity];
    const properties = schema.properties || {};
    
    const fields = Object.entries(properties).map(([key, config]) => ({
      name: key,
      type: config.type,
      description: config.description || key,
      hasEnum: !!config.enum
    }));

    // Add built-in fields
    if (showBuiltIns) {
      fields.unshift(
        { name: 'id', type: 'string', description: 'Record ID', hasEnum: false },
        { name: 'created_date', type: 'string', description: 'Date created', hasEnum: false },
        { name: 'updated_date', type: 'string', description: 'Date updated', hasEnum: false },
        { name: 'created_by', type: 'string', description: 'Created by (email)', hasEnum: false }
      );
    }

    if (filterTypes) {
      return fields.filter(f => filterTypes.includes(f.type));
    }

    return fields;
  };

  const fields = getFieldsForEntity();

  return (
    <div className="space-y-3">
      {onEntityChange && (
        <div>
          <Label className="mb-2 block text-xs text-slate-500">Source Entity</Label>
          <Select value={selectedEntity || ''} onValueChange={(val) => {
            onEntityChange(val);
            if (onFieldChange) onFieldChange('');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select entity..." />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_NAMES.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {onFieldChange && (
        <div>
          <Label className="mb-2 block text-xs text-slate-500">{label}</Label>
          {loading ? (
            <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading fields...
            </div>
          ) : (
            <Select value={selectedField || ''} onValueChange={onFieldChange} disabled={!selectedEntity}>
              <SelectTrigger>
                <SelectValue placeholder={selectedEntity ? "Select field..." : "Select entity first"} />
              </SelectTrigger>
              <SelectContent>
                {fields.map(f => (
                  <SelectItem key={f.name} value={f.name}>
                    <div className="flex items-center gap-2">
                      <span>{f.name}</span>
                      <span className="text-xs text-slate-400">({f.type})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

export { ENTITY_NAMES };