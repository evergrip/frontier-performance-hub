import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, User, FileText, XCircle } from 'lucide-react';

export default function DisqualifiedLeadInfoDialog({ open, onOpenChange, lead, client }) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{lead.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Contact Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client Contact</p>
            {client ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-800">{client.contact_name || client.company_name || 'Unknown'}</span>
                </div>
                {client.company_name && client.contact_name && (
                  <p className="text-xs text-slate-500 ml-6">{client.company_name}</p>
                )}
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline">{client.email}</a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`tel:${client.phone}`} className="text-sm text-blue-600 hover:underline">{client.phone}</a>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-600">{client.address}</span>
                  </div>
                )}
                {/* Additional contacts */}
                {client.additional_contacts?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-400">Additional Contacts</p>
                    {client.additional_contacts.map((ac, i) => (
                      <div key={i} className="text-xs text-slate-600">
                        <span className="font-medium">{ac.name}</span>
                        {ac.relationship && <span className="text-slate-400"> ({ac.relationship})</span>}
                        {ac.email && <span> · {ac.email}</span>}
                        {ac.phone && <span> · {ac.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No client linked</p>
            )}
          </div>

          {/* Disqualification Reason */}
          {lead.disqualification_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Disqualification Reason</p>
              </div>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{lead.disqualification_reason}</p>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Notes</p>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {!lead.disqualification_reason && !lead.notes && (
            <p className="text-sm text-slate-400 italic text-center py-2">No reason or notes recorded.</p>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}