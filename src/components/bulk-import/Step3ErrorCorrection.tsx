import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { ParsedCSVRow, HeaderMapping, ValidationError } from "@/types/bulkImport";
import { validateRow } from "@/utils/csvValidator";
import { Account, Category, Goal } from "@/types/database";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface Step3ErrorCorrectionProps {
  csvData: ParsedCSVRow[];
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

    const row = csvData[editingCell.rowIndex];
    row[editingCell.column] = editValue;

    // Re-validate this row
    const errors = validateRow(row, headerMapping, {
      accounts,
      categories,
      goalNames,
    });

    const newResults = new Map(validationResults);
    if (errors.length > 0) {
      newResults.set(editingCell.rowIndex, errors);
    } else {
      newResults.delete(editingCell.rowIndex);
    }

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
      "deduction_type": "Deduction Type",
      "frequency": "Frequency",
    };
    
    // Get the mapped field value for this column
    const mappedField = headerMapping[field];
    return fieldLabelMap[mappedField as string] || field;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Import Status with Progress Bar */}
        {isImporting && (
          <Alert className="border-blue-500/30 bg-blue-500/5">
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
          <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/30">
            <p className="text-xs text-muted-foreground">Valid</p>
            <p className="text-2xl font-bold text-green-600">
              {selectedRows.size - validationResults.size}
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${hasErrors ? 'bg-red-500/5 border-red-500/30' : 'bg-green-500/5 border-green-500/30'}`}>
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className={`text-2xl font-bold ${hasErrors ? 'text-red-600' : 'text-green-600'}`}>
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
              {validationResults.size} row(s) have errors. Click cells to edit. Green = valid, Red = error.
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
        <Alert className="border-green-500/30 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
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
                      rowHasErrors ? "bg-red-50/30" : reviewed ? "bg-green-50/30" : ""
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
                    <td className={`p-2 font-mono text-xs font-bold whitespace-nowrap transition-colors ${
                      rowHasErrors
                        ? "bg-red-500/20 text-red-700"
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

                      const cellContent = (
                        <td
                          key={col}
                          className={`p-2 border-l font-mono text-xs cursor-pointer transition-colors ${
                            status === "error"
                              ? "bg-red-100/50 text-red-900 hover:bg-red-150/50"
                              : status === "valid"
                                ? "bg-green-100/30 text-green-900"
                                : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleCellClick(rowIdx, col, value)}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
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
                            <div className="max-w-xs truncate flex items-center gap-1">
                              {status === "error" && (
                                <span className="text-red-600 flex-shrink-0">⚠</span>
                              )}
                              {status === "valid" && (
                                <span className="text-green-600 flex-shrink-0">✓</span>
                              )}
                              <span className="truncate">{String(value || "")}</span>
                            </div>
                          )}
                        </td>
                      );

                      // Wrap in Tooltip if there are errors
                      if (hasError && !isEditing) {
                        return (
                          <Tooltip key={col} delayDuration={100}>
                            <TooltipTrigger asChild>
                              {cellContent}
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                {cellErrors.map((err, idx) => (
                                  <p key={idx} className="text-xs">{err.message}</p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return cellContent;
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
    </TooltipProvider>
  );
}
