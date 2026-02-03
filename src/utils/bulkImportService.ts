import { supabase } from "@/integrations/supabase/client";
import { ParsedCSVRow, HeaderMapping } from "@/types/bulkImport";
import { Account, Goal } from "@/types/database";
import { validateRow, ValidationContext, normalizeFieldName, normalizeTransactionType, parseCustomDate } from "./csvValidator";

export interface ImportResult {
  success: boolean;
  successfulImports: number;
  failedImports: number;
  errors: { rowIndex: number; message: string }[];
  summary?: string;
}

/**
 * Import bulk transactions into the database
 */
export async function importBulkTransactions(
  userId: string,
  csvData: ParsedCSVRow[],
  headerMapping: HeaderMapping,
  selectedRowIndices: Set<number>,
  accounts: Account[],
  categories: any[],
  goals: Goal[],
  onProgress?: (progress: number) => void
): Promise<ImportResult> {
  const errors: { rowIndex: number; message: string }[] = [];
  let successfulImports = 0;
  let failedImports = 0;

  const validationContext: ValidationContext = {
    accounts,
    categories,
    goalNames: goals.map((g) => g.name),
  };

  try {
    // Extract mapped values for selected rows
    const rowsToImport = Array.from(selectedRowIndices).map((idx) => {
      const originalRow = csvData[idx];
      const mappedData = extractMappedData(originalRow, headerMapping);
      return { rowIndex: idx, originalRow, mappedData };
    });

    // Validate each row
    const validatedRows = rowsToImport.filter((item) => {
      const errors = validateRow(item.originalRow, headerMapping, validationContext);
      if (errors.length > 0) {
        failedImports++;
        errors.forEach((err) => {
          item.rowIndex++;
          errors.push({
            rowIndex: item.rowIndex,
            message: `${err.field}: ${err.message}`,
          });
        });
        return false;
      }
      return true;
    });

    // Import valid rows
    for (let i = 0; i < validatedRows.length; i++) {
      const item = validatedRows[i];
      try {
        const mappedData = item.mappedData;
        const transactionType = mappedData.type as
          | "income"
          | "expense"
          | "transfer-sender"
          | "transfer-receiver";

        if (transactionType && transactionType.startsWith("transfer")) {
          // Handle transfer transactions
          await importTransferTransaction(
            userId,
            mappedData,
            accounts,
            categories
          );
        } else {
          // Handle regular transactions (income/expense)
          await importRegularTransaction(
            userId,
            mappedData,
            accounts,
            categories,
            goals
          );
        }
        successfulImports++;
      } catch (err) {
        failedImports++;
        errors.push({
          rowIndex: item.rowIndex + 1,
          message: `Failed to import: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }

      // Update progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / validatedRows.length) * 100);
        onProgress(progress);
      }
    }

    return {
      success: failedImports === 0,
      successfulImports,
      failedImports,
      errors,
      summary: `Imported ${successfulImports} transactions successfully${
        failedImports > 0 ? ` with ${failedImports} errors` : ""
      }`,
    };
  } catch (err) {
    return {
      success: false,
      successfulImports,
      failedImports,
      errors: [
        {
          rowIndex: 0,
          message: `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ],
    };
  }
}

/**
 * Import a regular transaction (income/expense)
 */
async function importRegularTransaction(
  userId: string,
  mappedData: Partial<Record<string, any>>,
  accounts: Account[],
  categories: any[],
  goals: Goal[]
) {
  // Find account by exact name match (case-insensitive)
  const accountInput = String(mappedData.account_id || "").trim();
  const account = accounts.find((a) => 
    a.name.toLowerCase() === accountInput.toLowerCase()
  );
  if (!account) {
    throw new Error(`Account "${accountInput}" not found`);
  }

  // Normalize category name for lookup
  const categoryInput = mappedData.category ? normalizeFieldName(String(mappedData.category)) : null;
  const category = categoryInput
    ? categories.find((c) => normalizeFieldName(c.name) === categoryInput)
    : null;

  let goal = null;
  let goalAmount = null;
  let goalAllocationMode = null; // "deduct" or "contribute"
  
  if (mappedData.goal_name && mappedData.exchange_from_goal) {
    // Normalize goal name for lookup
    const goalInput = normalizeFieldName(String(mappedData.goal_name));
    goal = goals.find((g) => normalizeFieldName(g.name) === goalInput);
    if (!goal) {
      throw new Error(`Goal ${mappedData.goal_name} not found`);
    }

    // Auto-determine exchange mode based on transaction type
    if (mappedData.type === "income") {
      goalAllocationMode = "contribute"; // Income contributes to goal
      goalAmount = parseFloat(String(mappedData.exchange_from_goal));
    } else if (mappedData.type === "expense") {
      goalAllocationMode = "deduct"; // Expense deducts from goal
      goalAmount = parseFloat(String(mappedData.exchange_from_goal));
    }
  }

  // Parse date from various formats
  const dateObj = parseCustomDate(String(mappedData.date));
  const formattedDate = dateObj ? dateObj.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  // Normalize transaction type
  const normalizedType = normalizeTransactionType(String(mappedData.type || "expense")) || "expense";

  // Insert transaction
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: userId,
    account_id: account.id,
    category_id: category?.id || null,
    type: normalizedType,
    amount: parseFloat(String(mappedData.amount)),
    currency: account.currency || "USD",
    description: mappedData.description || null,
    notes: mappedData.notes || null,
    transaction_date: formattedDate,
    frequency: mappedData.frequency || "none",
    goal_id: goal?.id || null,
    goal_amount: goalAmount,
    goal_allocation_type: goalAllocationMode || mappedData.deduction_type || null,
  });

  if (txError) throw txError;

  // Update account balance
  let balanceChange: number;
  if (mappedData.type === "income") {
    balanceChange = parseFloat(String(mappedData.amount));
  } else {
    balanceChange = -parseFloat(String(mappedData.amount));
  }

  const { error: balError } = await supabase.rpc("update_account_balance", {
    account_id: account.id,
    amount_change: balanceChange,
  });

  if (balError) throw balError;

  // Update goal if linked
  if (goal && goalAmount) {
    const { data: currentGoal } = await supabase
      .from("goals")
      .select("current_amount")
      .eq("id", goal.id)
      .single();

    if (currentGoal) {
      let newAmount;
      if (goalAllocationMode === "contribute") {
        // Add to goal
        newAmount = currentGoal.current_amount + goalAmount;
      } else {
        // Deduct from goal (default)
        newAmount = Math.max(0, currentGoal.current_amount - goalAmount);
      }
      
      await supabase
        .from("goals")
        .update({ current_amount: newAmount })
        .eq("id", goal.id);
    }
  }
}

/**
 * Import a transfer transaction
 * Creates two transaction records (sender and receiver)
 */
async function importTransferTransaction(
  userId: string,
  mappedData: Partial<Record<string, any>>,
  accounts: Account[],
  categories: any[]
) {
  // Find accounts by exact name match (case-insensitive)
  const fromInput = String(mappedData.from_account || "").trim();
  const toInput = String(mappedData.to_account || "").trim();
  
  const fromAccount = accounts.find((a) => 
    a.name.toLowerCase() === fromInput.toLowerCase()
  );
  const toAccount = accounts.find((a) => 
    a.name.toLowerCase() === toInput.toLowerCase()
  );

  if (!fromAccount || !toAccount) {
    throw new Error(`Invalid transfer accounts: from="${fromInput}" to="${toInput}"`);
  }

  const amount = parseFloat(String(mappedData.amount));
  const date = mappedData.date;
  const description = mappedData.description || "Transfer";

  // Parse date from various formats
  const dateObj = parseCustomDate(String(mappedData.date));
  const formattedDate = dateObj ? dateObj.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  // Create sender transaction
  const { data: senderTx, error: senderError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: fromAccount.id, // Use the actual account ID found from lookup
      type: "transfer-sender",
      amount,
      currency: fromAccount.currency || "USD",
      description,
      transaction_date: formattedDate,
      frequency: "none",
    })
    .select()
    .single();

  if (senderError) throw senderError;

  // Create receiver transaction
  const { data: receiverTx, error: receiverError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: toAccount.id, // Use the actual account ID found from lookup
      type: "transfer-receiver",
      amount,
      currency: toAccount.currency || "USD",
      description,
      transaction_date: formattedDate,
      frequency: "none",
    })
    .select()
    .single();

  if (receiverError) throw receiverError;

  // No need to link transfers in separate table - they're tracked by sender/receiver types

  // Update both account balances
  const { error: senderBalError } = await supabase.rpc("update_account_balance", {
    account_id: fromAccount.id, // Use the actual account ID found from lookup
    amount_change: -amount,
  });

  if (senderBalError) throw senderBalError;

  const { error: receiverBalError } = await supabase.rpc("update_account_balance", {
    account_id: toAccount.id, // Use the actual account ID found from lookup
    amount_change: amount,
  });

  if (receiverBalError) throw receiverBalError;
}

/**
 * Extract mapped data from CSV row based on header mapping
 */
function extractMappedData(row: ParsedCSVRow, mapping: HeaderMapping) {
  const mapped: Partial<Record<string, any>> = {};

  Object.entries(mapping).forEach(([csvColumn, field]) => {
    if (field !== "skip" && row[csvColumn] !== undefined && row[csvColumn] !== "") {
      const value = row[csvColumn];

      switch (field) {
        case "amount":
          mapped[field] = parseFloat(String(value));
          break;
        case "date":
          mapped[field] = String(value).trim();
          break;
        case "type":
          // Use the same normalization as validation
          const normalized = normalizeTransactionType(String(value));
          mapped[field] = normalized || String(value).toLowerCase().trim();
          break;
        case "exchange_from_goal":
          // Parse as number
          mapped[field] = parseFloat(String(value));
          break;
        case "account_id":
        case "from_account":
        case "to_account":
          // Keep account names as-is (exact match case-insensitive in validation)
          mapped[field] = String(value).trim();
          break;
        case "category":
        case "goal_name":
          // Normalize field names (spaces to underscores)
          mapped[field] = normalizeFieldName(String(value));
          break;
        default:
          mapped[field] = String(value).trim();
      }
    }
  });

  return mapped;
}
