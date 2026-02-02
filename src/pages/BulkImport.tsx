import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBulkImport } from "@/hooks/useBulkImport";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import BulkImportStep1Source from "@/components/bulkImport/BulkImportStep1Source";
import BulkImportStep2Preview from "@/components/bulkImport/BulkImportStep2Preview";
import BulkImportStep3Mapping from "@/components/bulkImport/BulkImportStep3Mapping";
import BulkImportStep4Validation from "@/components/bulkImport/BulkImportStep4Validation";

export default function BulkImportPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const bulkImport = useBulkImport();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const handleImportSuccess = () => {
    toast({
      title: "Success",
      description: `${bulkImport.state.successCount} transactions imported successfully!`,
    });
    setTimeout(() => {
      navigate("/transactions");
    }, 1500);
  };

  const handleCancel = () => {
    navigate("/transactions");
  };

  const handleClose = () => {
    navigate("/transactions");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bulk Import Transactions</h1>
            <p className="text-muted-foreground mt-1">
              Step {bulkImport.state.step === 'source' ? '1' : bulkImport.state.step === 'preview' ? '2' : bulkImport.state.step === 'mapping' ? '3' : '4'} of 4
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className={`flex flex-col items-center ${bulkImport.state.step === 'source' ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${bulkImport.state.step === 'source' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  1
                </div>
                <span className="text-xs mt-2">Source</span>
              </div>
              <div className="flex-1 h-1 mx-2 bg-muted"></div>
              <div className={`flex flex-col items-center ${['preview', 'mapping', 'validation'].includes(bulkImport.state.step) ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${['preview', 'mapping', 'validation'].includes(bulkImport.state.step) ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  2
                </div>
                <span className="text-xs mt-2">Preview</span>
              </div>
              <div className="flex-1 h-1 mx-2 bg-muted"></div>
              <div className={`flex flex-col items-center ${['mapping', 'validation'].includes(bulkImport.state.step) ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${['mapping', 'validation'].includes(bulkImport.state.step) ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  3
                </div>
                <span className="text-xs mt-2">Mapping</span>
              </div>
              <div className="flex-1 h-1 mx-2 bg-muted"></div>
              <div className={`flex flex-col items-center ${bulkImport.state.step === 'validation' ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${bulkImport.state.step === 'validation' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  4
                </div>
                <span className="text-xs mt-2">Validate</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {bulkImport.state.step === 'source' && (
              <BulkImportStep1Source
                onSourceSelect={bulkImport.setRawData}
                onProceed={() => bulkImport.setStep('preview')}
                onCancel={handleCancel}
              />
            )}

            {bulkImport.state.step === 'preview' && (
              <BulkImportStep2Preview
                csvText={bulkImport.state.rawData}
                onParsed={(rows) => {
                  bulkImport.setParsedRows(rows);
                  bulkImport.setStep('mapping');
                }}
                onBack={() => bulkImport.setStep('source')}
                onCancel={handleCancel}
              />
            )}

            {bulkImport.state.step === 'mapping' && (
              <BulkImportStep3Mapping
                rows={bulkImport.state.parsedRows}
                onMappingComplete={(mapping) => {
                  bulkImport.setColumnMapping(mapping);
                  bulkImport.setStep('validation');
                }}
                onBack={() => bulkImport.setStep('preview')}
                onCancel={handleCancel}
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
                onCancel={handleCancel}
                isImporting={bulkImport.state.isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
