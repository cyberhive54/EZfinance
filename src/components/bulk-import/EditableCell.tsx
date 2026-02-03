import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

export default function EditableCell({ value, onChange, hasError }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className={`h-8 text-xs ${hasError ? "border-red-500" : ""}`}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-1 hover:bg-green-500/20 rounded transition-colors"
          title="Save"
        >
          <Check className="h-3 w-3 text-green-600" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
          title="Cancel"
        >
          <X className="h-3 w-3 text-red-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`p-1 rounded cursor-pointer hover:bg-muted transition-colors text-xs font-mono max-w-[150px] truncate ${
        hasError ? "text-red-600 font-semibold" : ""
      }`}
      title="Click to edit"
    >
      {value || "—"}
    </div>
  );
}
