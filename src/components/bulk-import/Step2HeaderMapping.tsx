import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ParsedCSVRow, HeaderMapping, HeaderField } from "@/types/bulkImport";
import { validateMappingCompleteness } from "@/utils/csvValidator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Step2HeaderMappingProps {
  csvData: ParsedCSVRow[];
  originalHeaders: string[];
  onMappingComplete: (mapping: HeaderMapping) => void;
  selectedRows: Set<number>;
  onRowsSelected: (rowIndices: Set<number>) => void;
}

const AVAILABLE_FIELDS: { value: HeaderField; label: string }[] = [
  { value: "skip", label: "Skip" },
  { value: "date", label: "Date" },
  { value: "account_id", label: "Account (Payment Method)" },
  { value: "from_account", label: "From Account (Transfer)" },
  { value: "to_account", label: "To Account (Transfer)" },
  { value: "type", label: "Type" },
  { value: "category", label: "Category" },
  { value: "amount", label: "Amount" },
  { value: "description", label: "Title" },
  { value: "notes", label: "Notes" },
  { value: "goal_name", label: "Goal Name" },
  { value: "deduction_type", label: "Deduction Type (full/split)" },
  { value: "frequency", label: "Frequency" },
];

export default function Step2HeaderMapping({
  csvData,
  originalHeaders,
  onMappingComplete,
  selectedRows,
  onRowsSelected,
}: Step2HeaderMappingProps) {
  const [headerMapping, setHeaderMapping] = useState<HeaderMapping>({});
  const [error, setError] = useState<string>("");
  const [selectAllChecked, setSelectAllChecked] = useState(true);

  // Auto-map common headers
  const getAutoMappedValue = (header: string): HeaderField => {
    const lowerHeader = header.toLowerCase();
    if (["date", "transaction_date", "date_created"].includes(lowerHeader)) return "date";
    if (["account", "account_id", "from_account"].includes(lowerHeader)) return "account_id";
    if (lowerHeader === "to_account") return "to_account";
    if (["type", "transaction_type"].includes(lowerHeader)) return "type";
    if (["category", "category_name"].includes(lowerHeader)) return "category";
    if (["amount", "value", "sum"].includes(lowerHeader)) return "amount";
    if (["description", "memo"].includes(lowerHeader)) return "description";
    if (["notes", "note", "comment"].includes(lowerHeader)) return "notes";
    if (lowerHeader === "goal_name") return "goal_name";
    if (lowerHeader === "deduction_type") return "deduction_type";
    if (["frequency", "recurring"].includes(lowerHeader)) return "frequency";
    return "skip";
  };

  // Initialize mapping on mount
  const initializeMapping = () => {
    const mapping: HeaderMapping = {};
    originalHeaders.forEach((header) => {
      mapping[header] = getAutoMappedValue(header);
    });
    setHeaderMapping(mapping);
  };

  // Initialize if empty
  if (Object.keys(headerMapping).length === 0) {
    initializeMapping();
  }

  // Get used fields to exclude from other dropdowns
  const usedFields = new Set(
    Object.values(headerMapping).filter((f) => f !== "skip")
  );

  // Get available options for each dropdown
  const getAvailableOptions = (currentField: HeaderField) => {
    return AVAILABLE_FIELDS.filter(
      (f) => f.value === "skip" || f.value === currentField || !usedFields.has(f.value)
    );
  };

  const handleMappingChange = (csvHeader: string, field: HeaderField) => {
    setHeaderMapping((prev) => ({
      ...prev,
      [csvHeader]: field,
    }));
    setError("");
  };

  const handleSelectAllChange = (checked: boolean) => {
    setSelectAllChecked(checked);
    if (checked) {
      onRowsSelected(new Set(csvData.map((_, idx) => idx)));
    } else {
      onRowsSelected(new Set());
    }
  };

  const handleRowCheckChange = (rowIndex: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    onRowsSelected(newSelected);
    setSelectAllChecked(newSelected.size === csvData.length);
  };

  const handleContinue = () => {
    // Validate mapping
    const validation = validateMappingCompleteness(headerMapping);
    if (!validation.valid) {
      setError(validation.errors.join("; "));
      return;
    }

    if (selectedRows.size === 0) {
      setError("Please select at least one row to import");
      return;
    }

    onMappingComplete(headerMapping);
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Mapping Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Map CSV Columns</h2>
          <p className="text-sm text-muted-foreground">
            Select which field each CSV column represents. Skip by default. Once selected, that field won't appear in other columns.
          </p>
        </div>

        {/* Vertical Mapping Table */}
        <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/30">
          {originalHeaders.map((header) => (
            <div key={header} className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3 border-b last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-medium truncate">{header}</p>
                <p className="text-xs text-muted-foreground">CSV Column</p>
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={headerMapping[header] || "skip"}
                  onValueChange={(value) => handleMappingChange(header, value as HeaderField)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableOptions(headerMapping[header] || "skip").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row Selection Section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold mb-2">Select Rows to Import</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {selectedRows.size} of {csvData.length} rows selected
          </p>
        </div>

        {/* Select All */}
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
          <Checkbox
            id="select-all"
            checked={selectAllChecked}
            onCheckedChange={handleSelectAllChange}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select All Rows
          </label>
        </div>

        {/* Row Preview Table */}
        <div className="border rounded-lg bg-muted/30 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left">
                  <Checkbox
                    id="table-select-all"
                    checked={selectAllChecked}
                    onCheckedChange={handleSelectAllChange}
                  />
                </th>
                <th className="p-2 text-left font-medium">Row</th>
                {originalHeaders.slice(0, 5).map((header) => (
                  <th key={header} className="p-2 text-left font-medium max-w-xs truncate">
                    {header}
                  </th>
                ))}
                {originalHeaders.length > 5 && (
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    +{originalHeaders.length - 5} more
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y max-h-64 overflow-y-auto">
              {csvData.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="p-2">
                    <Checkbox
                      id={`row-${idx}`}
                      checked={selectedRows.has(idx)}
                      onCheckedChange={(checked) => handleRowCheckChange(idx, checked as boolean)}
                    />
                  </td>
                  <td className="p-2 font-medium text-muted-foreground">{idx + 1}</td>
                  {originalHeaders.slice(0, 5).map((header) => (
                    <td key={`${idx}-${header}`} className="p-2 truncate max-w-xs text-muted-foreground">
                      {String(row[header] || "-").substring(0, 30)}
                    </td>
                  ))}
                  {originalHeaders.length > 5 && (
                    <td className="p-2 text-muted-foreground text-xs italic">hidden</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Continue Button */}
      <Button onClick={handleContinue} className="w-full" size="lg">
        Continue to Review
      </Button>
    </div>
  );
}
