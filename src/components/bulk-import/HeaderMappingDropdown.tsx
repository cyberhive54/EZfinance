import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeaderField } from "@/types/bulkImport";

interface HeaderMappingDropdownProps {
  value: HeaderField;
  onChange: (field: HeaderField) => void;
}

const FIELD_OPTIONS: { value: HeaderField; label: string; description: string }[] = [
  { value: "skip", label: "Skip Column", description: "Ignore this column" },
  { value: "date", label: "Date", description: "Transaction date (YYYY-MM-DD)" },
  { value: "account_id", label: "Account", description: "Account ID (for income/expense)" },
  { value: "from_account", label: "From Account", description: "Source account (for transfers)" },
  { value: "to_account", label: "To Account", description: "Destination account (for transfers)" },
  { value: "type", label: "Type", description: "Transaction type" },
  { value: "category", label: "Category", description: "Expense/Income category" },
  { value: "amount", label: "Amount", description: "Transaction amount" },
  { value: "description", label: "Description", description: "Short description" },
  { value: "notes", label: "Notes", description: "Additional notes" },
  { value: "goal_name", label: "Goal Name", description: "Goal to link" },
  { value: "deduction_type", label: "Deduction Type", description: "full or split" },
  { value: "frequency", label: "Frequency", description: "Recurring frequency" },
];

export default function HeaderMappingDropdown({
  value,
  onChange,
}: HeaderMappingDropdownProps) {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as HeaderField)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FIELD_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
