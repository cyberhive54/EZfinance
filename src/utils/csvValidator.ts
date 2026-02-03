import { ParsedCSVRow, HeaderMapping, ValidationError, HeaderField } from "@/types/bulkImport";
import { Account, Category } from "@/types/database";

export interface ValidationContext {
  accounts: Account[];
  categories: Category[];
  goalNames: string[];
}

/**
 * Validate a single row based on header mapping
 */
export function validateRow(
  row: ParsedCSVRow,
  mapping: HeaderMapping,
  context: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Extract mapped values
  const mappedValues = extractMappedValues(row, mapping);

  // Normalize and get transaction type
  let transactionType = mappedValues.type as "income" | "expense" | "transfer-sender" | "transfer-receiver" | undefined;
  if (transactionType && typeof transactionType === 'string') {
    const normalized = normalizeTransactionType(transactionType);
    if (!normalized) {
      errors.push({
        field: "type",
        message: `Invalid type: "${transactionType}". Must be: expense, income, or transfer`,
        rowValue: transactionType,
      });
      return errors;
    }
    transactionType = normalized as any;
  }

  // Validate date
  if (mappedValues.date !== undefined && mappedValues.date !== "") {
    const dateValue = String(mappedValues.date).trim();
    if (!isValidDate(dateValue)) {
      errors.push({
        field: "date",
        message: `Invalid date format. Expected YYYY-MM-DD, got: ${dateValue}`,
        rowValue: mappedValues.date,
      });
    } else if (isFutureDate(dateValue)) {
      errors.push({
        field: "date",
        message: `Date cannot be in the future: ${dateValue}`,
        rowValue: mappedValues.date,
      });
    }
  }

  // Validate amount
  if (mappedValues.amount !== undefined && mappedValues.amount !== "") {
    const amountValue = mappedValues.amount;
    const amount = parseFloat(String(amountValue));
    if (isNaN(amount) || amount <= 0) {
      errors.push({
        field: "amount",
        message: `Amount must be a positive number, got: ${amountValue}`,
        rowValue: amountValue,
      });
    } else {
      // Check decimal places (max 2)
      const decimalPlaces = String(amountValue).split('.')[1]?.length || 0;
      if (decimalPlaces > 2) {
        errors.push({
          field: "amount",
          message: `Amount can have maximum 2 decimal places, got: ${decimalPlaces}. Value: ${amountValue}`,
          rowValue: amountValue,
        });
      }
    }
  } else {
    errors.push({
      field: "amount",
      message: "Amount is required",
    });
  }

  // Validate type
  if (!transactionType) {
    errors.push({
      field: "type",
      message: "Transaction type is required (expense, income, or transfer)",
    });
  } else if (!["income", "expense", "transfer-sender", "transfer-receiver"].includes(transactionType)) {
    errors.push({
      field: "type",
      message: `Invalid type: ${transactionType}. Must be: income, expense, transfer-sender, or transfer-receiver`,
      rowValue: transactionType,
    });
  }

  // Validate account (for non-transfer transactions)
  if (transactionType && !transactionType.startsWith("transfer")) {
    if (mappedValues.account_id !== undefined && mappedValues.account_id !== "") {
      const accountInput = normalizeFieldName(String(mappedValues.account_id));
      // Try to find account by normalized name or ID
      const account = context.accounts.find((a) => 
        a.id === accountInput || normalizeFieldName(a.name) === accountInput
      );
      
      if (!account) {
        const suggestedAccounts = context.accounts.map((a) => a.name).join(", ");
        errors.push({
          field: "account_id",
          message: `Account "${accountInput}" not found. Available: ${suggestedAccounts}`,
          rowValue: accountInput,
        });
      }
    } else {
      errors.push({
        field: "account_id",
        message: "Account is required for income/expense transactions",
      });
    }
  }

  // Validate transfer accounts
  if (transactionType?.startsWith("transfer")) {
    // Validate from_account
    if (mappedValues.from_account !== undefined && mappedValues.from_account !== "") {
      const fromInput = normalizeFieldName(String(mappedValues.from_account));
      const fromAccount = context.accounts.find((a) => 
        a.id === fromInput || normalizeFieldName(a.name) === fromInput
      );
      if (!fromAccount) {
        errors.push({
          field: "from_account",
          message: `From account "${fromInput}" not found`,
          rowValue: fromInput,
        });
      }
    } else {
      errors.push({
        field: "from_account",
        message: "From account is required for transfer transactions",
      });
    }

    // Validate to_account
    if (mappedValues.to_account !== undefined && mappedValues.to_account !== "") {
      const toInput = normalizeFieldName(String(mappedValues.to_account));
      const toAccount = context.accounts.find((a) => 
        a.id === toInput || normalizeFieldName(a.name) === toInput
      );
      if (!toAccount) {
        errors.push({
          field: "to_account",
          message: `To account "${toInput}" not found`,
          rowValue: toInput,
        });
      }
    } else {
      errors.push({
        field: "to_account",
        message: "To account is required for transfer transactions",
      });
    }

    // Validate from != to
    if (mappedValues.from_account && mappedValues.to_account) {
      const fromNorm = normalizeFieldName(String(mappedValues.from_account));
      const toNorm = normalizeFieldName(String(mappedValues.to_account));
      if (fromNorm === toNorm) {
        errors.push({
          field: "to_account",
          message: "From account cannot be the same as to account",
          rowValue: toNorm,
        });
      }
    }
  }

  // Validate category (optional but if provided, must exist)
  if (mappedValues.category !== undefined && mappedValues.category !== "") {
    const categoryValue = String(mappedValues.category).trim();
    if (!context.categories.some((c) => c.name.toLowerCase() === categoryValue.toLowerCase())) {
      const suggestedCategories = context.categories
        .filter((c) => c.type === transactionType?.includes("income") ? "income" : "expense")
        .map((c) => c.name)
        .join(", ");
      errors.push({
        field: "category",
        message: `Category "${categoryValue}" not found. Available: ${suggestedCategories}`,
        rowValue: categoryValue,
      });
    }
  }

  // Validate goal (if provided, must exist)
  if (mappedValues.goal_name !== undefined && mappedValues.goal_name !== "") {
    const goalInput = normalizeFieldName(String(mappedValues.goal_name));
    const goalExists = context.goalNames.some((g) => 
      normalizeFieldName(g) === goalInput
    );
    if (!goalExists) {
      errors.push({
        field: "goal_name",
        message: `Goal "${goalInput}" does not exist. Please create the goal first.`,
        rowValue: goalInput,
      });
    }
  }

  // Validate deduction_type (only valid if goal_name is provided)
  if (mappedValues.deduction_type !== undefined && mappedValues.deduction_type !== "") {
    const deductionType = String(mappedValues.deduction_type).trim().toLowerCase();
    if (!["full", "split"].includes(deductionType)) {
      errors.push({
        field: "deduction_type",
        message: `Invalid deduction type: ${deductionType}. Must be "full" or "split"`,
        rowValue: deductionType,
      });
    }

    // Deduction type requires goal_name
    if (!mappedValues.goal_name) {
      errors.push({
        field: "deduction_type",
        message: "Deduction type can only be specified when goal_name is provided",
      });
    }
  }

  // Validate frequency (optional, case-insensitive exact match)
  if (mappedValues.frequency !== undefined && mappedValues.frequency !== "") {
    const frequency = String(mappedValues.frequency).trim().toLowerCase();
    if (!["daily", "weekly", "monthly", "yearly"].includes(frequency)) {
      errors.push({
        field: "frequency",
        message: `Invalid frequency: "${frequency}". Must be exactly: daily, weekly, monthly, or yearly (case-insensitive)`,
        rowValue: frequency,
      });
    }
  }

  // Validate goal_name and deduction_type relationship
  if (mappedValues.deduction_type && !mappedValues.goal_name) {
    errors.push({
      field: "deduction_type",
      message: "Deduction type cannot be present without a goal name",
      rowValue: mappedValues.deduction_type,
    });
  }

  if (mappedValues.goal_name && !mappedValues.deduction_type) {
    errors.push({
      field: "goal_name",
      message: "Goal name cannot be present without a deduction type",
      rowValue: mappedValues.goal_name,
    });
  }

  if (mappedValues.goal_name && mappedValues.deduction_type) {
    const deductionType = String(mappedValues.deduction_type).trim().toLowerCase();
    // If split type, validate split_amount
    if (deductionType === "split") {
      if (mappedValues.split_amount !== undefined && mappedValues.split_amount !== "") {
        const splitAmount = parseFloat(String(mappedValues.split_amount));
        if (isNaN(splitAmount) || splitAmount <= 0) {
          errors.push({
            field: "split_amount",
            message: `Split amount must be a positive number, got: ${mappedValues.split_amount}`,
            rowValue: mappedValues.split_amount,
          });
        } else {
          // Check decimal places
          const decimalPlaces = String(mappedValues.split_amount).split('.')[1]?.length || 0;
          if (decimalPlaces > 2) {
            errors.push({
              field: "split_amount",
              message: `Split amount can have maximum 2 decimal places, got: ${decimalPlaces}. Value: ${mappedValues.split_amount}`,
              rowValue: mappedValues.split_amount,
            });
          }
        }
      } else {
        errors.push({
          field: "split_amount",
          message: "Split amount is required when deduction type is 'split'",
        });
      }
    }
  }

  return errors;
}

/**
 * Extract values from row based on header mapping
 */
function extractMappedValues(row: ParsedCSVRow, mapping: HeaderMapping) {
  const mapped: Partial<Record<HeaderField, any>> = {};

  Object.entries(mapping).forEach(([csvColumn, field]) => {
    if (field !== "skip" && row[csvColumn] !== undefined && row[csvColumn] !== "") {
      const value = row[csvColumn];

      if (field === "amount") {
        mapped[field] = parseFloat(String(value));
      } else if (field === "date") {
        mapped[field] = String(value).trim();
      } else {
        mapped[field] = String(value).trim();
      }
    }
  });

  return mapped;
}

/**
 * Check if string is valid date - supports multiple formats
 * Supports: YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD, DD-MM-YYYY, DD/MM/YYYY, DDMMYYYY
 */
function isValidDate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const cleanStr = dateString.trim();
  
  // Try various date formats
  const dateFormats = [
    // YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD
    { regex: /^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/, order: [1, 2, 3] },
    // DD-MM-YYYY, DD/MM/YYYY, DDMMYYYY
    { regex: /^(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/, order: [3, 2, 1] },
  ];

  for (const format of dateFormats) {
    const match = cleanStr.match(format.regex);
    if (match) {
      const year = parseInt(match[format.order[0]]);
      const month = parseInt(match[format.order[1]]);
      const day = parseInt(match[format.order[2]]);

      const date = new Date(year, month - 1, day);
      
      // Validate date is real (e.g., Feb 30 is not valid)
      if (date.getFullYear() === year && 
          date.getMonth() === month - 1 && 
          date.getDate() === day) {
        // Don't allow future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date <= today) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Parse date in multiple formats and return Date object
 */
export function parseCustomDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const cleanStr = dateString.trim();
  
  const dateFormats = [
    { regex: /^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/, order: [1, 2, 3] },
    { regex: /^(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/, order: [3, 2, 1] },
  ];

  for (const format of dateFormats) {
    const match = cleanStr.match(format.regex);
    if (match) {
      const year = parseInt(match[format.order[0]]);
      const month = parseInt(match[format.order[1]]);
      const day = parseInt(match[format.order[2]]);
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

/**
 * Check if date is in the future
 */
function isFutureDate(dateString: string): boolean {
  const date = parseCustomDate(dateString);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Normalize transaction type - case insensitive, spaces to underscores
 * Examples: "expense" → "expense", "EXPENSE" → "expense", "Bank Transfer" → "transfer-sender"
 */
export function normalizeTransactionType(typeStr: string): string | null {
  if (!typeStr) return null;
  
  const cleaned = typeStr.trim().toUpperCase().replace(/\s+/g, "_");
  
  // Map common variations
  const typeMap: Record<string, string> = {
    "EXPENSE": "expense",
    "INCOME": "income",
    "TRANSFER": "transfer-sender", // Default transfer to sender
    "TRANSFER_SENDER": "transfer-sender",
    "TRANSFER_RECEIVER": "transfer-receiver",
    "TRANSFER-SENDER": "transfer-sender",
    "TRANSFER-RECEIVER": "transfer-receiver",
    "BANK_TRANSFER": "transfer-sender",
    "MONEY_TRANSFER": "transfer-sender",
  };
  
  return typeMap[cleaned] || null;
}

/**
 * Normalize field names - spaces to underscores, lowercase
 */
export function normalizeFieldName(fieldStr: string): string {
  if (!fieldStr) return "";
  return fieldStr.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Validate header mapping completeness
 * Mandatory fields: type, amount, and account/transfer fields based on type
 */
export function validateMappingCompleteness(
  mapping: HeaderMapping
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one data column is mapped
  const mappedFields = Object.values(mapping).filter((f) => f !== "skip");
  if (mappedFields.length === 0) {
    errors.push("At least one column must be mapped");
  }

  // Check mandatory fields
  const hasAmount = mappedFields.includes("amount");
  const hasType = mappedFields.includes("type");
  const hasDate = mappedFields.includes("date");
  const hasAccount = mappedFields.includes("account_id");
  const hasTransferFrom = mappedFields.includes("from_account");
  const hasTransferTo = mappedFields.includes("to_account");

  if (!hasAmount) errors.push("Amount is mandatory - must map a column to 'Amount'");
  if (!hasType) errors.push("Type is mandatory - must map a column to 'Type'");
  if (!hasDate) errors.push("Date is mandatory - must map a column to 'Date'");
  
  // Account requirement will be validated based on type during row validation
  // We can't enforce it here since we don't know the type until we process rows

  return {
    valid: errors.length === 0,
    errors,
  };
}
