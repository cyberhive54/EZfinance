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
          aria-label="Edit cell value"
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className={`h-8 text-xs ${hasError ? "border-destructive" : ""}`}
          autoFocus
        />
        <button
          type="button"
          onClick={handleSave}
          aria-label="Save cell value"
          className="p-1 rounded transition-colors hover:bg-success/20"
        >
          <Check className="h-3 w-3 text-success" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel editing"
          className="p-1 rounded transition-colors hover:bg-destructive/20"
        >
          <X className="h-3 w-3 text-destructive" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Cell value: ${value || "empty"}. Press Enter to edit.`}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      className={`p-1 rounded cursor-pointer transition-colors hover:bg-muted text-xs font-mono max-w-[150px] truncate ${
        hasError ? "font-semibold text-destructive" : ""
      }`}
      title="Click to edit"
    >
      {value || "—"}
    </div>
  );
}
