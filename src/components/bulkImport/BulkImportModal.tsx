import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BulkImportStep1Source } from "./BulkImportStep1Source";
import { BulkImportStep2Preview } from "./BulkImportStep2Preview";
import { BulkImportStep3Mapping } from "./BulkImportStep3Mapping";
import { BulkImportStep4Validation } from "./BulkImportStep4Validation";
import { useBulkImport } from "@/hooks/useBulkImport";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEP_TITLES: Record<string, string> = {
  source: "Bulk Import - Select Source",
  preview: "Bulk Import - Preview Data",
  mapping: "Bulk Import - Map Columns",
  validation: "Bulk Import - Review & Validate",
  success: "Bulk Import - Complete",
};

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const bulkImport = useBulkImport();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { toast } = useToast();

  const handleStep1Next = (csvText: string, fileName: string) => {
    bulkImport.setCSV(csvText, fileName);
    const rows = bulkImport.parseCSVFile(csvText);
    if (rows) {
      bulkImport.setStep("preview");
    }
  };

  const handleStep2Next = () => {
    bulkImport.setStep("mapping");
    const mapping = bulkImport.autoDetectAndMapColumns();
    if (mapping) {
      bulkImport.parseRowsWithMapping(bulkImport.state.rawRows, mapping, bulkImport.state.hasHeaders ? 1 : 0);
    }
  };

  const handleStep3Next = () => {
    const mapping = bulkImport.columnMapping;
    bulkImport.parseRowsWithMapping(bulkImport.state.rawRows, mapping, bulkImport.state.hasHeaders ? 1 : 0);
    bulkImport.setStep("validation");
  };

  const handleImport = async () => {
    try {
      await bulkImport.importTransactions();
      setTimeout(() => {
        onClose();
        bulkImport.reset();
      }, 2000);
    } catch (error) {
      console.error("[v0] BULK IMPORT ERROR:", error);
    }
  };

  const handleBack = () => {
    const stepOrder: typeof bulkImport.state.step[] = ["source", "preview", "mapping", "validation"];
    const currentIdx = stepOrder.indexOf(bulkImport.state.step);
    if (currentIdx > 0) {
      bulkImport.setStep(stepOrder[currentIdx - 1]);
    }
  };

  const handleCancel = () => {
    bulkImport.reset();
    onClose();
  };

  const handleClose = () => {
    if (bulkImport.state.step === "success") {
      onClose();
      bulkImport.reset();
    } else {
      handleCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[bulkImport.state.step] || "Bulk Import"}</DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {bulkImport.state.step === "source" && (
            <BulkImportStep1Source
              onNext={handleStep1Next}
              onCancel={handleCancel}
              isLoading={bulkImport.state.isLoading}
            />
          )}

          {bulkImport.state.step === "preview" && (
            <BulkImportStep2Preview
              rawRows={bulkImport.state.rawRows}
              hasHeaders={bulkImport.state.hasHeaders}
              csvFileName={bulkImport.state.csvFileName}
              onBack={handleBack}
              onNext={handleStep2Next}
              onCancel={handleCancel}
            />
          )}

          {bulkImport.state.step === "mapping" && (
            <BulkImportStep3Mapping
              rawRows={bulkImport.state.rawRows}
              hasHeaders={bulkImport.state.hasHeaders}
              columnMapping={bulkImport.columnMapping}
              onMappingChange={(mapping) => {
                bulkImport.setColumnMapping(mapping);
              }}
              onBack={handleBack}
              onNext={handleStep3Next}
              onCancel={handleCancel}
            />
          )}

          {bulkImport.state.step === "validation" && (
            <BulkImportStep4Validation
              rows={bulkImport.state.parsedRows}
              accounts={accounts}
              categories={categories}
              onRowUpdate={bulkImport.updateRow}
              onRowToggle={bulkImport.toggleRowChecked}
              onBack={handleBack}
              onImport={handleImport}
              onCancel={handleCancel}
              isImporting={bulkImport.isImporting}
            />
          )}

          {bulkImport.state.error && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {bulkImport.state.error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
