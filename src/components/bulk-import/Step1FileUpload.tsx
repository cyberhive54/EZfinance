import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, ChevronDown, Copy, Check } from "lucide-react";
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
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: ParsedCSVRow[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copiedRuleIndex, setCopiedRuleIndex] = useState<number | null>(null);
  const [copiedSampleIndex, setCopiedSampleIndex] = useState<number | null>(null);
  const [copyAnnouncement, setCopyAnnouncement] = useState("");

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
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

      // Store parsed data
      setParsedData({
        headers: result.headers,
        rows: result.data,
      });
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

    // Store parsed data
    setParsedData({
      headers: result.headers,
      rows: result.data,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleContinue = () => {
    if (!parsedData) return;
    onFileLoaded(parsedData.rows, parsedData.headers);
  };

  const copyToClipboard = (text: string, type: "rule" | "sample", index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyAnnouncement(
        type === "rule"
          ? "Copied required-fields template to clipboard"
          : "Copied sample CSV to clipboard"
      );
      if (type === "rule") {
        setCopiedRuleIndex(index);
        setTimeout(() => setCopiedRuleIndex(null), 2000);
      } else {
        setCopiedSampleIndex(index);
        setTimeout(() => setCopiedSampleIndex(null), 2000);
      }
    });
  };

  // Success state - show parsed data and continue button.
  // A plain section avoids nesting a Card inside the wizard's Card.
  if (parsedData) {
    return (
      <div className="space-y-4">
        <section
          aria-label="CSV loaded successfully"
          className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-4"
        >
          <h3 className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            CSV Loaded Successfully
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Columns Found</p>
              <p className="text-2xl font-semibold text-success tabular-nums">{parsedData.headers.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rows Found</p>
              <p className="text-2xl font-semibold text-success tabular-nums">{parsedData.rows.length}</p>
            </div>
          </div>
          <div className="bg-muted/50 p-3 rounded text-xs max-h-24 overflow-y-auto">
            <p className="font-mono text-foreground/80">
              {parsedData.headers.join(" | ")}
            </p>
          </div>
        </section>

        <Button
          onClick={handleContinue}
          size="lg"
          className="w-full"
        >
          Continue to Mapping
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setParsedData(null);
            setPastedCSV("");
            setError("");
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}
          className="w-full"
        >
          Load Different File
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Announce copy confirmations to assistive technology */}
      <div role="status" aria-live="polite" className="sr-only">
        {copyAnnouncement}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Upload Tabs */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="paste">Paste CSV Data</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4 mt-4">
          <label
            htmlFor="csv-file-input"
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file: drag and drop, or press Enter to browse"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`block border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 bg-muted/30"
            } cursor-pointer`}
          >
            <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
            <p className="text-lg font-semibold mb-1">Drag and drop your CSV file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Max 5MB • Max 500 rows</p>
            <input
              id="csv-file-input"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isLoading}
              className="hidden"
            />
          </label>
        </TabsContent>

        {/* Paste Tab */}
        <TabsContent value="paste" className="space-y-4 mt-4">
          <Textarea
            placeholder={"Paste your CSV data here\nExample: date,account,type,amount\n2024-01-15,Checking,expense,50.00"}
            value={pastedCSV}
            onChange={(e) => setPastedCSV(e.target.value)}
            className="min-h-48 font-mono text-sm"
          />
          <Button
            onClick={handlePastedCSV}
            disabled={isLoading || !pastedCSV.trim()}
            className="w-full"
          >
            {isLoading ? "Parsing..." : "Parse CSV"}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Validation Rules Section */}
      <Collapsible defaultOpen className="border rounded-lg p-4">
        <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-sm hover:bg-muted/30 p-1 rounded w-full">
          <ChevronDown className="h-4 w-4" />
          Validation Rules & Format Requirements
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
          {/* Required Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm">Required Fields</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(`date,type,amount,account_id`, "rule", 0)}
                className="h-6 gap-1"
              >
                {copiedRuleIndex === 0 ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span className="text-xs">Copy</span>
              </Button>
            </div>
            <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
              <li><span className="font-mono">date</span> - YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, or DD/MM/YYYY</li>
              <li><span className="font-mono">type</span> - expense, income, or transfer (case-insensitive)</li>
              <li><span className="font-mono">amount</span> - Positive number (max 2 decimal places)</li>
              <li><span className="font-mono">account_id</span> - Account name or ID (for income/expense; for transfers use from_account/to_account)</li>
            </ul>
          </div>

          {/* Optional Fields */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Optional Fields</h4>
            <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
              <li><span className="font-mono">category</span> - Exact match (case-insensitive) for income/expense transactions; must match type (not for transfers)</li>
              <li><span className="font-mono">description</span> - Any text</li>
              <li><span className="font-mono">notes</span> - Any text</li>
              <li><span className="font-mono">goal_name</span> - Must exist in system; optional, requires exchange_from_goal if used</li>
              <li><span className="font-mono">exchange_from_goal</span> - Amount to exchange with goal (auto-mode: income→contribute, expense→deduct); must be less than transaction amount</li>
              <li><span className="font-mono">from_account</span> - For transfers only; exact name match (case-insensitive)</li>
              <li><span className="font-mono">to_account</span> - For transfers only; exact name match (case-insensitive)</li>
              <li><span className="font-mono">frequency</span> - daily, weekly, monthly, or yearly (case-insensitive, exact match)</li>
            </ul>
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Constraints & Validation Rules</h4>
            <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
              <li>Max 500 rows per import</li>
              <li>Max 5MB file size</li>
              <li>Dates cannot be in the future</li>
              <li>Amounts must be positive with max 2 decimal places</li>
              <li>Transfer type requires both from_account and to_account (cannot be the same); no goal fields allowed</li>
              <li>Income/Expense transactions cannot have from_account or to_account; use account_id instead</li>
              <li>Categories must exactly match system categories and transaction type (income for income only, expense for expense)</li>
              <li>Account names must exactly match your account names (case-insensitive)</li>
              <li>Goal exchanges: exchange_from_goal with income automatically contributes to goal; with expense automatically deducts from goal</li>
              <li>Exchange amount must be &lt; transaction amount and requires goal_name</li>
              <li>Frequency values must be exact: daily, weekly, monthly, or yearly (case-insensitive)</li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Example Formats */}
      <Collapsible className="border rounded-lg p-4">
        <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-sm hover:bg-muted/30 p-1 rounded w-full">
          <ChevronDown className="h-4 w-4" />
          Example CSV Formats
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
          {/* Full Sample with All Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-xs text-info">Complete Sample CSV (All Fields)</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(`date,account_id,type,category,amount,description,goal_name,exchange_from_goal,from_account,to_account,frequency
2024-01-15,Checking,expense,groceries,45.50,Weekly groceries
2024-01-16,Checking,income,Salary,5000.00,Monthly salary,Emergency Fund,3000.00
2024-01-17,Checking,expense,utilities,120.00,Electric bill,Vacation,50.00
2024-01-18,Checking,expense,insurance,100.00,Insurance payment
2024-01-19,Checking,transfer,,,Transfer between accounts,,,Checking,Savings,500.00`, "sample", 0)}
                className="h-6 gap-1"
              >
                {copiedSampleIndex === 0 ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span className="text-xs">Copy</span>
              </Button>
            </div>
            <div className="bg-info/5 border border-info/30 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre max-h-32">
{`date,account_id,type,category,amount,description,goal_name,exchange_from_goal,from_account,to_account,frequency
2024-01-15,Checking,expense,groceries,45.50,Weekly groceries
2024-01-16,Checking,income,Salary,5000.00,Monthly salary,Emergency Fund,3000.00
2024-01-17,Checking,expense,utilities,120.00,Electric bill,Vacation,50.00
2024-01-18,Checking,expense,insurance,100.00,Insurance payment
2024-01-19,Checking,transfer,,,Transfer between accounts,,,Checking,Savings,500.00`}
            </div>
          </div>

          {/* Example 1 - Simple Expense */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-success">Correct: Simple Expense</h4>
            <div className="bg-success/5 border border-success/30 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account_id,type,category,amount,description
2024-01-15,Checking,expense,groceries,45.50,Weekly groceries
2024-01-16,Checking,EXPENSE,utilities,120.00,Electricity bill`}
            </div>
          </div>

          {/* Example 2 - With Goal Deduction */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-success">Correct: With Goal Deduction</h4>
            <div className="bg-success/5 border border-success/30 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account_id,type,amount,goal_name,deduction_type
2024-01-15,Savings,expense,100.00,Emergency Fund,full
2024-01-16,Savings,expense,50.00,Vacation Fund,split`}
            </div>
          </div>

          {/* Example 3 - Transfer */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-success">Correct: Transfer (2 rows)</h4>
            <div className="bg-success/5 border border-success/30 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,from_account,to_account,amount,type,description
2024-01-15,Checking,Savings,500.00,transfer-sender,Move to savings
2024-01-15,Checking,Savings,500.00,transfer-receiver,Move to savings`}
            </div>
          </div>

          {/* Example 4 - Wrong */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-destructive">Wrong: Missing Required Fields</h4>
            <div className="bg-destructive/5 border border-destructive/30 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account,amount
2024-01-15,Checking,50
Missing: type and category`}
            </div>
          </div>

          {/* Example 5 - Wrong */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-destructive">Wrong: Invalid Data</h4>
            <div className="bg-destructive/5 border border-destructive/30 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account_id,type,category,amount
2024-02-03,Checking,expense,groceries,abc
Invalid amount: "abc" (must be numeric)`}
            </div>
          </div>

          {/* Example 6 - Multiple word type */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-success">Correct: Multi-word Types Auto-converted</h4>
            <div className="bg-success/5 border border-success/30 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,from_account,to_account,amount,type
2024-01-15,My Checking,My Savings,500,Bank Transfer
Converts to: from_account=my_checking, to_account=my_savings, type=transfer-sender`}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
