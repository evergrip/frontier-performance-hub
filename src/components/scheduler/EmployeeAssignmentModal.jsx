import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function EmployeeAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  projectTitle,
  date,
  users,
  existingAssignments = [],
  allAssignments = [],
  currentAssignmentId = null
}) {
  const [assignments, setAssignments] = useState(
    existingAssignments && existingAssignments.length > 0
      ? existingAssignments
      : [{ employee_id: '', hours: 8 }]
  );

  React.useEffect(() => {
    if (isOpen && existingAssignments && existingAssignments.length > 0) {
      setAssignments(existingAssignments);
    }
  }, [isOpen, existingAssignments]);

  const handleAddEmployee = () => {
    setAssignments([...assignments, { employee_id: '', hours: 8 }]);
  };

  const handleRemoveEmployee = (index) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleChangeEmployee = (index, employeeId) => {
    const updated = [...assignments];
    updated[index].employee_id = employeeId;
    setAssignments(updated);
  };

  const handleChangeHours = (index, hours) => {
    const updated = [...assignments];
    updated[index].hours = Math.max(0, parseFloat(hours) || 0);
    setAssignments(updated);
  };

  const handleSave = () => {
    const validAssignments = assignments.filter(a => a.employee_id && a.hours > 0);
    if (validAssignments.length === 0) return;

    // Get the date from the format "MMM d, yyyy"
    const dateStr = date ? new Date(date).toISOString().split('T')[0] : null;
    
    // Check for 8-hour limit per employee per day
    for (const assignment of validAssignments) {
      const employeeId = assignment.employee_id;
      
      // Sum hours from existing assignments on this day (excluding current assignment if editing)
      const otherAssignmentsHours = allAssignments
        .filter(a => {
          const assignmentDate = new Date(a.assignment_date).toISOString().split('T')[0];
          const isOtherAssignment = !currentAssignmentId || a.id !== currentAssignmentId;
          return a.employee_assignments?.some(ea => ea.employee_id === employeeId) && 
                 assignmentDate === dateStr && 
                 isOtherAssignment;
        })
        .reduce((total, a) => {
          const empAssignment = a.employee_assignments?.find(ea => ea.employee_id === employeeId);
          return total + (empAssignment?.hours || 0);
        }, 0);
      
      const totalHours = otherAssignmentsHours + assignment.hours;
      if (totalHours > 8) {
        alert(`Employee would exceed 8 hours on this day. Current: ${otherAssignmentsHours}h, New: ${assignment.hours}h (Total: ${totalHours}h)`);
        return;
      }
    }

    onAssign(validAssignments);
    setAssignments([{ employee_id: '', hours: 8 }]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Employees to {projectTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Date: {date}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {assignments.map((assignment, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs mb-1 block">Employee</Label>
                  <select
                    value={assignment.employee_id}
                    onChange={(e) => handleChangeEmployee(index, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select employee</option>
                    {users.filter(user => 
                      user.departments?.includes('construction')
                    ).map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-20">
                  <Label className="text-xs mb-1 block">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={assignment.hours}
                    onChange={(e) => handleChangeHours(index, e.target.value)}
                    className="text-sm"
                  />
                </div>

                <button
                  onClick={() => handleRemoveEmployee(index)}
                  className="p-2 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleAddEmployee}
            className="w-full text-sm"
          >
            + Add Employee
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Assignments
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}