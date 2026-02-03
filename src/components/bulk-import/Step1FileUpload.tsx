import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { validateCSVFile, readFileAsText, parseCSV } from "@/utils/csvParser";
import { ParsedCSVRow } from "@/types/bulkImport";

interface Step1FileUploadProps {
  onFileLoaded: (data: ParsedCSVRow[], headers: string[]) => void;
}

export default function Step1FileUpload({ onFileLoaded }: Step1FileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [pastedCSV, setPastedCSV] = useState<string>("");
  const [parsedDataPreview, setParsedDataPreview] = useState<{ headers: string[]; rows: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setIsLoading(true);

    try {
      // Validate file
      const validation = validateCSVFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        setIsLoading(false);
        return;
      }

      // Read file
      const csvText = await readFileAsText(file);

      // Parse CSV
      const result = parseCSV(csvText);
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Show preview
      setParsedDataPreview({
        headers: result.headers,
        rows: result.data.length,
      });

      // On confirm, call parent
      setIsLoading(false);
    } catch (err) {
      setError(`Failed to process file: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsLoading(false);
    }
  };

  const handlePastedCSV = () => {
    if (!pastedCSV.trim()) {
      setError("Please paste CSV data");
      return;
    }

    setError("");
    const result = parseCSV(pastedCSV);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Show preview
    setParsedDataPreview({
      headers: result.headers,
      rows: result.data.length,
    });
  };

  const handleConfirm = () => {
    if (!parsedDataPreview) return;

    // Get CSV text for parsing
    let csvText = pastedCSV;
    if (fileInputRef.current?.files?.[0]) {
      readFileAsText(fileInputRef.current.files[0]).then((text) => {
        const result = parseCSV(text);
        onFileLoaded(result.data, result.headers);
      });
      return;
    }

    const result = parseCSV(csvText);
    onFileLoaded(result.data, result.headers);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h3 className="font-semibold">File Requirements</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• File format: CSV (.csv)</li>
          <li>• Maximum file size: 5MB</li>
          <li>• Maximum rows: 500 transactions</li>
          <li>• First row must contain column headers</li>
          <li>• Supports both comma and semicolon delimiters</li>
        </ul>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Input Tabs */}
      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Upload File</TabsTrigger>
          <TabsTrigger value="paste">Paste CSV Data</TabsTrigger>
        </TabsList>

        {/* File Upload Tab */}
        <TabsContent value="file" className="space-y-4">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("border-primary");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-primary");
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-primary");
              if (e.dataTransfer.files?.[0]) {
                handleFileSelect({
                  target: { files: e.dataTransfer.files } as any,
                } as React.ChangeEvent<HTMLInputElement>);
              }
            }}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="font-semibold">Drag and drop your CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </TabsContent>

        {/* Paste CSV Tab */}
        <TabsContent value="paste" className="space-y-4">
          <Textarea
            placeholder="Paste your CSV data here. First row should contain headers."
            value={pastedCSV}
            onChange={(e) => {
              setPastedCSV(e.target.value);
              setError("");
            }}
            rows={8}
            className="font-mono text-sm"
          />
          <Button onClick={handlePastedCSV} disabled={!pastedCSV.trim()} className="w-full">
            Parse CSV Data
          </Button>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {parsedDataPreview && (
        <Alert className="border-green-500/30 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            CSV loaded successfully! <strong>{parsedDataPreview.rows}</strong> rows found with{" "}
            <strong>{parsedDataPreview.headers.length}</strong> columns.
          </AlertDescription>
        </Alert>
      )}

      {/* Example Formats */}
      <ExampleFormats />

      {/* Validation Rules */}
      <ValidationRules />

      {/* Confirm Button */}
      {parsedDataPreview && (
        <Button onClick={handleConfirm} size="lg" className="w-full">
          Continue to Mapping
        </Button>
      )}
    </div>
  );
}

function ExampleFormats() {
  const [openExample, setOpenExample] = useState<string>("");

  return (
    <div className="space-y-3 border-t pt-6">
      <h3 className="font-semibold">Example CSV Formats</h3>

      {/* Example 1: Simple Expense */}
      <Collapsible open={openExample === "simple"} onOpenChange={(open) => setOpenExample(open ? "simple" : "")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors">
          <div className="text-left">
            <p className="font-medium text-sm">Example 1: Simple Expense Transactions</p>
            <p className="text-xs text-muted-foreground">Basic income and expense entries</p>
          </div>
          <div className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">Correct</div>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-3 bg-muted/50 rounded-b-lg border border-t-0">
          <pre className="text-xs overflow-x-auto p-2 bg-background rounded border">
{`date,account_id,type,category,amount,description
2025-02-03,ACC-001,expense,groceries,45.50,Weekly shopping
2025-02-04,ACC-001,expense,utilities,120.00,Electricity bill
2025-02-05,ACC-002,income,salary,5000.00,Monthly salary`}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      {/* Example 2: With Goal Deduction */}
      <Collapsible open={openExample === "goals"} onOpenChange={(open) => setOpenExample(open ? "goals" : "")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors">
          <div className="text-left">
            <p className="font-medium text-sm">Example 2: With Goal Deductions</p>
            <p className="text-xs text-muted-foreground">Expenses linked to savings goals</p>
          </div>
          <div className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">Correct</div>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-3 bg-muted/50 rounded-b-lg border border-t-0">
          <pre className="text-xs overflow-x-auto p-2 bg-background rounded border">
{`date,account_id,type,category,amount,description,goal_name,deduction_type
2025-02-03,ACC-001,expense,savings,100.00,Savings deposit,Emergency Fund,full
2025-02-04,ACC-001,expense,savings,50.00,Partial savings,Vacation,split`}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      {/* Example 3: Transfer Transactions */}
      <Collapsible open={openExample === "transfer"} onOpenChange={(open) => setOpenExample(open ? "transfer" : "")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors">
          <div className="text-left">
            <p className="font-medium text-sm">Example 3: Transfer Transactions</p>
            <p className="text-xs text-muted-foreground">Transfers between accounts (provide both sender & receiver rows)</p>
          </div>
          <div className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">Correct</div>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-3 bg-muted/50 rounded-b-lg border border-t-0">
          <pre className="text-xs overflow-x-auto p-2 bg-background rounded border">
{`date,from_account,to_account,type,amount,description
2025-02-03,ACC-001,ACC-002,transfer-sender,500.00,Move to savings
2025-02-03,ACC-002,ACC-001,transfer-receiver,500.00,Move to savings`}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      {/* Example 4: Missing Required Field (WRONG) */}
      <Collapsible open={openExample === "wrong1"} onOpenChange={(open) => setOpenExample(open ? "wrong1" : "")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors">
          <div className="text-left">
            <p className="font-medium text-sm">Example 4: Missing Required Fields</p>
            <p className="text-xs text-muted-foreground">Missing type and category columns</p>
          </div>
          <div className="text-xs bg-red-500/10 text-red-600 px-2 py-1 rounded">Wrong</div>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-3 bg-muted/50 rounded-b-lg border border-t-0">
          <pre className="text-xs overflow-x-auto p-2 bg-background rounded border">
{`date,account_id,amount,description
2025-02-03,ACC-001,45.50,Weekly shopping
❌ Missing: type, category
✓ Will fail validation`}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      {/* Example 5: Invalid Data */}
      <Collapsible open={openExample === "wrong2"} onOpenChange={(open) => setOpenExample(open ? "wrong2" : "")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors">
          <div className="text-left">
            <p className="font-medium text-sm">Example 5: Invalid Data Values</p>
            <p className="text-xs text-muted-foreground">Bad date format, non-numeric amount</p>
          </div>
          <div className="text-xs bg-red-500/10 text-red-600 px-2 py-1 rounded">Wrong</div>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-3 bg-muted/50 rounded-b-lg border border-t-0">
          <pre className="text-xs overflow-x-auto p-2 bg-background rounded border">
{`date,account_id,type,category,amount,description
02/03/2025,ACC-001,expense,groceries,abc,Shopping
❌ Date should be: 2025-02-03 (YYYY-MM-DD)
❌ Amount should be numeric: 45.50`}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ValidationRules() {
  return (
    <div className="border-t pt-6 space-y-3">
      <h3 className="font-semibold">Validation Rules & Requirements</h3>

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium mb-2">Required Fields:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>date</strong> - YYYY-MM-DD format</li>
            <li>• <strong>type</strong> - expense, income, or transfer</li>
            <li>• <strong>amount</strong> - Positive number</li>
            <li>• <strong>account_id</strong> - For income/expense only</li>
          </ul>
        </div>

        <div>
          <p className="font-medium mb-2">Optional Fields:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>category</strong> - Must match system categories</li>
            <li>• <strong>description</strong> - Any text</li>
            <li>• <strong>notes</strong> - Additional notes</li>
            <li>• <strong>goal_name</strong> - Must exist in system</li>
          </ul>
        </div>

        <div>
          <p className="font-medium mb-2">Transfer Transactions:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>from_account</strong> - Source account</li>
            <li>• <strong>to_account</strong> - Destination account</li>
            <li>• Must provide separate rows for sender & receiver</li>
            <li>• from_account ≠ to_account</li>
          </ul>
        </div>

        <div>
          <p className="font-medium mb-2">Goal Deductions:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>goal_name</strong> - Name of the goal</li>
            <li>• <strong>deduction_type</strong> - "full" or "split"</li>
            <li>• Goal must exist in the system</li>
            <li>• Both fields optional together</li>
          </ul>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
        <p className="text-sm text-yellow-700">
          <strong>Constraints:</strong> Max 500 rows per import, max 5MB file size, dates cannot be in the future
        </p>
      </div>
    </div>
  );
}
