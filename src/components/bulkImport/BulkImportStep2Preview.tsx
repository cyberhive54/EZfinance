import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface BulkImportStep2PreviewProps {
  rawRows: string[][];
  hasHeaders: boolean;
  csvFileName: string;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

export function BulkImportStep2Preview({
  rawRows,
  hasHeaders,
  csvFileName,
  onBack,
  onNext,
  onCancel,
}: BulkImportStep2PreviewProps) {
  const previewRows = rawRows.slice(0, 10);
  const startIdx = hasHeaders ? 1 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Preview CSV Data</h3>
        <p className="text-sm text-muted-foreground">Review your CSV before proceeding to column mapping</p>
      </div>

      {/* CSV Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Total Rows</p>
            <p className="text-2xl font-bold">{rawRows.length}</p>
            {hasHeaders && <p className="text-xs text-muted-foreground mt-1">(+1 header)</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Columns</p>
            <p className="text-2xl font-bold">{rawRows[0]?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Data Rows</p>
            <p className="text-2xl font-bold">{rawRows.length - (hasHeaders ? 1 : 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">File</p>
            <p className="text-sm font-medium truncate">{csvFileName}</p>
          </CardContent>
        </Card>
      </div>

      {/* Headers Detected */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
        <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-accent">
            {hasHeaders ? "✓ Headers detected automatically" : "⚠ No headers detected"}
          </p>
          {hasHeaders && (
            <p className="text-xs text-muted-foreground mt-1">
              First row will be used as column headers for mapping
            </p>
          )}
          {!hasHeaders && (
            <p className="text-xs text-muted-foreground mt-1">
              You'll map columns manually in the next step
            </p>
          )}
        </div>
      </div>

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Preview (First {Math.min(10, previewRows.length)} rows)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                {(hasHeaders ? rawRows[0] : rawRows[0]).map((header, idx) => (
                  <th key={idx} className="text-left p-2 font-semibold bg-muted">
                    {hasHeaders ? header : `Col ${idx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.slice(startIdx).map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b hover:bg-muted/50">
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className="p-2 text-muted-foreground truncate max-w-[200px]">
                      {cell || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rawRows.length > 10 && (
            <p className="text-xs text-muted-foreground mt-4">
              ... and {rawRows.length - 10} more rows
            </p>
          )}
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onNext}>Proceed to Column Mapping</Button>
        </div>
      </div>
    </div>
  );
}
