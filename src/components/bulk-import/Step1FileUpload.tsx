import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, ChevronDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      if (type === "rule") {
        setCopiedRuleIndex(index);
        setTimeout(() => setCopiedRuleIndex(null), 2000);
      } else {
        setCopiedSampleIndex(index);
        setTimeout(() => setCopiedSampleIndex(null), 2000);
      }
    });
  };

  // Success state - show parsed data and continue button
  if (parsedData) {
    return (
      <div className="space-y-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              CSV Loaded Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Columns Found</p>
                <p className="text-2xl font-bold text-green-600">{parsedData.headers.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rows Found</p>
                <p className="text-2xl font-bold text-green-600">{parsedData.rows.length}</p>
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded text-xs max-h-24 overflow-y-auto">
              <p className="font-mono text-foreground/80">
                {parsedData.headers.join(" | ")}
              </p>
            </div>
          </CardContent>
        </Card>

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
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 bg-muted/30"
            } cursor-pointer`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-semibold mb-1">Drag and drop your CSV file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Max 5MB • Max 500 rows</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isLoading}
              className="hidden"
            />
          </div>
        </TabsContent>

        {/* Paste Tab */}
        <TabsContent value="paste" className="space-y-4 mt-4">
          <Textarea
            placeholder="Paste your CSV data here&#10;Example: date,account,type,amount&#10;2024-01-15,Checking,expense,50.00"
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
              <li><span className="font-mono">category</span> - Must match system categories (only for income/expense)</li>
              <li><span className="font-mono">description</span> - Any text</li>
              <li><span className="font-mono">notes</span> - Any text</li>
              <li><span className="font-mono">goal_name</span> - Must exist in system (cannot exist without deduction_type)</li>
              <li><span className="font-mono">deduction_type</span> - full or split (requires goal_name; if split, also provide split_amount)</li>
              <li><span className="font-mono">split_amount</span> - Amount to allocate to goal (only with deduction_type=split)</li>
              <li><span className="font-mono">from_account</span> - For transfers (case-insensitive, spaces → underscores)</li>
              <li><span className="font-mono">to_account</span> - For transfers (case-insensitive, spaces → underscores)</li>
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
              <li>Transfer type requires both from_account and to_account (cannot be the same)</li>
              <li>Goal deductions: goal_name requires deduction_type; deduction_type requires goal_name</li>
              <li>Split deductions should include split_amount for allocation amount</li>
              <li>Account/goal/category names with spaces will be normalized (e.g., "My Account" → "my_account")</li>
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
              <h4 className="font-semibold text-xs text-blue-700">Complete Sample CSV (All Fields)</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(`date,account_id,type,category,amount,description,notes,goal_name,deduction_type,split_amount,from_account,to_account,frequency
2024-01-15,Checking,expense,groceries,45.50,Weekly groceries,Primary account,,,,,daily
2024-01-16,Savings,income,Salary,5000.00,Monthly salary,Direct deposit,Emergency Fund,full,5000.00,,
2024-01-17,Checking,expense,utilities,120.00,Electric bill,Monthly payment,Vacation,split,50.00
2024-01-18,Checking,transfer,,,Transfer between accounts,,Checking,Savings,500.00,Checking,Savings`, "sample", 0)}
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
            <div className="bg-blue-50/50 border border-blue-200 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre max-h-32">
{`date,account_id,type,category,amount,description,notes,goal_name,deduction_type,split_amount,from_account,to_account,frequency
2024-01-15,Checking,expense,groceries,45.50,Weekly groceries,Primary account,,,,,daily
2024-01-16,Savings,income,Salary,5000.00,Monthly salary,Direct deposit,Emergency Fund,full,5000.00,,
2024-01-17,Checking,expense,utilities,120.00,Electric bill,Monthly payment,Vacation,split,50.00
2024-01-18,Checking,transfer,,,Transfer between accounts,,Checking,Savings,500.00,Checking,Savings`}
            </div>
          </div>

          {/* Example 1 - Simple Expense */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-green-700">✓ Correct: Simple Expense</h4>
            <div className="bg-green-50/50 border border-green-200 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account_id,type,category,amount,description
2024-01-15,Checking,expense,groceries,45.50,Weekly groceries
2024-01-16,Checking,EXPENSE,utilities,120.00,Electricity bill`}
            </div>
          </div>

          {/* Example 2 - With Goal Deduction */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-green-700">✓ Correct: With Goal Deduction</h4>
            <div className="bg-green-50/50 border border-green-200 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account_id,type,amount,goal_name,deduction_type
2024-01-15,Savings,expense,100.00,Emergency Fund,full
2024-01-16,Savings,expense,50.00,Vacation Fund,split`}
            </div>
          </div>

          {/* Example 3 - Transfer */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-green-700">✓ Correct: Transfer (2 rows)</h4>
            <div className="bg-green-50/50 border border-green-200 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,from_account,to_account,amount,type,description
2024-01-15,Checking,Savings,500.00,transfer-sender,Move to savings
2024-01-15,Checking,Savings,500.00,transfer-receiver,Move to savings`}
            </div>
          </div>

          {/* Example 4 - Wrong */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-red-700">✗ Wrong: Missing Required Fields</h4>
            <div className="bg-red-50/50 border border-red-200 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account,amount
2024-01-15,Checking,50
❌ Missing: type and category`}
            </div>
          </div>

          {/* Example 5 - Wrong */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-red-700">✗ Wrong: Invalid Data</h4>
            <div className="bg-red-50/50 border border-red-200 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,account_id,type,category,amount
2024-02-03,Checking,expense,groceries,abc
❌ Invalid amount: "abc" (must be numeric)`}
            </div>
          </div>

          {/* Example 6 - Multiple word type */}
          <div>
            <h4 className="font-semibold text-xs mb-2 text-green-700">✓ Correct: Multi-word Types Auto-converted</h4>
            <div className="bg-green-50/50 border border-green-200 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`date,from_account,to_account,amount,type
2024-01-15,My Checking,My Savings,500,Bank Transfer
→ Converts to: from_account=my_checking, to_account=my_savings, type=transfer-sender`}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
