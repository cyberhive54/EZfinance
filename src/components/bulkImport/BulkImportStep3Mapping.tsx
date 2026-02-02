import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ColumnMapping } from "@/utils/bulkImport";

const FIELD_OPTIONS = [
  { value: "", label: "Skip" },
  { value: "type", label: "Type" },
  { value: "title", label: "Title" },
  { value: "amount", label: "Amount" },
  { value: "transactionDate", label: "Transaction Date" },
  { value: "account", label: "Account" },
  { value: "category", label: "Category" },
  { value: "fromAccount", label: "From Account (Transfer)" },
  { value: "toAccount", label: "To Account (Transfer)" },
  { value: "frequency", label: "Frequency" },
  { value: "notes", label: "Notes" },
];

const MANDATORY_FIELDS = ["type", "amount", "transactionDate"];

interface BulkImportStep3MappingProps {
  rawRows: string[][];
  hasHeaders: boolean;
  columnMapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

export function BulkImportStep3Mapping({
  rawRows,
  hasHeaders,
  columnMapping,
  onMappingChange,
  onBack,
  onNext,
  onCancel,
}: BulkImportStep3MappingProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(columnMapping);

  const headers = hasHeaders ? rawRows[0] : [];
  const columnCount = headers.length || (rawRows[0]?.length || 0);

  const mandatoryFieldsMapped = useMemo(() => {
    const mapped = Object.values(mapping);
    return MANDATORY_FIELDS.every(field => mapped.includes(field));
  }, [mapping]);

  const handleMappingChange = (columnIndex: number, fieldValue: string) => {
    const newMapping = { ...mapping };
    if (fieldValue === "") {
      delete newMapping[columnIndex];
    } else {
      newMapping[columnIndex] = fieldValue;
    }
    setMapping(newMapping);
  };

  const handleProceed = () => {
    onMappingChange(mapping);
    onNext();
  };

  const getMappedFieldCount = () => {
    return Object.keys(mapping).length;
  };

  const firstRowPreview = rawRows[hasHeaders ? 1 : 0] || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map CSV Columns to Transaction Fields</h3>
        <p className="text-sm text-muted-foreground">Select which field each CSV column represents</p>
      </div>

      {/* Mandatory Fields Check */}
      {!mandatoryFieldsMapped && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Missing mandatory fields</p>
            <p className="text-xs text-muted-foreground mt-1">
              Map at least: Type, Amount, Transaction Date
            </p>
          </div>
        </div>
      )}

      {/* Mapping Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Total Columns</p>
            <p className="text-2xl font-bold">{columnCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Mapped</p>
            <p className="text-2xl font-bold">{getMappedFieldCount()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className={`text-sm font-medium ${mandatoryFieldsMapped ? "text-accent" : "text-destructive"}`}>
              {mandatoryFieldsMapped ? "✓ Ready" : "⚠ Incomplete"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">First Row Preview</p>
            <p className="text-sm font-medium truncate text-muted-foreground">
              {firstRowPreview.slice(0, 2).join(", ")}...
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Column Mapping</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold bg-muted">CSV Column</th>
                <th className="text-left p-3 font-semibold bg-muted">Map To Field</th>
                <th className="text-left p-3 font-semibold bg-muted">Sample Data</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: columnCount }).map((_, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    {hasHeaders && headers[idx] ? (
                      <div>
                        <p className="font-medium">{headers[idx]}</p>
                        <p className="text-xs text-muted-foreground">Column {idx + 1}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Column {idx + 1}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <Select
                      value={mapping[idx] || ""}
                      onValueChange={(value) => handleMappingChange(idx, value)}
                    >
                      <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[idx] && MANDATORY_FIELDS.includes(mapping[idx]) && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Required
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground truncate max-w-[150px]">
                    {firstRowPreview[idx] || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Field Legend */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Field Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium">Type</dt>
              <dd className="text-muted-foreground">INCOME, EXPENSE, or TRANSFER</dd>
            </div>
            <div>
              <dt className="font-medium">Title</dt>
              <dd className="text-muted-foreground">Transaction description (optional)</dd>
            </div>
            <div>
              <dt className="font-medium">Amount</dt>
              <dd className="text-muted-foreground">Numeric transaction amount</dd>
            </div>
            <div>
              <dt className="font-medium">Transaction Date</dt>
              <dd className="text-muted-foreground">YYYY-MM-DD or MM-DD-YYYY format</dd>
            </div>
            <div>
              <dt className="font-medium">Account</dt>
              <dd className="text-muted-foreground">Account name for INCOME/EXPENSE</dd>
            </div>
            <div>
              <dt className="font-medium">Category</dt>
              <dd className="text-muted-foreground">Category name (required for INCOME/EXPENSE)</dd>
            </div>
            <div>
              <dt className="font-medium">From/To Account</dt>
              <dd className="text-muted-foreground">For TRANSFER transactions</dd>
            </div>
            <div>
              <dt className="font-medium">Frequency</dt>
              <dd className="text-muted-foreground">none, daily, weekly, monthly, yearly</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleProceed} disabled={!mandatoryFieldsMapped}>
            Proceed to Validation
          </Button>
        </div>
      </div>
    </div>
  );
}
