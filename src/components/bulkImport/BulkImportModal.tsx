'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BulkImportStep1Source } from './BulkImportStep1Source';
import { BulkImportStep2Preview } from './BulkImportStep2Preview';
import { BulkImportStep3Mapping } from './BulkImportStep3Mapping';
import { BulkImportStep4Validation } from './BulkImportStep4Validation';
import { useBulkImport } from '@/hooks/useBulkImport';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { autoDetectMapping } from '@/utils/bulkImport';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEP_TITLES: Record<string, string> = {
  source: 'Select Import Source',
  preview: 'Preview Data',
  mapping: 'Map Columns',
  validation: 'Review & Validate',
  success: 'Import Complete',
};

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const bulkImport = useBulkImport();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const handleClose = () => {
    bulkImport.reset();
    onClose();
  };

  const handleStep1Next = (csvText: string, fileName: string) => {
    bulkImport.setCSV(csvText, fileName);
    const rows = bulkImport.parseCSVFile(csvText);
    if (rows) {
      bulkImport.setStep('preview');
    }
  };

  const handleStep2Next = () => {
    const headerRow = bulkImport.state.rawRows[0];
    const mapping = autoDetectMapping(headerRow);
    bulkImport.setColumnMapping(mapping);
    bulkImport.setStep('mapping');
  };

  const handleStep3Next = (mapping: any) => {
    bulkImport.setColumnMapping(mapping);
    const startIdx = bulkImport.state.hasHeaders ? 1 : 0;
    bulkImport.parseRowsWithMapping(bulkImport.state.rawRows, mapping, startIdx);
    bulkImport.setStep('validation');
  };

  const handleImportSuccess = () => {
    bulkImport.setStep('success');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import - {STEP_TITLES[bulkImport.state.step]}</DialogTitle>
        </DialogHeader>

        {bulkImport.state.step === 'source' && (
          <BulkImportStep1Source
            onNext={handleStep1Next}
            onCancel={handleClose}
            isLoading={bulkImport.state.isLoading}
          />
        )}

        {bulkImport.state.step === 'preview' && (
          <BulkImportStep2Preview
            rawRows={bulkImport.state.rawRows}
            hasHeaders={bulkImport.state.hasHeaders}
            csvFileName={bulkImport.state.csvFileName}
            onBack={() => bulkImport.setStep('source')}
            onNext={handleStep2Next}
            onCancel={handleClose}
          />
        )}

        {bulkImport.state.step === 'mapping' && (
          <BulkImportStep3Mapping
            rawRows={bulkImport.state.rawRows}
            hasHeaders={bulkImport.state.hasHeaders}
            columnMapping={bulkImport.state.columnMapping}
            onMappingChange={(mapping) => bulkImport.setColumnMapping(mapping)}
            onBack={() => bulkImport.setStep('preview')}
            onNext={handleStep3Next}
            onCancel={handleClose}
          />
        )}

        {bulkImport.state.step === 'validation' && (
          <BulkImportStep4Validation
            rows={bulkImport.state.parsedRows}
            accounts={accounts}
            categories={categories}
            onRowUpdate={(index, row) => bulkImport.updateRow(index, row)}
            onRowToggle={(index) => bulkImport.toggleRowChecked(index)}
            onBack={() => bulkImport.setStep('mapping')}
            onImport={handleImportSuccess}
            onCancel={handleClose}
            isImporting={bulkImport.state.isLoading}
          />
        )}

        {bulkImport.state.step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <h3 className="text-lg font-semibold text-accent">
              Successfully imported transactions!
            </h3>
            <p className="text-sm text-muted-foreground">
              Your transactions have been added to the system.
            </p>
            <button
              onClick={handleClose}
              className="bg-accent text-accent-foreground px-6 py-2 rounded-md hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
