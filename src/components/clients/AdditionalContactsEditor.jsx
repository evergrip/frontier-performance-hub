import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, UserPlus } from 'lucide-react';

const EMPTY_CONTACT = { name: '', relationship: '', email: '', phone: '', notes: '' };

export default function AdditionalContactsEditor({ contacts = [], onChange }) {
  const addContact = () => onChange([...contacts, { ...EMPTY_CONTACT }]);

  const removeContact = (index) => onChange(contacts.filter((_, i) => i !== index));

  const updateContact = (index, field, value) => {
    const updated = contacts.map((c, i) => i === index ? { ...c, [field]: value } : c);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-slate-500" />
          Additional Contacts / Family Members
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1">
          <Plus className="w-3 h-3" /> Add Person
        </Button>
      </div>

      {contacts.length === 0 && (
        <p className="text-xs text-slate-400 italic">No additional contacts. Click "Add Person" to include family members or other contacts.</p>
      )}

      {contacts.map((contact, index) => (
        <div key={index} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Person {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-400 hover:text-red-600"
              onClick={() => removeContact(index)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={contact.name}
                onChange={(e) => updateContact(index, 'name', e.target.value)}
                placeholder="Jane Smith"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Relationship</Label>
              <Input
                value={contact.relationship}
                onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                placeholder="Spouse, Son, Partner..."
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={contact.email}
                onChange={(e) => updateContact(index, 'email', e.target.value)}
                placeholder="jane@email.com"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                value={contact.phone}
                onChange={(e) => updateContact(index, 'phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}