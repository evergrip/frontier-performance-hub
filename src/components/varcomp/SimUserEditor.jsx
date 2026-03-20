import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, RotateCcw } from 'lucide-react';

const POOL_OPTIONS = [
  { value: 'shareholders', label: 'Shareholders' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'full_staff', label: 'Full Staff' },
];

export default function SimUserEditor({ simUsers, setSimUsers, onLoadReal, loadingReal }) {
  const addUser = () => {
    setSimUsers([...simUsers, {
      _simId: Date.now().toString(),
      full_name: '',
      hire_date: '',
      profit_sharing_pools: ['full_staff'],
      profit_sharing_eligible: true,
    }]);
  };

  const updateUser = (idx, field, value) => {
    const updated = [...simUsers];
    updated[idx] = { ...updated[idx], [field]: value };
    setSimUsers(updated);
  };

  const togglePool = (idx, pool) => {
    const updated = [...simUsers];
    const pools = updated[idx].profit_sharing_pools || [];
    if (pools.includes(pool)) {
      updated[idx] = { ...updated[idx], profit_sharing_pools: pools.filter(p => p !== pool) };
    } else {
      updated[idx] = { ...updated[idx], profit_sharing_pools: [...pools, pool] };
    }
    setSimUsers(updated);
  };

  const toggleEligible = (idx) => {
    const updated = [...simUsers];
    updated[idx] = { ...updated[idx], profit_sharing_eligible: !updated[idx].profit_sharing_eligible };
    setSimUsers(updated);
  };

  const removeUser = (idx) => {
    setSimUsers(simUsers.filter((_, i) => i !== idx));
  };

  return (
    <div className="p-4 bg-purple-50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Simulation People</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onLoadReal} disabled={loadingReal}>
            <RotateCcw className="w-3 h-3 mr-1" /> {loadingReal ? 'Loading...' : 'Load Real Users'}
          </Button>
          <Button size="sm" variant="outline" onClick={addUser}>
            <Plus className="w-3 h-3 mr-1" /> Add Person
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">These are simulation-only — changes here do NOT affect real user data.</p>

      {simUsers.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No people added. Load real users or add sample people.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">On</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Hire Date</TableHead>
                {POOL_OPTIONS.map(p => (
                  <TableHead key={p.value} className="text-center text-xs">{p.label}</TableHead>
                ))}
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simUsers.map((user, idx) => (
                <TableRow key={user._simId || idx} className={!user.profit_sharing_eligible ? 'opacity-50' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={user.profit_sharing_eligible}
                      onChange={() => toggleEligible(idx)}
                      className="rounded border-slate-300"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={user.full_name || ''}
                      onChange={e => updateUser(idx, 'full_name', e.target.value)}
                      placeholder="Name"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={user.hire_date || ''}
                      onChange={e => updateUser(idx, 'hire_date', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  {POOL_OPTIONS.map(pool => (
                    <TableCell key={pool.value} className="text-center">
                      <input
                        type="checkbox"
                        checked={(user.profit_sharing_pools || []).includes(pool.value)}
                        onChange={() => togglePool(idx, pool.value)}
                        className="rounded border-slate-300"
                        disabled={!user.profit_sharing_eligible}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeUser(idx)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}