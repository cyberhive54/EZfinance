import { useCallback, useReducer } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BulkImportRow,
  ColumnMapping,
  parseCSV,
  detectHeaders,
  autoDetectMapping,
  findMatchingAccount,
  findMatchingCategory,
  formatDateForDB,
} from "@/utils/bulkImport";
import { validateImportRow, autoCorrectRow } from "@/utils/bulkImportValidator";

export type ImportStep = "source" | "preview" | "mapping" | "validation" | "success";

export interface BulkImportState {
  step: ImportStep;
  csvText: string;
  csvFileName: string;
  rawRows: string[][];
  parsedRows: BulkImportRow[];
  columnMapping: ColumnMapping;
  hasHeaders: boolean;
  isLoading: boolean;
  error: string | null;
}

type BulkImportAction =
  | { type: "SET_STEP"; payload: ImportStep }
  | { type: "SET_CSV"; payload: { text: string; fileName: string } }
  | { type: "SET_RAW_ROWS"; payload: string[][] }
  | { type: "SET_PARSED_ROWS"; payload: BulkImportRow[] }
  | { type: "SET_COLUMN_MAPPING"; payload: ColumnMapping }
  | { type: "SET_HAS_HEADERS"; payload: boolean }
  | { type: "UPDATE_ROW"; payload: { index: number; row: BulkImportRow } }
  | { type: "TOGGLE_ROW_CHECKED"; payload: number }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

const initialState: BulkImportState = {
  step: "source",
  csvText: "",
  csvFileName: "",
  rawRows: [],
  parsedRows: [],
  columnMapping: {},
  hasHeaders: false,
  isLoading: false,
  error: null,
};

function bulkImportReducer(state: BulkImportState, action: BulkImportAction): BulkImportState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_CSV":
      return { ...state, csvText: action.payload.text, csvFileName: action.payload.fileName };
    case "SET_RAW_ROWS":
      return { ...state, rawRows: action.payload };
    case "SET_PARSED_ROWS":
      return { ...state, parsedRows: action.payload };
    case "SET_COLUMN_MAPPING":
      return { ...state, columnMapping: action.payload };
    case "SET_HAS_HEADERS":
      return { ...state, hasHeaders: action.payload };
    case "UPDATE_ROW":
      return {
        ...state,
        parsedRows: state.parsedRows.map((row, idx) =>
          idx === action.payload.index ? action.payload.row : row
        ),
      };
    case "TOGGLE_ROW_CHECKED":
      return {
        ...state,
        parsedRows: state.parsedRows.map((row, idx) =>
          idx === action.payload ? { ...row, isChecked: !row.isChecked } : row
        ),
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useBulkImport() {
  const [state, dispatch] = useReducer(bulkImportReducer, initialState);
  const { toast } = useToast();
  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { user } = useAuth();

  const setStep = useCallback((step: ImportStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const setCSV = useCallback((text: string, fileName: string = "") => {
    dispatch({ type: "SET_CSV", payload: { text, fileName } });
  }, []);

  const parseCSVFile = useCallback((csvText: string) => {
    try {
      dispatch({ type: "SET_ERROR", payload: null });
      const rows = parseCSV(csvText);
      if (rows.length === 0) throw new Error("CSV is empty");
      dispatch({ type: "SET_RAW_ROWS", payload: rows });
      
      const detected = detectHeaders(rows);
      dispatch({ type: "SET_HAS_HEADERS", payload: detected });
      
      return rows;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse CSV";
      dispatch({ type: "SET_ERROR", payload: message });
      toast({ title: "CSV Parse Error", description: message, variant: "destructive" });
      return null;
    }
  }, [toast]);

  const parseRowsWithMapping = useCallback(
    (rows: string[][], mapping: ColumnMapping, startIndex: number = state.hasHeaders ? 1 : 0) => {
      try {
        const parsed: BulkImportRow[] = [];

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          const parsedRow: BulkImportRow = {
            index: i - startIndex,
            type: "",
            title: "",
            amount: "",
            transactionDate: "",
            account: "",
            category: "",
            fromAccount: "",
            toAccount: "",
            frequency: "none",
            notes: "",
            rawData: {},
            errors: [],
            isValid: false,
            isChecked: true,
          };

          // Map columns
          row.forEach((cell, idx) => {
            const fieldName = mapping[idx];
            if (fieldName) {
              const camelCaseField = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
              (parsedRow as any)[camelCaseField] = cell || "";
              parsedRow.rawData[fieldName] = cell;
            }
          });

          // Auto-correct values
          const corrected = autoCorrectRow(parsedRow, accounts, categories);
          
          // Validate
          const errors = validateImportRow(corrected, accounts, categories);
          corrected.errors = errors.map(e => `${e.field}: ${e.message}`);
          corrected.isValid = errors.length === 0;

          parsed.push(corrected);
        }

        dispatch({ type: "SET_PARSED_ROWS", payload: parsed });
        return parsed;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to parse rows";
        dispatch({ type: "SET_ERROR", payload: message });
        return [];
      }
    },
    [accounts, categories, state.hasHeaders]
  );

  const setColumnMapping = useCallback((mapping: ColumnMapping) => {
    dispatch({ type: "SET_COLUMN_MAPPING", payload: mapping });
  }, []);

  const autoDetectAndMapColumns = useCallback(() => {
    if (state.rawRows.length === 0) return;

    const headers = state.hasHeaders ? state.rawRows[0] : [];
    const mapping = autoDetectMapping(headers);
    dispatch({ type: "SET_COLUMN_MAPPING", payload: mapping });
    return mapping;
  }, [state.rawRows, state.hasHeaders]);

  const updateRow = useCallback((index: number, row: BulkImportRow) => {
    dispatch({ type: "UPDATE_ROW", payload: { index, row } });
  }, []);

  const toggleRowChecked = useCallback((index: number) => {
    dispatch({ type: "TOGGLE_ROW_CHECKED", payload: index });
  }, []);

  const importTransactionsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const checkedRows = state.parsedRows.filter(r => r.isChecked && r.isValid);
        if (checkedRows.length === 0) throw new Error("No valid transactions to import");

        let successCount = 0;
        let failedCount = 0;
        const failedRows = [];

        // Create account map for lookups
        const accountMap = new Map(accounts.map(a => [a.name, a.id]));
        const categoryMap = new Map(categories.map(c => [`${c.type}_${c.name}`, c.id]));

        for (const row of checkedRows) {
          try {
            const typeNorm = row.type.toLowerCase();
            
            if (typeNorm === "transfer") {
              // Handle transfer
              let fromAcc = row.fromAccount;
              let toAcc = row.toAccount;

              // If one is empty, use primary account (first account in list)
              if (!fromAcc && toAcc) {
                fromAcc = accounts[0]?.name;
              }
              if (!toAcc && fromAcc) {
                toAcc = accounts[0]?.name;
              }

              if (!fromAcc || !toAcc) {
                throw new Error("Transfer requires both from and to accounts");
              }

              const fromAccountId = accountMap.get(fromAcc);
              const toAccountId = accountMap.get(toAcc);

              if (!fromAccountId || !toAccountId) {
                throw new Error(`Account not found: ${fromAcc} or ${toAcc}`);
              }

              // Create two transactions: one debit, one credit
              const formattedDate = formatDateForDB(row.transactionDate);
              if (!formattedDate) throw new Error(`Invalid date: ${row.transactionDate}`);

              // Debit from source account
              await createTransaction({
                type: "expense",
                amount: parseFloat(row.amount),
                account_id: fromAccountId,
                category_id: null,
                description: row.title || `Transfer to ${toAcc}`,
                notes: row.notes,
                transaction_date: formattedDate,
                frequency: row.frequency || "none",
              });

              // Credit to target account
              await createTransaction({
                type: "income",
                amount: parseFloat(row.amount),
                account_id: toAccountId,
                category_id: null,
                description: row.title || `Transfer from ${fromAcc}`,
                notes: row.notes,
                transaction_date: formattedDate,
                frequency: row.frequency || "none",
              });

              successCount += 2;
            } else {
              // Handle income/expense
              const accountId = accountMap.get(row.account);
              const categoryId = categoryMap.get(`${typeNorm}_${row.category}`);

              if (!accountId) throw new Error(`Account not found: ${row.account}`);
              if (!categoryId) throw new Error(`Category not found: ${row.category}`);

              const formattedDate = formatDateForDB(row.transactionDate);
              if (!formattedDate) throw new Error(`Invalid date: ${row.transactionDate}`);

              await createTransaction({
                type: typeNorm as "income" | "expense",
                amount: parseFloat(row.amount),
                account_id: accountId,
                category_id: categoryId,
                description: row.title,
                notes: row.notes,
                transaction_date: formattedDate,
                frequency: row.frequency || "none",
              });

              successCount++;
            }
          } catch (error) {
            failedCount++;
            failedRows.push({
              rowIndex: row.index + 1,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        dispatch({ type: "SET_LOADING", payload: false });

        return {
          successCount,
          failedCount,
          failedRows,
          totalImported: successCount,
        };
      } catch (error) {
        dispatch({ type: "SET_LOADING", payload: false });
        throw error;
      }
    },
    onSuccess: (result) => {
      toast({
        title: "Import Complete",
        description: `${result.successCount} transactions imported successfully${
          result.failedCount > 0 ? `, ${result.failedCount} failed` : ""
        }`,
      });
      dispatch({ type: "RESET" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Import failed";
      toast({
        title: "Import Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    // State
    state,
    
    // Step management
    setStep,
    
    // CSV operations
    setCSV,
    parseCSVFile,
    parseRowsWithMapping,
    autoDetectAndMapColumns,
    
    // Mapping
    setColumnMapping,
    columnMapping: state.columnMapping,
    
    // Row operations
    updateRow,
    toggleRowChecked,
    
    // Import
    importTransactions: importTransactionsMutation.mutate,
    isImporting: importTransactionsMutation.isPending,
    
    // Reset
    reset,
  };
}
