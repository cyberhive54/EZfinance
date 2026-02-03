import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ParsedCSVRow, HeaderMapping, HeaderField } from "@/types/bulkImport";
import HeaderMappingDropdown from "./HeaderMappingDropdown";
import { validateMappingCompleteness } from "@/utils/csvValidator";

interface Step2HeaderMappingProps {
  csvData: ParsedCSVRow[];
  originalHeaders: string[];
  onMappingComplete: (mapping: HeaderMapping) => void;
  selectedRows: Set<number>;
  onRowsSelected: (rowIndices: Set<number>) => void;
}

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

  const selectedCount = selectedRows.size;

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm">
          Map your CSV columns to transaction fields. Columns marked as <strong>"Skip"</strong> will be ignored.
          Optional fields can be left unmapped.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header Mapping Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">CSV Column</th>
                <th className="px-4 py-3 text-left font-semibold">Map to Field</th>
                <th className="px-4 py-3 text-left font-semibold">Sample Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {originalHeaders.map((header, idx) => (
                <tr key={header} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{header}</td>
                  <td className="px-4 py-3">
                    <HeaderMappingDropdown
                      value={headerMapping[header] || "skip"}
                      onChange={(field) => handleMappingChange(header, field)}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono max-w-[200px] truncate">
                    {csvData[0]?.[header] ? String(csvData[0][header]).substring(0, 50) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Selection */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectAllChecked}
              onCheckedChange={(checked) => handleSelectAllChange(checked as boolean)}
              id="select-all"
            />
            <label htmlFor="select-all" className="cursor-pointer flex items-center gap-2">
              <span className="font-semibold">Select All</span>
              <span className="text-muted-foreground text-sm">
                ({selectedCount} of {csvData.length} rows selected)
              </span>
            </label>
          </div>
        </div>

        {/* Virtual Scrolled Row List */}
        <div className="max-h-96 overflow-y-auto border rounded">
          <div className="space-y-0">
            {csvData.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedRows.has(idx)}
                  onCheckedChange={(checked) => handleRowCheckChange(idx, checked as boolean)}
                  id={`row-${idx}`}
                />
                <label htmlFor={`row-${idx}`} className="flex-1 cursor-pointer text-sm">
                  <span className="text-muted-foreground">Row {idx + 1}:</span>{" "}
                  <span className="font-medium">
                    {originalHeaders
                      .slice(0, 3)
                      .map((h) => `${String(row[h] || "").substring(0, 15)}`)
                      .join(" | ")}
                    {originalHeaders.length > 3 && "..."}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={handleContinue} size="lg">
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
