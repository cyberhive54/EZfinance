export type HeaderField = 
  | "date"
  | "account_id"
  | "from_account"
  | "to_account"
  | "type"
  | "category"
  | "amount"
  | "description"
  | "notes"
  | "goal_name"
  | "deduction_type"
  | "split_amount"
  | "contribute_to_goal"
  | "frequency"
  | "skip";

export interface HeaderMapping {
  [csvColumnName: string]: HeaderField;
}

export interface ParsedCSVRow {
  [key: string]: string | number;
}

export interface ValidationError {
  field: HeaderField;
  message: string;
  rowValue?: string | number;
}

export interface BulkImportRow {
  rowIndex: number;
  originalData: ParsedCSVRow;
  mappedData: Partial<{
    date: string;
    account_id: string;
    from_account: string;
    to_account: string;
    type: "income" | "expense" | "transfer-sender" | "transfer-receiver";
    category: string;
    amount: number;
    description: string;
    notes: string;
    goal_name: string;
    deduction_type: "full" | "split";
    split_amount: number;
    contribute_to_goal: number;
    frequency: string;
  }>;
  errors: ValidationError[];
  isSelected: boolean;
}

export interface BulkImportSummary {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: { rowIndex: number; message: string }[];
}
