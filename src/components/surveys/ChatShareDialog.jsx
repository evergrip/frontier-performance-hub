import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Users } from "lucide-react";

export default function ChatShareDialog({ open, onOpenChange, session, onUpdate }) {
  const [users, setUsers] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [sharedWith, setSharedWith] = useState(session?.shared_with || []);

  useEffect(() => {
    if (open) {
      base44.entities.User.list().then(setUsers);
      setSharedWith(session?.shared_with || []);
    }
  }, [open, session]);

  const addUser = (userId) => {
    if (!sharedWith.includes(userId)) {
      setSharedWith(prev => [...prev, userId]);
    }
    setSearchEmail("");
  };

  const removeUser = (userId) => {
    setSharedWith(prev => prev.filter(id => id !== userId));
  };

  const handleSave = async () => {
    await base44.entities.SurveyInsightsChat.update(session.id, { shared_with: sharedWith });
    onUpdate({ ...session, shared_with: sharedWith });
    onOpenChange(false);
  };

  const getUserName = (userId) => {
    const u = users.find(u => u.id === userId);
    return u ? (u.full_name || u.email) : userId;
  };

  const filteredUsers = users.filter(u =>
    u.id !== session?.owner_id &&
    (u.full_name?.toLowerCase().includes(searchEmail.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchEmail.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Share Chat Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-slate-500 mb-2 block">
              Grant read access to other team members
            </Label>
            <Input
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              placeholder="Search by name or email..."
            />
            {searchEmail && (
              <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto">
                {filteredUsers.filter(u => !sharedWith.includes(u.id)).map(u => (
                  <button
                    key={u.id}
                    onClick={() => addUser(u.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                    <span>{u.full_name || u.email}</span>
                    <span className="text-xs text-slate-400 ml-auto">{u.email}</span>
                  </button>
                ))}
                {filteredUsers.filter(u => !sharedWith.includes(u.id)).length === 0 && (
                  <p className="text-xs text-slate-400 p-3">No matching users</p>
                )}
              </div>
            )}
          </div>

          {sharedWith.length > 0 && (
            <div>
              <Label className="text-xs text-slate-500 mb-2 block">Shared with</Label>
              <div className="flex flex-wrap gap-2">
                {sharedWith.map(userId => (
                  <Badge key={userId} variant="secondary" className="gap-1 pr-1">
                    {getUserName(userId)}
                    <button onClick={() => removeUser(userId)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}