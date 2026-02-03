import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePriorities, DEFAULT_PRIORITIES } from "@/hooks/usePriorities";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const COLOR_PRESETS = [
  "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#6366f1",
];

export function PrioritiesSection() {
  const { 
    priorities, 
    isLoading, 
    initializePriorities,
    createPriority, 
    updatePriority, 
    deletePriority,
    isCreating,
    isUpdating,
  } = usePriorities();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Initialize default priorities if none exist
  useEffect(() => {
    if (!isLoading && priorities.length === 0) {
      initializePriorities();
    }
  }, [isLoading, priorities.length, initializePriorities]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    createPriority({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor(COLOR_PRESETS[0]);
    setIsAdding(false);
  };

  const startEdit = (priority: typeof priorities[0]) => {
    setEditingId(priority.id);
    setEditName(priority.name);
    setEditColor(priority.color);
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    updatePriority({ id: editingId, name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Priorities</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Priorities</CardTitle>
        <CardDescription>
          Set priority levels with colors for your goals. These will appear on goal cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Priority List */}
        <div className="space-y-2">
          {priorities.map((priority) => (
            <div
              key={priority.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              
              {editingId === priority.id ? (
                <>
                  <div
                    className="h-6 w-6 rounded-full shrink-0 border-2 border-border"
                    style={{ backgroundColor: editColor }}
                  />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {COLOR_PRESETS.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        className={`h-5 w-5 rounded-full border ${
                          editColor === color ? "ring-2 ring-primary ring-offset-1" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditColor(color)}
                      />
                    ))}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUpdate} disabled={isUpdating}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="h-6 w-6 rounded-full shrink-0"
                    style={{ backgroundColor: priority.color }}
                  />
                  <span className="flex-1 font-medium">{priority.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEdit(priority)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deletePriority(priority.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add New Priority */}
        {isAdding ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
            <div
              className="h-6 w-6 rounded-full shrink-0 border-2 border-border"
              style={{ backgroundColor: newColor }}
            />
            <Input
              placeholder="Priority name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 h-8"
              autoFocus
            />
            <div className="flex gap-1">
              {COLOR_PRESETS.slice(0, 5).map((color) => (
                <button
                  key={color}
                  className={`h-5 w-5 rounded-full border ${
                    newColor === color ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewColor(color)}
                />
              ))}
            </div>
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || isCreating}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Custom Priority
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
