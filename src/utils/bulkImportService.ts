import { supabase } from "@/integrations/supabase/client";
import { ParsedCSVRow, HeaderMapping } from "@/types/bulkImport";
import { Account, Goal } from "@/types/database";
import { validateRow, ValidationContext } from "./csvValidator";

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
  goals: Goal[]
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
    for (const item of validatedRows) {
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
  const account = accounts.find((a) => a.id === mappedData.account_id);
  if (!account) {
    throw new Error(`Account ${mappedData.account_id} not found`);
  }

  const category = mappedData.category
    ? categories.find((c) => c.name.toLowerCase() === String(mappedData.category).toLowerCase())
    : null;

  let goal = null;
  let goalAmount = null;
  if (mappedData.goal_name) {
    goal = goals.find((g) => g.name === mappedData.goal_name);
    if (!goal) {
      throw new Error(`Goal ${mappedData.goal_name} not found`);
    }
    // Calculate goal amount based on deduction type
    goalAmount = mappedData.amount; // Default to full amount
    if (mappedData.deduction_type === "split") {
      goalAmount = mappedData.amount / 2; // For split, use half
    }
  }

  // Insert transaction
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: userId,
    account_id: mappedData.account_id,
    category_id: category?.id || null,
    type: mappedData.type || "expense",
    amount: parseFloat(String(mappedData.amount)),
    currency: account.currency || "USD",
    description: mappedData.description || null,
    notes: mappedData.notes || null,
    transaction_date: mappedData.date,
    frequency: mappedData.frequency || "none",
    goal_id: goal?.id || null,
    goal_amount: goalAmount,
    goal_allocation_type: mappedData.deduction_type || null,
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
    account_id: mappedData.account_id,
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
      const newAmount = Math.max(
        0,
        currentGoal.current_amount - goalAmount // Deduct from goal
      );
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
  const fromAccount = accounts.find((a) => a.id === mappedData.from_account);
  const toAccount = accounts.find((a) => a.id === mappedData.to_account);

  if (!fromAccount || !toAccount) {
    throw new Error("Invalid transfer accounts");
  }

  const amount = parseFloat(String(mappedData.amount));
  const date = mappedData.date;
  const description = mappedData.description || "Transfer";

  // Create sender transaction
  const { data: senderTx, error: senderError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: mappedData.from_account,
      type: "transfer-sender",
      amount,
      currency: fromAccount.currency || "USD",
      description,
      transaction_date: date,
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
      account_id: mappedData.to_account,
      type: "transfer-receiver",
      amount,
      currency: toAccount.currency || "USD",
      description,
      transaction_date: date,
      frequency: "none",
    })
    .select()
    .single();

  if (receiverError) throw receiverError;

  // Link them in transfer_transactions table
  const { error: linkError } = await supabase.from("transfer_transactions").insert({
    from_transaction_id: senderTx.id,
    to_transaction_id: receiverTx.id,
    transfer_type: "peer-to-peer",
  });

  if (linkError) throw linkError;

  // Update both account balances
  const { error: senderBalError } = await supabase.rpc("update_account_balance", {
    account_id: mappedData.from_account,
    amount_change: -amount,
  });

  if (senderBalError) throw senderBalError;

  const { error: receiverBalError } = await supabase.rpc("update_account_balance", {
    account_id: mappedData.to_account,
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
          // Normalize type names
          const typeValue = String(value).toLowerCase().trim();
          if (["transfer-sender", "transfer receiver", "transfer sender"].includes(typeValue)) {
            mapped[field] = "transfer-sender";
          } else if (["transfer-receiver", "transfer-receiver"].includes(typeValue)) {
            mapped[field] = "transfer-receiver";
          } else {
            mapped[field] = typeValue as "income" | "expense";
          }
          break;
        default:
          mapped[field] = String(value).trim();
      }
    }
  });

  return mapped;
}
