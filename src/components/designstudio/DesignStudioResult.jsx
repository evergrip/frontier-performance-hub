import React, { useState } from 'react';
import { ArrowRight, Download, RotateCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function DesignStudioResult({ originalUrl, generatedUrl, style, onStartOver, onSubmitContact }) {
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!contact.name || !contact.email) return;
    setSubmitting(true);
    await onSubmitContact(contact);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Before / After */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Your {style.name} Transformation</h3>
        <p className="text-sm text-slate-500 mb-4">{style.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Before</p>
            <img src={originalUrl} alt="Original" className="w-full aspect-[4/3] object-cover rounded-xl border border-slate-200" />
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">After</p>
            <img src={generatedUrl} alt="Redesigned" className="w-full aspect-[4/3] object-cover rounded-xl border border-orange-200 shadow-lg" />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onStartOver} className="flex-1 rounded-xl">
          <RotateCcw className="w-4 h-4 mr-2" /> Try Another Style
        </Button>
        <a href={generatedUrl} download target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="outline" className="w-full rounded-xl">
            <Download className="w-4 h-4 mr-2" /> Save Image
          </Button>
        </a>
      </div>

      {/* CTA */}
      {!submitted ? (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Ready to Make This a Reality?</h3>
            <p className="text-sm text-slate-600">
              Our team specializes in bringing designs like this to life. Share your contact info and we'll reach out to discuss your project — no obligation.
            </p>
          </div>

          {!showContact ? (
            <Button
              onClick={() => setShowContact(true)}
              className="w-full py-5 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#ea7924' }}
            >
              Let's Talk About My Renovation <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Name *</Label>
                <Input
                  value={contact.name}
                  onChange={(e) => setContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Email *</Label>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Phone</Label>
                <Input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Tell us about your project</Label>
                <Textarea
                  value={contact.notes}
                  onChange={(e) => setContact(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="What are you hoping to renovate? Any budget or timeline in mind?"
                  rows={3}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!contact.name || !contact.email || submitting}
                className="w-full py-5 text-base font-semibold rounded-xl"
                style={{ backgroundColor: '#ea7924' }}
              >
                {submitting ? 'Sending...' : 'Get My Free Consultation'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
          <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-emerald-800">We'll Be in Touch!</h3>
          <p className="text-sm text-emerald-600">
            Thank you, {contact.name}! One of our design experts will reach out within 24 hours to discuss bringing your {style.name} vision to life.
          </p>
        </div>
      )}
    </div>
  );
}