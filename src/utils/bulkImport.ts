import { Account, Category } from "@/types/database";

export interface ParsedCSVRow {
  [key: string]: string | number | null;
}

export interface BulkImportRow {
  index: number;
  type: string;
  title: string;
  amount: string;
  transactionDate: string;
  account: string;
  category: string;
  fromAccount: string;
  toAccount: string;
  frequency: string;
  notes: string;
  rawData: ParsedCSVRow;
  errors: string[];
  isValid: boolean;
  isChecked: boolean;
}

export interface ColumnMapping {
  [csvIndex: number]: string; // maps CSV column index to field name
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_FREQUENCIES = ["none", "daily", "weekly", "monthly", "yearly"];
const VALID_TYPES = ["income", "expense", "transfer"];

/**
 * Parse CSV string into 2D array
 */
export function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split("\n").filter(line => line.trim());
  if (lines.length === 0) throw new Error("CSV is empty");

  return lines.map(line => {
    const fields: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

/**
 * Detect if first row is headers
 */
export function detectHeaders(rows: string[][]): boolean {
  if (rows.length === 0) return false;
  
  const firstRow = rows[0];
  const headerKeywords = [
    "type", "title", "amount", "date", "account", "category", 
    "frequency", "notes", "from", "to", "description"
  ];

  const matchCount = firstRow.filter(cell => 
    headerKeywords.some(keyword => 
      cell.toLowerCase().includes(keyword)
    )
  ).length;

  return matchCount >= firstRow.length * 0.5; // At least 50% look like headers
}

/**
 * Auto-detect column mapping
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const fieldKeywords: { [key: string]: string[] } = {
    type: ["type"],
    title: ["title", "description", "name", "subject"],
    amount: ["amount", "value", "sum", "total"],
    transactionDate: ["date", "transaction date", "transaction_date", "posted"],
    account: ["account", "from account", "from_account"],
    category: ["category", "cat"],
    fromAccount: ["from account", "from_account", "source account"],
    toAccount: ["to account", "to_account", "target account", "destination"],
    frequency: ["frequency", "recurring", "freq"],
    notes: ["notes", "memo", "comments", "description"],
  };

  headers.forEach((header, idx) => {
    const lowerHeader = header.toLowerCase().trim();
    for (const [field, keywords] of Object.entries(fieldKeywords)) {
      if (keywords.some(kw => lowerHeader.includes(kw))) {
        mapping[idx] = field;
        break;
      }
    }
  });

  return mapping;
}

/**
 * Normalize account/category names
 */
export function normalizeField(value: string, type: "account" | "category"): string {
  if (!value || value.trim() === "") return "";
  
  // First, replace spaces with underscores
  let normalized = value.trim().replace(/\s+/g, "_");
  
  // For single-word fields, convert to UPPERCASE
  if (!normalized.includes("_")) {
    normalized = normalized.toUpperCase();
  } else {
    // For multi-word fields, keep case but ensure underscores
    normalized = normalized;
  }
  
  return normalized;
}

/**
 * Match account by name (case-insensitive with underscore handling)
 */
export function findMatchingAccount(
  accountName: string,
  accounts: Account[]
): Account | null {
  if (!accountName || accountName.trim() === "") return null;
  
  const normalized = normalizeField(accountName, "account");
  
  return accounts.find(acc => 
    normalizeField(acc.name, "account") === normalized
  ) || null;
}

/**
 * Match category by name (case-insensitive with underscore handling)
 */
export function findMatchingCategory(
  categoryName: string,
  categories: Category[],
  transactionType: string
): Category | null {
  if (!categoryName || categoryName.trim() === "") return null;
  
  const normalized = normalizeField(categoryName, "category");
  const typeFilter = transactionType.toLowerCase() as "income" | "expense";
  
  return categories.find(cat => 
    normalizeField(cat.name, "category") === normalized &&
    cat.type === typeFilter
  ) || null;
}

/**
 * Parse date in multiple formats
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;

  const str = dateStr.trim();
  
  // Try YYYY-MM-DD
  let match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (!isNaN(date.getTime())) return date;
  }

  // Try MM-DD-YYYY
  match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
    if (!isNaN(date.getTime())) return date;
  }

  // Try DDMMYYYY (no separators)
  match = str.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    const date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    if (!isNaN(date.getTime())) return date;
  }

  // Try YYYYMMDD (no separators)
  match = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) {
    const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Validate amount is positive number
 */
export function isValidAmount(value: string | number): boolean {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  return !isNaN(amount) && amount > 0;
}

/**
 * Check for duplicate transaction
 */
export function isDuplicateTransaction(
  row: BulkImportRow,
  existingTransactions: any[],
  accountMap: Map<string, string>
): boolean {
  if (!row.transactionDate || !row.amount || !row.account) {
    return false;
  }

  const rowDate = parseDate(row.transactionDate);
  if (!rowDate) return false;

  const accountId = accountMap.get(normalizeField(row.account, "account"));
  if (!accountId) return false;

  return existingTransactions.some(tx => {
    const txDate = new Date(tx.transaction_date);
    return (
      tx.amount === parseFloat(row.amount) &&
      tx.account_id === accountId &&
      txDate.toDateString() === rowDate.toDateString()
    );
  });
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateForDB(dateStr: string): string | null {
  const date = parseDate(dateStr);
  if (!date) return null;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}
