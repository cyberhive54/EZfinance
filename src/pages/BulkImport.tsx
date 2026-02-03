import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useGoals } from "@/hooks/useGoals";
import Step1FileUpload from "@/components/bulk-import/Step1FileUpload";
import Step2HeaderMapping from "@/components/bulk-import/Step2HeaderMapping";
import Step3ErrorCorrection from "@/components/bulk-import/Step3ErrorCorrection";
import StepIndicator from "@/components/bulk-import/StepIndicator";
import { ParsedCSVRow, HeaderMapping, ValidationError } from "@/types/bulkImport";
import { importBulkTransactions, ImportResult } from "@/utils/bulkImportService";

export default function BulkImport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useTransactions();
  const { goals } = useGoals();

  const [currentStep, setCurrentStep] = useState(1);
  const [csvData, setCSVData] = useState<ParsedCSVRow[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [headerMapping, setHeaderMapping] = useState<HeaderMapping>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Map<number, ValidationError[]>>(new Map());
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileLoaded = (data: ParsedCSVRow[], headers: string[]) => {
    setCSVData(data);
    setOriginalHeaders(headers);
    // Select all rows by default
    setSelectedRows(new Set(data.map((_, idx) => idx)));
    setCurrentStep(2);
  };

  const handleMappingComplete = (mapping: HeaderMapping) => {
    setHeaderMapping(mapping);
    setCurrentStep(3);
  };

  const handleRowsSelected = (rowIndices: Set<number>) => {
    setSelectedRows(rowIndices);
  };

  const handleImport = async (data: ParsedCSVRow[], rows: Set<number>, onProgress?: (progress: number) => void) => {
    if (!user) return;

    setIsImporting(true);
    try {
      const result = await importBulkTransactions(
        user.id,
        data,
        headerMapping,
        rows,
        accounts || [],
        categories || [],
        goals || [],
        onProgress
      );
      setImportResult(result);
    } catch (err) {
      console.error("Import failed:", err);
      setImportResult({
        success: false,
        successfulImports: 0,
        failedImports: rows.size,
        errors: [{ rowIndex: 0, message: "Import failed: " + (err instanceof Error ? err.message : "Unknown error") }],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 2) {
        // Reset to step 1
        setCSVData([]);
        setOriginalHeaders([]);
        setSelectedRows(new Set());
        setHeaderMapping({});
      } else if (currentStep === 3) {
        // Go back to step 2
        setValidationErrors(new Map());
      }
      setCurrentStep(currentStep - 1);
    }
  };

  // Success screen
  if (importResult) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Import Complete</h1>
            <p className="text-muted-foreground mt-1">Your transactions have been processed</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/transactions")}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className={`h-6 w-6 ${importResult.success ? "text-green-600" : "text-yellow-600"}`} />
              {importResult.success ? "Import Successful!" : "Import Completed with Errors"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Successfully Imported</p>
                <p className="text-3xl font-bold text-green-600">{importResult.successfulImports}</p>
              </div>
              {importResult.failedImports > 0 && (
                <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/20">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{importResult.failedImports}</p>
                </div>
              )}
            </div>

            {/* Summary message */}
            {importResult.summary && (
              <Alert className={importResult.success ? "border-green-500/30 bg-green-500/5" : ""}>
                <AlertDescription>{importResult.summary}</AlertDescription>
              </Alert>
            )}

            {/* Error details if any */}
            {importResult.errors.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-sm text-red-700">Errors ({importResult.errors.length})</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="text-xs text-red-600">
                      Row {error.rowIndex}: {error.message}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className="text-xs text-red-600 font-semibold">
                      ... and {importResult.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={() => navigate("/transactions")} className="flex-1">
                View Transactions
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImportResult(null);
                  setCurrentStep(1);
                  setCSVData([]);
                  setOriginalHeaders([]);
                  setSelectedRows(new Set());
                  setHeaderMapping({});
                }}
              >
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Import Transactions</h1>
          <p className="text-muted-foreground mt-1">Import multiple transactions at once from a CSV file</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/transactions")}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={3} />

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Step 1: Upload CSV File"}
            {currentStep === 2 && "Step 2: Map Column Headers"}
            {currentStep === 3 && "Step 3: Review & Correct Errors"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Upload a CSV file or paste CSV data. Maximum 5MB or 500 rows."}
            {currentStep === 2 && "Map your CSV columns to transaction fields."}
            {currentStep === 3 && "Review data and fix any validation errors before importing."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <Step1FileUpload onFileLoaded={handleFileLoaded} />
          )}

          {/* Step 2: Header Mapping */}
          {currentStep === 2 && (
            <Step2HeaderMapping
              csvData={csvData}
              originalHeaders={originalHeaders}
              onMappingComplete={handleMappingComplete}
              selectedRows={selectedRows}
              onRowsSelected={handleRowsSelected}
            />
          )}

          {/* Step 3: Error Correction */}
          {currentStep === 3 && (
            <Step3ErrorCorrection
              csvData={csvData}
              headerMapping={headerMapping}
              selectedRows={selectedRows}
              onSelectedRowsChange={handleRowsSelected}
              accounts={accounts || []}
              categories={categories || []}
              goals={goals || []}
              onImport={handleImport}
              isImporting={isImporting}
            />
          )}

          {/* Back Button */}
          {currentStep > 1 && (
            <div className="flex pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isImporting}
              >
                Back to Previous Step
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
