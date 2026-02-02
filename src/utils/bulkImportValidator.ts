import { BulkImportRow, normalizeField, parseDate, isValidAmount, formatDateForDB, findMatchingAccount, findMatchingCategory } from "./bulkImport";
import { Account, Category } from "@/types/database";

const VALID_FREQUENCIES = ["none", "daily", "weekly", "monthly", "yearly"];

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a single import row
 */
export function validateImportRow(
  row: BulkImportRow,
  accounts: Account[],
  categories: Category[],
  existingTransactions: any[] = []
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Type validation
  if (!row.type || row.type.trim() === "") {
    errors.push({ field: "type", message: "Type is required" });
  } else {
    const typeNorm = row.type.toLowerCase().trim();
    if (!["income", "expense", "transfer"].includes(typeNorm)) {
      errors.push({ 
        field: "type", 
        message: `Invalid type. Must be INCOME, EXPENSE, or TRANSFER. Got: ${row.type}` 
      });
    }
  }

  // Amount validation
  if (!row.amount || row.amount.trim() === "") {
    errors.push({ field: "amount", message: "Amount is required" });
  } else if (!isValidAmount(row.amount)) {
    errors.push({ 
      field: "amount", 
      message: `Invalid amount. Must be a positive number. Got: ${row.amount}` 
    });
  }

  // Transaction Date validation
  if (!row.transactionDate || row.transactionDate.trim() === "") {
    errors.push({ field: "transactionDate", message: "Transaction Date is required" });
  } else if (!parseDate(row.transactionDate)) {
    errors.push({ 
      field: "transactionDate", 
      message: `Invalid date format. Use YYYY-MM-DD or MM-DD-YYYY. Got: ${row.transactionDate}` 
    });
  }

  // Type-specific validation
  const typeNorm = row.type?.toLowerCase().trim();

  if (typeNorm === "transfer") {
    // For transfer: at least one account required
    if ((!row.fromAccount || row.fromAccount.trim() === "") && 
        (!row.toAccount || row.toAccount.trim() === "")) {
      errors.push({ 
        field: "fromAccount/toAccount", 
        message: "For TRANSFER: At least one of From Account or To Account is required" 
      });
    }

    // Validate From Account if provided
    if (row.fromAccount && row.fromAccount.trim() !== "") {
      const fromAcc = findMatchingAccount(row.fromAccount, accounts);
      if (!fromAcc) {
        errors.push({ 
          field: "fromAccount", 
          message: `From Account not found: "${row.fromAccount}". Available: ${accounts.map(a => a.name).join(", ")}` 
        });
      }
    }

    // Validate To Account if provided
    if (row.toAccount && row.toAccount.trim() !== "") {
      const toAcc = findMatchingAccount(row.toAccount, accounts);
      if (!toAcc) {
        errors.push({ 
          field: "toAccount", 
          message: `To Account not found: "${row.toAccount}". Available: ${accounts.map(a => a.name).join(", ")}` 
        });
      }
    }

    // Check that From and To are different
    if (row.fromAccount && row.toAccount && 
        normalizeField(row.fromAccount, "account") === normalizeField(row.toAccount, "account")) {
      errors.push({ 
        field: "fromAccount/toAccount", 
        message: "From Account and To Account must be different" 
      });
    }

    // No category for transfers
    if (row.category && row.category.trim() !== "") {
      errors.push({ 
        field: "category", 
        message: "Category should be empty for TRANSFER transactions" 
      });
    }
  } else if (typeNorm === "income" || typeNorm === "expense") {
    // For income/expense: account is required
    if (!row.account || row.account.trim() === "") {
      errors.push({ 
        field: "account", 
        message: `Account is required for ${typeNorm.toUpperCase()} transactions` 
      });
    } else {
      const acc = findMatchingAccount(row.account, accounts);
      if (!acc) {
        errors.push({ 
          field: "account", 
          message: `Account not found: "${row.account}". Available: ${accounts.map(a => a.name).join(", ")}` 
        });
      }
    }

    // Category is required
    if (!row.category || row.category.trim() === "") {
      errors.push({ 
        field: "category", 
        message: `Category is required for ${typeNorm.toUpperCase()} transactions` 
      });
    } else {
      const cat = findMatchingCategory(row.category, categories, typeNorm);
      if (!cat) {
        const availableCategories = categories
          .filter(c => c.type === typeNorm)
          .map(c => c.name)
          .join(", ");
        errors.push({ 
          field: "category", 
          message: `${typeNorm.toUpperCase()} category not found: "${row.category}". Available: ${availableCategories || "None"}` 
        });
      }
    }
  }

  // Frequency validation (optional but if provided must be valid)
  if (row.frequency && row.frequency.trim() !== "") {
    const freqNorm = row.frequency.toLowerCase().trim();
    if (!VALID_FREQUENCIES.includes(freqNorm)) {
      errors.push({ 
        field: "frequency", 
        message: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}. Got: ${row.frequency}` 
      });
    }
  }

  return errors;
}

/**
 * Auto-correct and normalize a row
 */
export function autoCorrectRow(
  row: BulkImportRow,
  accounts: Account[],
  categories: Category[]
): BulkImportRow {
  const corrected = { ...row };

  // Normalize type
  if (corrected.type) {
    corrected.type = corrected.type.toLowerCase().trim();
  }

  // Normalize frequency
  if (corrected.frequency && corrected.frequency.trim() !== "") {
    corrected.frequency = corrected.frequency.toLowerCase().trim();
  } else {
    corrected.frequency = "none";
  }

  // Normalize account
  if (corrected.account && corrected.account.trim() !== "") {
    const acc = findMatchingAccount(corrected.account, accounts);
    if (acc) {
      corrected.account = acc.name;
    }
  }

  // Normalize from/to accounts for transfer
  if (corrected.fromAccount && corrected.fromAccount.trim() !== "") {
    const acc = findMatchingAccount(corrected.fromAccount, accounts);
    if (acc) {
      corrected.fromAccount = acc.name;
    }
  }
  if (corrected.toAccount && corrected.toAccount.trim() !== "") {
    const acc = findMatchingAccount(corrected.toAccount, accounts);
    if (acc) {
      corrected.toAccount = acc.name;
    }
  }

  // Normalize category
  if (corrected.category && corrected.category.trim() !== "") {
    const typeNorm = corrected.type?.toLowerCase() as "income" | "expense";
    const cat = findMatchingCategory(corrected.category, categories, typeNorm);
    if (cat) {
      corrected.category = cat.name;
    }
  }

  // Parse and reformat date
  if (corrected.transactionDate) {
    const formattedDate = formatDateForDB(corrected.transactionDate);
    if (formattedDate) {
      corrected.transactionDate = formattedDate;
    }
  }

  // Parse amount as number string
  if (corrected.amount) {
    const parsed = parseFloat(corrected.amount);
    if (!isNaN(parsed)) {
      corrected.amount = parsed.toFixed(2);
    }
  }

  return corrected;
}
