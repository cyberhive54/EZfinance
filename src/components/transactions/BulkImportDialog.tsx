import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Copy, Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ImportRow,
  validateDecimalPlaces,
  validateFrequency,
  validateCategoryForType,
  validateTransferAccounts,
  generateSampleCSV,
} from "@/utils/bulkImportValidation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: any[];
  categories: any[];
  onImport: (rows: ImportRow[]) => Promise<void>;
}

type Step = "source" | "preview" | "validation";

// Simple CSV parser
const parseCSVText = (text: string): string[][] => {
  const lines = text.trim().split("\n");
  const rows: string[][] = [];
  
  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  
  return rows;
};

export function BulkImportDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  onImport,
}: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>("source");
  const [importMethod, setImportMethod] = useState<"file" | "paste">("file");
  const [csvText, setCsvText] = useState("");
  const [parsedData, setParsedData] = useState<any[][]>([]);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = () => {
    if (!csvText.trim()) {
      alert("Please select a file or paste CSV data");
      return;
    }

    try {
      const data = parseCSVText(csvText);
      if (data.length < 2) {
        alert("CSV must contain at least one data row (plus headers)");
        return;
      }
      setParsedData(data);
      setStep("preview");
    } catch (error) {
      alert("Failed to parse CSV. Please check the format.");
    }
  };

  const proceedToValidation = () => {
    if (parsedData.length === 0) {
      alert("No data to validate");
      return;
    }

    // Simple mapping assuming standard headers in first row
    const headers = parsedData[0].map((h: string) => h.toLowerCase().trim());
    const rows: ImportRow[] = [];

    for (let i = 1; i < parsedData.length; i++) {
      const row = parsedData[i];
      const importRow: ImportRow = {
        rowIndex: i,
        type: row[headers.indexOf("type")] || "",
        title: row[headers.indexOf("title")] || "",
        amount: row[headers.indexOf("amount")] || "",
        transactionDate: row[headers.indexOf("transaction date")] || "",
        account: row[headers.indexOf("account")] || "",
        category: row[headers.indexOf("category")] || "",
        fromAccount: row[headers.indexOf("from account")] || "",
        toAccount: row[headers.indexOf("to account")] || "",
        frequency: row[headers.indexOf("frequency")] || "none",
        notes: row[headers.indexOf("notes")] || "",
        errors: [],
        isValid: true,
      };

      // Validate row
      validateRow(importRow, headers);
      rows.push(importRow);
    }

    setImportRows(rows);
    setSelectedRows(new Set(rows.map((_, i) => i)));
    setStep("validation");
  };

  const validateRow = (row: ImportRow, headers: string[]) => {
    const errors: ImportRow["errors"] = [];

    // Validate type
    if (!row.type.trim()) {
      errors.push({ field: "type", message: "Type is required", severity: "error" });
      row.isValid = false;
    } else if (!["INCOME", "EXPENSE", "TRANSFER"].includes(row.type.toUpperCase())) {
      errors.push({ field: "type", message: "Type must be INCOME, EXPENSE, or TRANSFER", severity: "error" });
      row.isValid = false;
    }

    // Validate amount
    if (!row.amount.trim()) {
      errors.push({ field: "amount", message: "Amount is required", severity: "error" });
      row.isValid = false;
    } else if (isNaN(parseFloat(row.amount))) {
      errors.push({ field: "amount", message: "Amount must be a number", severity: "error" });
      row.isValid = false;
    } else if (!validateDecimalPlaces(row.amount)) {
      errors.push({ field: "amount", message: "Amount cannot have more than 2 decimal places", severity: "error" });
      row.isValid = false;
    }

    // Validate transaction date
    if (!row.transactionDate.trim()) {
      errors.push({ field: "transactionDate", message: "Transaction Date is required", severity: "error" });
      row.isValid = false;
    }

    // Validate frequency (case-insensitive)
    if (row.frequency.trim()) {
      const freqValidation = validateFrequency(row.frequency);
      if (!freqValidation.isValid) {
        errors.push({
          field: "frequency",
          message: "Frequency must be one of: daily, weekly, monthly, yearly, none",
          severity: "error",
        });
        row.isValid = false;
      } else if (freqValidation.corrected) {
        row.frequency = freqValidation.corrected;
      }
    }

    // Validate for TRANSFER type
    if (row.type.toUpperCase() === "TRANSFER") {
      const transferValidation = validateTransferAccounts(row.fromAccount, row.toAccount, "TRANSFER");
      if (!transferValidation.isValid) {
        errors.push({
          field: "fromAccount",
          message: transferValidation.message || "Transfer requires From or To Account",
          severity: "error",
        });
        row.isValid = false;
      }
    } else {
      // INCOME/EXPENSE validation
      if (!row.account.trim()) {
        errors.push({ field: "account", message: "Account is required", severity: "error" });
        row.isValid = false;
      }

      if (!row.category.trim()) {
        errors.push({ field: "category", message: "Category is required", severity: "error" });
        row.isValid = false;
      } else {
        const catValidation = validateCategoryForType(row.category, row.type, categories);
        if (!catValidation.isValid) {
          errors.push({
            field: "category",
            message: `Category '${row.category}' not found for ${row.type}`,
            severity: "error",
          });
          row.isValid = false;
        }
      }
    }

    row.errors = errors;
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setImportProgress(0);

    try {
      const rowsToImport = importRows.filter((_, i) => selectedRows.has(i) && importRows[i].isValid);
      const total = rowsToImport.length;

      for (let i = 0; i < total; i++) {
        // Simulate progress
        setImportProgress(Math.round(((i + 1) / total) * 100));
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      await onImport(rowsToImport);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
      setImportProgress(0);
    }
  };

  const validCount = useMemo(
    () => importRows.filter((r) => r.isValid).length,
    [importRows]
  );

  const errorCount = useMemo(
    () => importRows.filter((r) => !r.isValid).length,
    [importRows]
  );

  const selectedCount = useMemo(
    () => importRows.filter((_, i) => selectedRows.has(i)).length,
    [selectedRows, importRows]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "source" && "Bulk Import Transactions"}
            {step === "preview" && "Preview CSV Data"}
            {step === "validation" && "Review & Import Transactions"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Source Selection */}
        {step === "source" && (
          <div className="space-y-4">
            <Tabs value={importMethod} onValueChange={(v: any) => setImportMethod(v)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload CSV File</TabsTrigger>
                <TabsTrigger value="paste">Paste CSV Text</TabsTrigger>
              </TabsList>
            </Tabs>

            {importMethod === "file" ? (
              <div className="space-y-2">
                <Label>Select CSV File</Label>
                <Input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Paste CSV Data</Label>
                <textarea
                  placeholder="Paste your CSV data here..."
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Sample CSV Format:</p>
              <pre className="text-xs text-blue-800 dark:text-blue-200 overflow-x-auto">
                {generateSampleCSV()}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(generateSampleCSV());
                  alert("Sample CSV copied to clipboard");
                }}
                className="mt-2 h-7 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Sample
              </Button>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={parseCSV}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Total Rows: {parsedData.length - 1}</p>
              <p>Detected Columns: {parsedData[0]?.length}</p>
            </div>

            <div className="border rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {parsedData[0]?.map((header: string, i: number) => (
                      <th key={i} className="px-3 py-2 text-left font-semibold border-r">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(1, 6).map((row: string[], i: number) => (
                    <tr key={i} className="border-t hover:bg-muted/50">
                      {row.map((cell: string, j: number) => (
                        <td key={j} className="px-3 py-2 border-r truncate max-w-xs">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("source")}>
                Back
              </Button>
              <Button onClick={proceedToValidation}>Proceed to Validation</Button>
            </div>
          </div>
        )}

        {/* Step 3: Validation & Import */}
        {step === "validation" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="bg-blue-50 dark:bg-blue-950 rounded p-2 border border-blue-200 dark:border-blue-800">
                <div className="font-semibold text-blue-900 dark:text-blue-100">Total</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-300">{importRows.length}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded p-2 border border-green-200 dark:border-green-800">
                <div className="font-semibold text-green-900 dark:text-green-100">Valid</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-300">{validCount}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded p-2 border border-red-200 dark:border-red-800">
                <div className="font-semibold text-red-900 dark:text-red-100">Errors</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-300">{errorCount}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950 rounded p-2 border border-purple-200 dark:border-purple-800">
                <div className="font-semibold text-purple-900 dark:text-purple-100">Selected</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-300">{selectedCount}</div>
              </div>
            </div>

            {/* Unselect Errors Button */}
            {errorCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newSelected = new Set(selectedRows);
                  importRows.forEach((row, i) => {
                    if (!row.isValid) {
                      newSelected.delete(i);
                    }
                  });
                  setSelectedRows(newSelected);
                }}
              >
                Unselect Error Rows
              </Button>
            )}

            {/* Import Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importing...</span>
                  <span className="font-semibold">{importProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left">S.No</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Type</th>
                    <th className="px-2 py-2 text-left">Title</th>
                    <th className="px-2 py-2 text-left">Amount</th>
                    <th className="px-2 py-2 text-left">Category</th>
                    <th className="px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => (
                    <React.Fragment key={i}>
                      <tr
                        className={`border-t ${
                          !row.isValid
                            ? "bg-red-50/50 dark:bg-red-950/20"
                            : "bg-green-50/50 dark:bg-green-950/20"
                        }`}
                      >
                        <td
                          className={`px-2 py-2 font-semibold ${
                            !row.isValid ? "text-red-600 dark:text-red-400" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRows.has(i)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedRows);
                              if (e.target.checked) {
                                newSelected.add(i);
                              } else {
                                newSelected.delete(i);
                              }
                              setSelectedRows(newSelected);
                            }}
                            disabled={!row.isValid}
                            className="mr-2"
                          />
                          {row.rowIndex}
                        </td>
                        <td className="px-2 py-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {row.isValid ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {row.isValid
                                  ? "Valid"
                                  : row.errors.map((e) => e.message).join(", ")}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-2 py-2">{row.type}</td>
                        <td className="px-2 py-2 truncate max-w-xs">{row.title}</td>
                        <td className="px-2 py-2">{row.amount}</td>
                        <td className="px-2 py-2 truncate max-w-xs">{row.category}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() =>
                              setExpandedRow(expandedRow === i ? null : i)
                            }
                            className="p-1 hover:bg-muted rounded"
                          >
                            {expandedRow === i ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === i && (
                        <tr className="border-t bg-muted/30">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="space-y-2 text-xs">
                              {row.errors.length > 0 && (
                                <div className="rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-2">
                                  <p className="font-semibold text-red-900 dark:text-red-100 mb-1">Errors:</p>
                                  {row.errors.map((err, idx) => (
                                    <p key={idx} className="text-red-700 dark:text-red-300">
                                      • {err.field}: {err.message}
                                    </p>
                                  ))}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-muted-foreground">Type:</p>
                                  <p className="font-medium">{row.type}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Amount:</p>
                                  <p className="font-medium">{row.amount}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Date:</p>
                                  <p className="font-medium">{row.transactionDate}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Frequency:</p>
                                  <p className="font-medium">{row.frequency}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-muted-foreground">Notes:</p>
                                  <p className="font-medium">{row.notes || "—"}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setStep("preview")}
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${selectedCount} Transactions`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
