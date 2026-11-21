import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Check, CheckCircle2, Loader2, X } from "lucide-react";
import { ParsedCSVRow, HeaderMapping, ValidationError } from "@/types/bulkImport";
import { validateRow } from "@/utils/csvValidator";
import { Account, Category, Goal } from "@/types/database";
import { Progress } from "@/components/ui/progress";

interface Step3ErrorCorrectionProps {
  csvData: ParsedCSVRow[];
  onCsvDataChange: (data: ParsedCSVRow[]) => void;
  headerMapping: HeaderMapping;
  selectedRows: Set<number>;
  onSelectedRowsChange: (rows: Set<number>) => void;
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
  onImport: (data: ParsedCSVRow[], selectedRows: Set<number>, onProgress?: (progress: number) => void) => Promise<void>;
  isImporting?: boolean;
}

export default function Step3ErrorCorrection({
  csvData,
  onCsvDataChange,
  headerMapping,
  selectedRows,
  onSelectedRowsChange,
  accounts,
  categories,
  goals,
  onImport,
  isImporting = false,
}: Step3ErrorCorrectionProps) {
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    column: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [validationResults, setValidationResults] = useState<
    Map<number, ValidationError[]>
  >(new Map());
  const [reviewed, setReviewed] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Get goal names
  const goalNames = goals.map((g) => g.name);

  // Validate all rows
  const validateAllRows = useCallback(() => {
    const results = new Map<number, ValidationError[]>();

    selectedRows.forEach((rowIdx) => {
      const errors = validateRow(
        csvData[rowIdx],
        headerMapping,
        { accounts, categories, goalNames }
      );
      if (errors.length > 0) {
        results.set(rowIdx, errors);
      }
    });

    setValidationResults(results);
    setReviewed(true);

    return results.size === 0; // Return true if all valid
  }, [csvData, headerMapping, selectedRows, accounts, categories, goalNames]);

  const hasErrors = validationResults.size > 0;
  const canImport = reviewed && !hasErrors;

  const handleCellClick = (rowIndex: number, column: string, value: any) => {
    setEditingCell({ rowIndex, column });
    setEditValue(String(value || ""));
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const { rowIndex, column } = editingCell;
    const currentRow = csvData[rowIndex];
    // Immutable update: build a new row and a new array via the parent setter
    // so React re-renders and the import uses the corrected data.
    const updatedRow: ParsedCSVRow = { ...currentRow, [column]: editValue };

    // Re-validate this row against the corrected values.
    const errors = validateRow(updatedRow, headerMapping, {
      accounts,
      categories,
      goalNames,
    });

    const newResults = new Map(validationResults);
    if (errors.length > 0) {
      newResults.set(rowIndex, errors);
    } else {
      newResults.delete(rowIndex);
    }

    onCsvDataChange(
      csvData.map((row, idx) => (idx === rowIndex ? updatedRow : row))
    );

    setValidationResults(newResults);
    setEditingCell(null);
    setEditValue("");
  };

  const handleRowCheckChange = (rowIndex: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    onSelectedRowsChange(newSelected);
  };

  const handleImport = async () => {
    if (!canImport) return;
    await onImport(csvData, selectedRows, (progress) => {
      setImportProgress(progress);
    });
  };

  // Get columns to display (those that aren't skipped)
  const displayColumns = Object.entries(headerMapping)
    .filter(([, field]) => field !== "skip")
    .map(([csvColumn]) => csvColumn);

  const getErrorsForCell = (rowIndex: number, column: string): ValidationError[] => {
    const rowErrors = validationResults.get(rowIndex) || [];
    return rowErrors.filter((e) => {
      const mappedField = headerMapping[column];
      return e.field === mappedField || e.field === column;
    });
  };

  const getCellStatus = (rowIndex: number, column: string) => {
    const errors = getErrorsForCell(rowIndex, column);
    if (errors.length > 0) return "error";
    if (reviewed) return "valid";
    return "neutral";
  };

  const isRowValid = (rowIndex: number) => {
    return !validationResults.has(rowIndex);
  };

  const handleUnselectErrorRows = () => {
    const newSelected = new Set(selectedRows);
    validationResults.forEach((_, rowIndex) => {
      newSelected.delete(rowIndex);
    });
    onSelectedRowsChange(newSelected);
  };

  // Map field names to display labels
  const getFieldLabel = (field: string | any) => {
    const fieldLabelMap: Record<string, string> = {
      "date": "Date",
      "account_id": "Account (Payment Method)",
      "from_account": "From Account",
      "to_account": "To Account",
      "type": "Type",
      "category": "Category",
      "amount": "Amount",
      "description": "Title",
      "notes": "Notes",
      "goal_name": "Goal Name",
      "exchange_from_goal": "Exchange Amount",
      "frequency": "Frequency",
    };
    
    // Get the mapped field value for this column
    const mappedField = headerMapping[field];
    return fieldLabelMap[mappedField as string] || field;
  };

  return (
    <div className="space-y-6">
        {/* Import Status with Progress Bar */}
        {isImporting && (
          <Alert role="status" aria-live="polite" className="border-info/30 bg-info/5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Importing {selectedRows.size} transactions...</AlertDescription>
              </div>
              <div className="space-y-1">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{Math.round(importProgress)}% complete</p>
              </div>
            </div>
          </Alert>
        )}

      {/* Review Section */}
      {!reviewed && (
        <div>
          <Button
            onClick={validateAllRows}
            disabled={selectedRows.size === 0}
            className="w-full"
            size="lg"
          >
            Review Data
          </Button>
        </div>
      )}

      {/* Error Summary */}
      {reviewed && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">Total Selected</p>
            <p className="text-2xl font-bold">{selectedRows.size}</p>
          </div>
          <div className="p-3 rounded-lg border border-success/30 bg-success/5">
            <p className="text-xs text-muted-foreground">Valid</p>
            <p className="text-2xl font-semibold text-success tabular-nums">
              {selectedRows.size - validationResults.size}
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${hasErrors ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'}`}>
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className={`text-2xl font-semibold tabular-nums ${hasErrors ? 'text-destructive' : 'text-success'}`}>
              {validationResults.size}
            </p>
          </div>
        </div>
      )}

      {/* Error Details */}
      {reviewed && hasErrors && (
        <div className="space-y-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validationResults.size} row(s) have errors. Select a highlighted cell to edit it; error messages are shown inline.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnselectErrorRows}
            className="w-full gap-2"
          >
            <X className="h-4 w-4" />
            Unselect Error Rows
          </Button>
        </div>
      )}

      {/* Success Message */}
      {reviewed && !hasErrors && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          <AlertDescription className="text-success">
            All rows are valid and ready to import!
          </AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      {reviewed && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b sticky top-0">
              <tr>
                <th className="p-2 text-left w-10">
                  <Checkbox
                    checked={selectedRows.size === csvData.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectedRowsChange(new Set(csvData.map((_, i) => i)));
                      } else {
                        onSelectedRowsChange(new Set());
                      }
                    }}
                  />
                </th>
                <th className="p-2 text-left font-mono text-xs">Row</th>
                {displayColumns.map((col) => (
                  <th key={col} className="p-2 text-left font-mono text-xs whitespace-nowrap">
                    {getFieldLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y max-h-96 overflow-y-auto">
              {csvData.map((row, rowIdx) => {
                const isSelected = selectedRows.has(rowIdx);
                const rowHasErrors = !isRowValid(rowIdx);

                if (!isSelected) return null;

                return (
                  <tr
                    key={rowIdx}
                    className={`border-b hover:bg-muted/30 transition-colors ${
                      rowHasErrors ? "bg-destructive/5" : reviewed ? "bg-success/5" : ""
                    }`}
                  >
                    <td className="p-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleRowCheckChange(rowIdx, checked as boolean)
                        }
                      />
                    </td>
                    <td className={`p-2 font-mono text-xs font-semibold whitespace-nowrap tabular-nums transition-colors ${
                      rowHasErrors
                        ? "bg-destructive/20 text-destructive"
                        : "text-muted-foreground"
                    }`}>
                      {rowIdx + 1}
                    </td>
                    {displayColumns.map((col) => {
                      const value = row[col];
                      const cellErrors = getErrorsForCell(rowIdx, col);
                      const isEditing =
                        editingCell?.rowIndex === rowIdx &&
                        editingCell?.column === col;
                      const status = getCellStatus(rowIdx, col);
                      const hasError = cellErrors.length > 0;

                      const errorId = `cell-error-${rowIdx}-${col}`;
                      const fieldLabel = getFieldLabel(col);

                      return (
                        <td
                          key={col}
                          role="button"
                          tabIndex={0}
                          aria-label={`${fieldLabel}, row ${rowIdx + 1}${hasError ? ", has validation errors" : ""}. Press Enter to edit.`}
                          aria-describedby={hasError && !isEditing ? errorId : undefined}
                          className={`p-2 border-l font-mono text-xs cursor-pointer transition-colors ${
                            status === "error"
                              ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                              : status === "valid"
                                ? "bg-success/10 text-success"
                                : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleCellClick(rowIdx, col, value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleCellClick(rowIdx, col, value);
                            }
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              aria-label={`Edit ${fieldLabel} for row ${rowIdx + 1}`}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCellSave();
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="w-full bg-transparent border-b border-current px-1 py-0.5 outline-none"
                            />
                          ) : (
                            <div className="max-w-xs">
                              <div className="flex items-center gap-1">
                                {status === "error" && (
                                  <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                )}
                                {status === "valid" && (
                                  <Check className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                )}
                                <span className="truncate">{String(value || "")}</span>
                              </div>
                              {hasError && (
                                <p id={errorId} className="mt-1 font-sans text-xs leading-snug text-destructive">
                                  {cellErrors.map((err) => err.message).join("; ")}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-col sm:flex-row">
          {reviewed && !canImport && (
            <Button
              variant="outline"
              onClick={() => {
                setReviewed(false);
                setValidationResults(new Map());
              }}
              className="flex-1"
            >
              Re-review
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={!canImport || isImporting}
            className="flex-1"
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Transactions"
            )}
          </Button>
        </div>
    </div>
  );
}
