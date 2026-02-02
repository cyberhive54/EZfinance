import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { parseCSV } from "@/utils/bulkImport";

interface BulkImportStep1SourceProps {
  onNext: (csvText: string, fileName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BulkImportStep1Source({
  onNext,
  onCancel,
  isLoading = false,
}: BulkImportStep1SourceProps) {
  const [sourceType, setSourceType] = useState<"file" | "paste">("paste");
  const [csvText, setCSVText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [showExample, setShowExample] = useState(true);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setCSVText(text);
      } catch (err) {
        setError("Failed to read file");
      }
    };
    reader.readAsText(file);
  };

  const validateAndProceed = () => {
    setError("");

    if (!csvText.trim()) {
      setError("CSV data is empty. Please provide CSV content.");
      return;
    }

    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        setError("CSV is empty or contains no valid rows.");
        return;
      }

      onNext(csvText, sourceType === "file" ? fileName : "pasted-data.csv");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  };

  const exampleCSV = `Type,Title,Amount,Transaction Date,Account,Category,From Account,To Account,Frequency,Notes
EXPENSE,Groceries,150.50,2024-01-15,Checking,Groceries,,,none,Weekly shopping
INCOME,Salary,5000.00,2024-01-01,Checking,Salary,,,monthly,Monthly salary
TRANSFER,Office Move,1000,2024-01-15,,,My Checking,Savings Account,,Regular transfer`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Source</h3>
        <p className="text-sm text-muted-foreground">Choose how you want to import transactions</p>
      </div>

      <RadioGroup value={sourceType} onValueChange={(value) => setSourceType(value as "file" | "paste")}>
        <div className="space-y-4">
          {/* Upload File Option */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
            <RadioGroupItem value="file" id="file-option" className="mt-1" />
            <label htmlFor="file-option" className="flex-1 cursor-pointer">
              <Label className="text-base font-medium cursor-pointer">Upload CSV File</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a CSV or text file. Max 10MB.
              </p>
              {sourceType === "file" && (
                <div className="mt-3">
                  <Input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  {fileName && (
                    <p className="text-xs text-accent mt-2">Selected: {fileName}</p>
                  )}
                </div>
              )}
            </label>
          </div>

          {/* Paste CSV Option */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
            <RadioGroupItem value="paste" id="paste-option" className="mt-1" />
            <label htmlFor="paste-option" className="flex-1 cursor-pointer">
              <Label className="text-base font-medium cursor-pointer">Paste CSV Text</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Paste your CSV data directly in the text area.
              </p>
              {sourceType === "paste" && (
                <div className="mt-3">
                  <Textarea
                    placeholder="Paste your CSV data here..."
                    value={csvText}
                    onChange={(e) => {
                      setCSVText(e.target.value);
                      setError("");
                    }}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </label>
          </div>
        </div>
      </RadioGroup>

      {/* Example Format */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <button
            onClick={() => setShowExample(!showExample)}
            className="flex items-center justify-between w-full hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Example CSV Format</CardTitle>
            </div>
            {showExample ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {showExample && (
          <CardContent>
            <div className="bg-background border rounded p-3 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">{exampleCSV}</pre>
            </div>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p>
                <strong>Supported Formats:</strong> Type (INCOME/EXPENSE/TRANSFER), Title, Amount, Transaction
                Date (YYYY-MM-DD or MM-DD-YYYY), Account, Category, From Account, To Account, Frequency, Notes
              </p>
              <p>
                <strong>Note:</strong> For transfers, either From Account or To Account is required. Account
                names are case-insensitive.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={validateAndProceed} disabled={!csvText.trim() || isLoading}>
          {isLoading ? "Loading..." : "Next"}
        </Button>
      </div>
    </div>
  );
}
