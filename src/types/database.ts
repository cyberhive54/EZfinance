export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  preferred_currency: string;
  theme: string;
  timezone: string | null;
  default_account_id: string | null;
  profile_photo_url: string | null;
  profile_photo_cloudinary_public_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: "income" | "expense" | "transfer-sender" | "transfer-receiver";
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  transaction_date: string;
  frequency: "none" | "daily" | "weekly" | "monthly" | "yearly";
  goal_id: string | null;
  goal_amount: number | null;
  goal_allocation_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionAttachment {
  id: string;
  transaction_id: string;
  user_id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  original_filename: string;
  file_size: number;
  created_at: string;
}

export type AccountType = "bank" | "cash" | "wallet" | "credit" | "investment" | "crypto" | "other";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Digital Wallet" },
  { value: "credit", label: "Credit Card" },
  { value: "investment", label: "Investment" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "other", label: "Other" },
];

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
];
