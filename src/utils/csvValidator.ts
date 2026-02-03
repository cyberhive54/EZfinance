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

  // Get transaction type
  const transactionType = mappedValues.type as "income" | "expense" | "transfer-sender" | "transfer-receiver" | undefined;

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
      const accountId = String(mappedValues.account_id).trim();
      if (!context.accounts.some((a) => a.id === accountId)) {
        const suggestedAccounts = context.accounts.map((a) => a.name).join(", ");
        errors.push({
          field: "account_id",
          message: `Account "${accountId}" not found. Available: ${suggestedAccounts}`,
          rowValue: accountId,
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
      const fromAccount = String(mappedValues.from_account).trim();
      if (!context.accounts.some((a) => a.id === fromAccount)) {
        errors.push({
          field: "from_account",
          message: `From account "${fromAccount}" not found`,
          rowValue: fromAccount,
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
      const toAccount = String(mappedValues.to_account).trim();
      if (!context.accounts.some((a) => a.id === toAccount)) {
        errors.push({
          field: "to_account",
          message: `To account "${toAccount}" not found`,
          rowValue: toAccount,
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
      if (mappedValues.from_account === mappedValues.to_account) {
        errors.push({
          field: "to_account",
          message: "From account cannot be the same as to account",
          rowValue: mappedValues.to_account,
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
    const goalName = String(mappedValues.goal_name).trim();
    if (!context.goalNames.includes(goalName)) {
      errors.push({
        field: "goal_name",
        message: `Goal "${goalName}" does not exist. Please create the goal first.`,
        rowValue: goalName,
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

  // Validate frequency (optional)
  if (mappedValues.frequency !== undefined && mappedValues.frequency !== "") {
    const frequency = String(mappedValues.frequency).trim().toLowerCase();
    if (!["none", "daily", "weekly", "monthly", "yearly"].includes(frequency)) {
      errors.push({
        field: "frequency",
        message: `Invalid frequency: ${frequency}. Must be: none, daily, weekly, monthly, or yearly`,
        rowValue: frequency,
      });
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
 * Check if string is valid date in YYYY-MM-DD format
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Check if date is in the future
 */
function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Validate header mapping completeness
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

  // Check required fields
  const hasAmount = mappedFields.includes("amount");
  const hasType = mappedFields.includes("type");

  if (!hasAmount) errors.push("Amount column must be mapped");
  if (!hasType) errors.push("Type column must be mapped");

  return {
    valid: errors.length === 0,
    errors,
  };
}
