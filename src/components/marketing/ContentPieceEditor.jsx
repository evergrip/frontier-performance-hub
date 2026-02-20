import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ContentPieceEditor({ piece, open, onClose, onSave }) {
  const [edited, setEdited] = useState({ ...piece });
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a top-tier marketing copywriter. Rewrite this ${piece.channel} post to be more engaging, creative, and interactive.
Keep the same topic and message but make it much more compelling. Use emojis where appropriate.

Current content:
Title: ${edited.title}
Body: ${edited.body}
Hashtags: ${edited.hashtags}
CTA: ${edited.call_to_action}

Rewrite it to be highly engaging and scroll-stopping.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          hashtags: { type: "string" },
          call_to_action: { type: "string" }
        }
      }
    });
    setEdited(prev => ({ ...prev, ...res }));
    setRegenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Content Piece</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={edited.scheduled_date || ''}
                onChange={e => setEdited({ ...edited, scheduled_date: e.target.value })}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Time</Label>
              <Input
                placeholder="e.g., 10:00 AM"
                value={edited.scheduled_time || ''}
                onChange={e => setEdited({ ...edited, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title / Headline</Label>
            <Input value={edited.title || ''} onChange={e => setEdited({ ...edited, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Content Body</Label>
            <Textarea
              className="min-h-[150px]"
              value={edited.body || ''}
              onChange={e => setEdited({ ...edited, body: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input value={edited.hashtags || ''} onChange={e => setEdited({ ...edited, hashtags: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Call to Action</Label>
            <Input value={edited.call_to_action || ''} onChange={e => setEdited({ ...edited, call_to_action: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Image Prompt (for AI generation)</Label>
            <Textarea
              value={edited.image_prompt || ''}
              onChange={e => setEdited({ ...edited, image_prompt: e.target.value })}
              placeholder="Describe the ideal image for this post..."
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={edited.notes || ''} onChange={e => setEdited({ ...edited, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleRegenerate} disabled={regenerating} className="gap-2">
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            AI Rewrite
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-[#ea7924] hover:bg-[#d66a1f]" onClick={() => onSave(edited)}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}