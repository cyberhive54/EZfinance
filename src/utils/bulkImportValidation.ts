// Bulk Import Validation Utilities

export interface ImportRow {
  rowIndex: number;
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
  errors: ImportError[];
  isValid: boolean;
}

export interface ImportError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

// Validate decimal places (max 2)
export const validateDecimalPlaces = (value: string): boolean => {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return false;
  const decimalPart = value.split('.')[1];
  return !decimalPart || decimalPart.length <= 2;
};

// Validate frequency (case-insensitive exact match)
export const validateFrequency = (frequency: string): { isValid: boolean; corrected?: string } => {
  if (!frequency || frequency.trim() === "") {
    return { isValid: true, corrected: "none" };
  }

  const normalized = frequency.toLowerCase().trim();
  const validFrequencies = ["daily", "weekly", "monthly", "yearly", "none"];

  if (validFrequencies.includes(normalized)) {
    return { isValid: true, corrected: normalized };
  }

  return { isValid: false };
};

// Validate category matches transaction type
export const validateCategoryForType = (
  category: string,
  type: string,
  availableCategories: any[]
): { isValid: boolean; suggestion?: string } => {
  if (!category || !type) return { isValid: false };

  const typeCats = availableCategories.filter((c) => c.type === type.toLowerCase());
  const match = typeCats.find(
    (c) => c.name.toLowerCase().replace(/\s+/g, "_") === category.toLowerCase().replace(/\s+/g, "_")
  );

  if (match) return { isValid: true };

  return { isValid: false };
};

// Validate transfer has from/to accounts
export const validateTransferAccounts = (
  fromAccount: string,
  toAccount: string,
  type: string
): { isValid: boolean; message?: string } => {
  if (type.toUpperCase() !== "TRANSFER") return { isValid: true };

  if (!fromAccount && !toAccount) {
    return { isValid: false, message: "At least one of From/To Account is required for TRANSFER" };
  }

  if (fromAccount && toAccount && fromAccount.toLowerCase() === toAccount.toLowerCase()) {
    return { isValid: false, message: "From Account cannot be same as To Account" };
  }

  return { isValid: true };
};

// Validate deduction type and goal presence
export const validateGoalFields = (
  deductionType: string,
  goalName: string,
  splitAmount: string
): { isValid: boolean; message?: string } => {
  const hasDeductionType = deductionType && deductionType.trim() !== "";
  const hasGoalName = goalName && goalName.trim() !== "";

  // Both must be present or both must be absent
  if ((hasDeductionType && !hasGoalName) || (!hasDeductionType && hasGoalName)) {
    return {
      isValid: false,
      message: "Deduction Type and Goal Name must both be present or both be absent",
    };
  }

  // If split type, check for split amount
  if (deductionType && deductionType.toLowerCase() === "split" && !splitAmount) {
    return { isValid: false, message: "Split Amount is required when Deduction Type is 'split'" };
  }

  return { isValid: true };
};

// Generate sample CSV
export const generateSampleCSV = (): string => {
  return `Type,Title,Amount,Transaction Date,Account,Category,From Account,To Account,Frequency,Notes
EXPENSE,Groceries,150.50,2024-01-15,My Checking,Groceries,,,none,Weekly shopping
EXPENSE,Gas,75.00,2024-01-16,Credit Card,Transport,,,none,
INCOME,Salary,5000.00,2024-01-01,My Checking,Salary,,,monthly,Monthly salary
TRANSFER,Monthly Savings,1000.00,2024-01-20,,,My Checking,Savings Account,,Monthly savings`;
};

// Format error message for transfer type
export const getTransferErrorMessage = (row: ImportRow): string => {
  const errors = row.errors.filter((e) => e.severity === "error");
  const messages = errors.map((e) => e.message);
  return messages.join(", ") || "Unknown error";
};
