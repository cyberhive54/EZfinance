import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { BulkImportRow } from "@/utils/bulkImport";
import { Account, Category } from "@/types/database";

interface BulkImportStep4ValidationProps {
  rows: BulkImportRow[];
  accounts: Account[];
  categories: Category[];
  onRowUpdate: (index: number, row: BulkImportRow) => void;
  onRowToggle: (index: number) => void;
  onBack: () => void;
  onImport: () => void;
  onCancel: () => void;
  isImporting?: boolean;
}

export function BulkImportStep4Validation({
  rows,
  accounts,
  categories,
  onRowUpdate,
  onRowToggle,
  onBack,
  onImport,
  onCancel,
  isImporting = false,
}: BulkImportStep4ValidationProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());

  const validRows = rows.filter(r => r.isValid).length;
  const errorRows = rows.filter(r => !r.isValid).length;
  const checkedRows = rows.filter(r => r.isChecked).length;

  const toggleRowExpanded = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const toggleRowEditing = (index: number) => {
    const newEditing = new Set(editingRows);
    if (newEditing.has(index)) {
      newEditing.delete(index);
    } else {
      newEditing.add(index);
    }
    setEditingRows(newEditing);
  };

  const handleFieldChange = (rowIndex: number, field: string, value: string) => {
    const row = { ...rows[rowIndex] };
    (row as any)[field] = value;
    onRowUpdate(rowIndex, row);
  };

  const incomeCategories = categories.filter(c => c.type === "income");
  const expenseCategories = categories.filter(c => c.type === "expense");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review & Import Transactions</h3>
        <p className="text-sm text-muted-foreground">
          {errorRows === 0
            ? "All transactions are valid and ready to import!"
            : `Fix the ${errorRows} transaction(s) with errors before importing`}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Valid</p>
            <p className="text-2xl font-bold text-accent">{validRows}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Errors</p>
            <p className="text-2xl font-bold text-destructive">{errorRows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Selected</p>
            <p className="text-2xl font-bold">{checkedRows}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      {errorRows > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {errorRows} transaction{errorRows > 1 ? "s have" : " has"} validation error{errorRows > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click on error rows to expand and edit fields inline
            </p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                {/* Row Header */}
                <div
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    row.isValid
                      ? "bg-accent/5 hover:bg-accent/10"
                      : "bg-destructive/5 hover:bg-destructive/10"
                  }`}
                  onClick={() => row.errors.length > 0 && toggleRowExpanded(idx)}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={row.isChecked}
                    onCheckedChange={() => onRowToggle(idx)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Status Icon */}
                  {row.isValid ? (
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  )}

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {row.type || "—"}
                      </Badge>
                      <span className="font-medium truncate">
                        {row.title || row.description || "Untitled"}
                      </span>
                      <span className="text-muted-foreground">
                        {row.amount ? `$${parseFloat(row.amount).toFixed(2)}` : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.account && `Account: ${row.account}`}
                      {row.fromAccount && ` | From: ${row.fromAccount}`}
                      {row.toAccount && ` | To: ${row.toAccount}`}
                      {row.transactionDate && ` | ${row.transactionDate}`}
                    </div>
                  </div>

                  {/* Expand Button */}
                  {row.errors.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowExpanded(idx);
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {expandedRows.has(idx) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Error Details & Inline Editing */}
                {expandedRows.has(idx) && row.errors.length > 0 && (
                  <div className="border-t bg-muted/50 p-4 space-y-4">
                    {/* Error List */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Errors:</p>
                      {row.errors.map((error, errIdx) => (
                        <div key={errIdx} className="text-xs text-destructive p-2 bg-background rounded border border-destructive/20">
                          {error}
                        </div>
                      ))}
                    </div>

                    {/* Edit Fields */}
                    {editingRows.has(idx) ? (
                      <div className="space-y-3 border-t pt-4">
                        <p className="text-sm font-medium">Edit Fields:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium">Type *</label>
                            <Select
                              value={row.type}
                              onValueChange={(v) => handleFieldChange(idx, "type", v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="income">INCOME</SelectItem>
                                <SelectItem value="expense">EXPENSE</SelectItem>
                                <SelectItem value="transfer">TRANSFER</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-xs font-medium">Amount *</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => handleFieldChange(idx, "amount", e.target.value)}
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium">Date *</label>
                            <Input
                              type="text"
                              value={row.transactionDate}
                              onChange={(e) => handleFieldChange(idx, "transactionDate", e.target.value)}
                              placeholder="YYYY-MM-DD"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium">Title</label>
                            <Input
                              value={row.title}
                              onChange={(e) => handleFieldChange(idx, "title", e.target.value)}
                              placeholder="Description"
                            />
                          </div>

                          {row.type.toLowerCase() !== "transfer" && (
                            <>
                              <div>
                                <label className="text-xs font-medium">Account *</label>
                                <Select
                                  value={row.account}
                                  onValueChange={(v) => handleFieldChange(idx, "account", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {accounts.map((acc) => (
                                      <SelectItem key={acc.id} value={acc.name}>
                                        {acc.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-xs font-medium">Category *</label>
                                <Select
                                  value={row.category}
                                  onValueChange={(v) => handleFieldChange(idx, "category", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(row.type.toLowerCase() === "income"
                                      ? incomeCategories
                                      : expenseCategories
                                    ).map((cat) => (
                                      <SelectItem key={cat.id} value={cat.name}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}

                          {row.type.toLowerCase() === "transfer" && (
                            <>
                              <div>
                                <label className="text-xs font-medium">From Account</label>
                                <Select
                                  value={row.fromAccount}
                                  onValueChange={(v) => handleFieldChange(idx, "fromAccount", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {accounts.map((acc) => (
                                      <SelectItem key={acc.id} value={acc.name}>
                                        {acc.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-xs font-medium">To Account</label>
                                <Select
                                  value={row.toAccount}
                                  onValueChange={(v) => handleFieldChange(idx, "toAccount", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {accounts.map((acc) => (
                                      <SelectItem key={acc.id} value={acc.name}>
                                        {acc.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}

                          <div className="md:col-span-2">
                            <label className="text-xs font-medium">Notes</label>
                            <Input
                              value={row.notes}
                              onChange={(e) => handleFieldChange(idx, "notes", e.target.value)}
                              placeholder="Optional notes"
                            />
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRowEditing(idx)}
                          className="w-full"
                        >
                          Done Editing
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleRowEditing(idx)}
                        className="w-full"
                      >
                        Edit Row
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={onImport}
            disabled={checkedRows === 0 || errorRows > 0 || isImporting}
          >
            {isImporting ? "Importing..." : `Import ${checkedRows} Transaction${checkedRows !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
