import { useState, useEffect, useMemo } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useGoals } from "@/hooks/useGoals";
import { useTransactions } from "@/hooks/useTransactions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParsedCSVRow, HeaderMapping, ValidationError } from "@/types/bulkImport";
import { validateRow, ValidationContext } from "@/utils/csvValidator";
import EditableCell from "./EditableCell";

interface Step3ErrorCorrectionProps {
  csvData: ParsedCSVRow[];
  headerMapping: HeaderMapping;
  selectedRows: Set<number>;
  onErrorsCorrected: (errors: Map<number, ValidationError[]>) => void;
}

export default function Step3ErrorCorrection({
  csvData,
  headerMapping,
  selectedRows,
  onErrorsCorrected,
}: Step3ErrorCorrectionProps) {
  const { accounts } = useAccounts();
  const { goals } = useGoals();
  const { categories } = useTransactions();

  const [editableData, setEditableData] = useState<Map<number, ParsedCSVRow>>(new Map());
  const [validationErrors, setValidationErrors] = useState<Map<number, ValidationError[]>>(new Map());
  const [viewMode, setViewMode] = useState<"all" | "errors">("all");

  // Validate all rows on mount
  useEffect(() => {
    validateAllRows();
  }, []);

  const validationContext: ValidationContext = {
    accounts: accounts,
    categories: categories || [],
    goalNames: goals?.map((g) => g.name) || [],
  };

  const validateAllRows = () => {
    const newErrors = new Map<number, ValidationError[]>();

    selectedRows.forEach((rowIndex) => {
      const row = editableData.get(rowIndex) || csvData[rowIndex];
      const errors = validateRow(row, headerMapping, validationContext);
      if (errors.length > 0) {
        newErrors.set(rowIndex, errors);
      } else {
        newErrors.delete(rowIndex);
      }
    });

    setValidationErrors(newErrors);
    onErrorsCorrected(newErrors);
  };

  const handleCellChange = (rowIndex: number, columnName: string, value: any) => {
    const row = editableData.get(rowIndex) || { ...csvData[rowIndex] };
    row[columnName] = value;
    setEditableData((prev) => new Map(prev).set(rowIndex, row));

    // Re-validate this row
    const errors = validateRow(row, headerMapping, validationContext);
    if (errors.length === 0) {
      setValidationErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(rowIndex);
        return newMap;
      });
    } else {
      setValidationErrors((prev) => new Map(prev).set(rowIndex, errors));
    }
  };

  const filteredRows = useMemo(() => {
    const all = Array.from(selectedRows).sort((a, b) => a - b);
    if (viewMode === "all") return all;
    return all.filter((idx) => validationErrors.has(idx));
  }, [selectedRows, validationErrors, viewMode]);

  const errorCount = validationErrors.size;
  const originalColumns = Object.entries(headerMapping)
    .filter(([, field]) => field !== "skip")
    .map(([csv]) => csv);

  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      {errorCount > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorCount} row{errorCount !== 1 ? "s" : ""} have validation errors. Fix them before importing.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-500/30 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">All rows are valid and ready to import!</AlertDescription>
        </Alert>
      )}

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as "all" | "errors")}>
        <TabsList>
          <TabsTrigger value="all">
            All Rows ({selectedRows.size})
          </TabsTrigger>
          <TabsTrigger value="errors" className={errorCount > 0 ? "" : "opacity-50"}>
            Errors Only ({errorCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredRows.length} of {selectedRows.size} selected rows
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          {errorCount === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No errors found. All rows are valid!
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Data Table with Virtual Scrolling */}
      {filteredRows.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                  {originalColumns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y max-h-[600px] overflow-y-auto block">
                {filteredRows.map((rowIndex) => {
                  const hasError = validationErrors.has(rowIndex);
                  const row = editableData.get(rowIndex) || csvData[rowIndex];
                  const errors = validationErrors.get(rowIndex) || [];

                  return (
                    <tr
                      key={rowIndex}
                      className={`${
                        hasError
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : "bg-green-500/5 hover:bg-green-500/10"
                      } transition-colors table w-full`}
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono w-12 table-cell">
                        {rowIndex + 1}
                      </td>
                      {originalColumns.map((col) => (
                        <td
                          key={`${rowIndex}-${col}`}
                          className={`px-4 py-3 table-cell ${
                            errors.some((e) => {
                              // Check if this field has an error
                              const fieldErrors = errors.filter((err) => {
                                const mapping = Object.entries(headerMapping).find(
                                  ([csv]) => csv === col
                                );
                                return mapping && mapping[1] === err.field;
                              });
                              return fieldErrors.length > 0;
                            })
                              ? "border-l-4 border-red-500 bg-red-500/5"
                              : ""
                          }`}
                        >
                          <EditableCell
                            value={String(row[col] || "")}
                            onChange={(value) => handleCellChange(rowIndex, col, value)}
                            hasError={errors.some((e) => {
                              const mapping = Object.entries(headerMapping).find(
                                ([csv]) => csv === col
                              );
                              return mapping && mapping[1] === e.field;
                            })}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 table-cell text-xs">
                        {errors.length > 0 ? (
                          <div className="space-y-1">
                            {errors.map((error, idx) => (
                              <div key={idx} className="text-red-600 font-medium">
                                {error.message}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Valid
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Button */}
      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={() => validateAllRows()} variant="outline">
          Re-validate All
        </Button>
        <Button disabled={errorCount > 0} size="lg">
          {errorCount > 0 ? `Fix ${errorCount} error${errorCount !== 1 ? "s" : ""} to continue` : "Continue to Import"}
        </Button>
      </div>
    </div>
  );
}
