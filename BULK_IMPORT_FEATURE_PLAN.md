# Bulk Import Feature - Comprehensive Plan

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [4-Step Wizard Flow](#4-step-wizard-flow)
3. [CSV Format Specification](#csv-format-specification)
4. [Field Mapping Rules](#field-mapping-rules)
5. [Validation Rules](#validation-rules)
6. [Auto-Correction Logic](#auto-correction-logic)
7. [Error Handling & Inline Editing](#error-handling--inline-editing)
8. [Duplicate Detection](#duplicate-detection)
9. [Transfer Transactions](#transfer-transactions)
10. [Database & API Considerations](#database--api-considerations)
11. [UI/UX Specifications](#uiux-specifications)
12. [Error Messages Reference](#error-messages-reference)
13. [Code Structure](#code-structure)

---

## Feature Overview

**Purpose**: Allow users to import multiple transactions at once via CSV file upload or paste, with comprehensive validation, error detection, inline editing, and duplicate checking.

**Key Features**:
- ✅ Upload CSV file or paste CSV text
- ✅ Auto-detect and map column headers
- ✅ Real-time validation with specific error messages
- ✅ Inline editing for error rows only
- ✅ Duplicate detection (amount + date + account comparison)
- ✅ Auto-correction of field values (case normalization, space handling)
- ✅ Transfer transactions support
- ✅ Selective import (checkbox per row, default all checked)
- ✅ Mandatory field validation
- ✅ Skip attachments in bulk import

**Scope**: INCOME, EXPENSE, and TRANSFER transaction types

---

## 4-Step Wizard Flow

### **Step 1: Import Source Selection Modal**

**Title**: "Bulk Import Transactions"

**UI Elements**:
- Radio Button Group (2 options):
  - ◉ "Upload CSV File"
    - File input: accept=".csv,.txt"
    - Accepted formats: CSV, TXT
    - Max file size: 10MB
  - ◯ "Paste CSV Text"
    - Large textarea (30 rows, auto-scrolling)
    - Placeholder: "Paste your CSV data here..."

- **Example Format Section** (collapsible, shown by default):
  ```
  Type,Title,Amount,Transaction Date,Account,Category,From Account,To Account,Frequency,Notes
  EXPENSE,Groceries,150.50,2024-01-15,Checking,Groceries,,,none,Weekly shopping
  INCOME,Salary,5000.00,2024-01-01,Checking,Salary,,,monthly,Monthly salary
  TRANSFER,Office Move,1000,01-15-2024,,,My Checking,Savings Account,,
  ```

- **Buttons**:
  - "Next" (disabled until CSV source selected and validated)
  - "Cancel"

**Validation on Step 1**:
- CSV is not empty
- CSV is valid format (can be parsed)
- Has at least one row of data (besides headers if present)
- Show error: "Invalid CSV format or file is empty"

**Output**: Raw CSV text string, file name (if uploaded)

---

### **Step 2: CSV Parser & Column Detection**

**Title**: "Preview CSV Data"

**UI Elements**:
- **Preview Table**:
  - Shows first 5-10 rows of parsed CSV
  - Display all columns exactly as in CSV
  - Read-only display

- **CSV Stats**:
  - "Total Rows: X"
  - "Detected Columns: [list]"
  - "Auto-Detected Headers: Yes/No"

- **Column Mapping Option**:
  - If headers detected: "Headers detected automatically"
  - If no headers: "⚠️ No headers detected - you'll map columns in next step"

- **Buttons**:
  - "Back"
  - "Proceed to Column Mapping"
  - "Cancel"

**Logic**:
- Attempt to detect headers (check if first row looks like field names)
- Count total rows
- Parse CSV into 2D array
- Validate that all rows have same number of columns

**Output**: Parsed CSV data (array of arrays), detected headers (if any)

---

### **Step 3: Column Mapping**

**Title**: "Map CSV Columns to Transaction Fields"

**UI Elements**:
- **Mapping Interface** (Two approaches, choose one based on CSV structure):

  **Option A: Headers Detected**
  - Show table with 2 columns:
    - Column 1: "CSV Column" (showing: "Type", "Title", "Amount", etc.)
    - Column 2: "Map To Field" (dropdown showing options)
  - Each CSV column can be mapped to:
    - [ ] Skip
    - [ ] Type
    - [ ] Title
    - [ ] Amount
    - [ ] Transaction Date
    - [ ] Account
    - [ ] Category
    - [ ] From Account
    - [ ] To Account
    - [ ] Frequency
    - [ ] Notes
  - Some fields may have "Auto-matched ✓" label if system detected them

  **Option B: No Headers Detected**
  - Show table with 2 columns:
    - Column 1: "Column #" (showing: Column 1, Column 2, Column 3, etc.)
    - Column 2: "Map To Field" (dropdown with same options as above)
    - Actual data preview from first data row shown as hint

- **Mandatory Fields Check**:
  - Show warning if these are not mapped:
    - Type (INCOME/EXPENSE/TRANSFER)
    - Amount
    - Transaction Date
    - For non-transfer: Account
    - For transfer: From Account OR To Account (at least one)
    - Category

- **Preview Section** (After mapping):
  - Shows how first row will be interpreted
  - "First Row Preview: Type=EXPENSE, Title=Groceries, Amount=150.50, ..."

- **Buttons**:
  - "Back"
  - "Proceed to Validation" (enabled only if all mandatory fields mapped)
  - "Cancel"

**Logic**:
- Auto-detect headers using AI (check for keywords: type, amount, date, account, category, etc.)
- Allow manual mapping for each column
- Validate that mandatory fields are mapped
- Store mapping configuration

**Output**: Column mapping configuration (mapping of CSV col index → field name)

---

### **Step 4: Validation & Inline Editing**

**Title**: "Review & Import Transactions"

**UI Elements**:

**1. Import Summary Box** (Top):
```
Total Transactions: 25
Valid & Ready: 20 ✓
Has Errors: 5 ⚠️
Checked for Import: 22 ☑️
```

**2. Main Table**:
- **Columns**:
  - ☑️ Checkbox (default all checked)
  - 🔴/🟢 Status icon (red=error, green=valid)
  - Type
  - Title
  - Amount
  - Date
  - Account / From→To
  - Category
  - Notes
  - Action (Edit/Remove)

- **Row Styling**:
  - ✅ Valid row: Light green background
  - ⚠️ Error row: Light red/pink background
  - Grayed out: If unchecked

- **Error Indicator**:
  - Hover on red icon → tooltip shows error message
  - Example: "Invalid category: FOOD123 - not found"

**3. Row Details & Inline Editing**:
- Click on error row → Row expands to show all fields as editable
- Error fields highlighted in red
- Show inline error message under each error field
- Example:
  ```
  Type: [EXPENSE dropdown] ✓
  Title: [groceries input]
  Amount: [150.50 input] ✓
  Category: [input field] ⚠️ "Invalid: FOOD123 - Did you mean GROCERIES?"
  ```

- Editing Options:
  - For dropdown fields (Type, Account, Category, Frequency): Show suggestions
  - For Amount: Show validator in real-time
  - For Date: Show date picker
  - For Account/Category: Show searchable dropdown with all valid options

- **Quick Fix Suggestions**:
  - When error detected, show suggestions:
    - "Did you mean: GROCERIES?" (for typos)
    - "Valid accounts: My Checking, Savings Account, Credit Card"
    - "Valid categories for EXPENSE: Groceries, Dining, Transport..."

**4. Action Buttons** (Row level):
- Edit (expand row for inline editing)
- Remove (delete row from import)
- Cancel (collapse row)
- Save (save inline edits)

**5. Bottom Action Buttons**:
- "Back"
- "Import Now" (imports all checked rows that are valid)
- "Cancel"

**Post-Import**:
- Show success message: "Successfully imported X transactions"
- Option: "View Imported Transactions"
- Auto-refresh transactions table after modal closes
- Toast notification: "X transactions imported successfully"

---

## CSV Format Specification

### **Valid Column Headers** (case-insensitive):

```
Type, Title, Amount, Transaction Date, Account, Category, From Account, To Account, Frequency, Notes
```

**Alternative Header Names** (system should recognize these):

| Standard | Alternatives |
|----------|---------------|
| Type | transaction_type, trans_type |
| Title | description, trans_title |
| Amount | value, trans_amount |
| Transaction Date | date, trans_date, date_transaction |
| Account | account_name, acc |
| Category | cat, trans_category |
| From Account | source_account, from_acc |
| To Account | target_account, to_acc, destination |
| Frequency | freq, recurrence |
| Notes | note, comments, memo |

### **CSV Examples**

**Example 1: Simple Expenses**
```csv
Type,Title,Amount,Transaction Date,Account,Category,Frequency,Notes
EXPENSE,Groceries,150.50,2024-01-15,My Checking,Groceries,none,Weekly shopping
EXPENSE,Gas,75.00,2024-01-16,Credit Card,Transport,none,
EXPENSE,Electricity Bill,120.00,2024-01-10,My Checking,Utilities,monthly,
```

**Example 2: Mixed with Income**
```csv
Type,Title,Amount,Date,Account,Category
INCOME,Salary,5000.00,2024-01-01,My Checking,Salary
INCOME,Freelance Project,1500.00,2024-01-15,My Checking,Freelance
EXPENSE,Rent,2000.00,2024-01-01,My Checking,Housing
```

**Example 3: Transfers**
```csv
Type,Amount,From Account,To Account,Date,Notes
TRANSFER,1000.00,My Checking,Savings Account,2024-01-20,Monthly savings
TRANSFER,500.00,Credit Card,My Checking,2024-01-25,Payment
```

**Example 4: Mixed Everything**
```csv
Type,Title,Amount,Transaction Date,Account,Category,From Account,To Account,Frequency,Notes
EXPENSE,Groceries,150.50,2024-01-15,My Checking,Groceries,,,none,Weekly shopping
INCOME,Salary,5000.00,2024-01-01,My Checking,Salary,,,monthly,Monthly salary
TRANSFER,,1000.00,2024-01-20,,,My Checking,Savings Account,,Monthly savings
EXPENSE,Dining,85.00,01-16-2024,Credit Card,Dining,,,none,Dinner with friends
```

---

## Field Mapping Rules

### **Field: Type**
- **Valid Values**: INCOME, EXPENSE, TRANSFER
- **Case Handling**: Accept case-insensitive input
- **Auto-Correction**: Convert to uppercase
  - Input: "income", "Income", "INCOME" → Store: "INCOME"
- **Mandatory**: YES
- **Error**: "Type must be INCOME, EXPENSE, or TRANSFER"

### **Field: Title**
- **Description**: Transaction description/name
- **Valid Format**: Any text (1-255 characters)
- **Case Handling**: Preserve original case
- **Mandatory**: NO (optional)
- **Error**: If provided, must be non-empty string (1-255 chars)

### **Field: Amount**
- **Valid Format**: Positive decimal number
- **Separators Accepted**:
  - Comma as thousands separator: "1,000.50" → 1000.50
  - Period as decimal: "1000.50" → 1000.50
  - No separators: "1000.50" → 1000.50
- **Currency Symbols**: Remove if present
  - "$1000.50" → 1000.50
  - "1000.50€" → 1000.50
- **Min Value**: 0.01
- **Max Decimal Places**: 2
- **Mandatory**: YES
- **Errors**:
  - "Amount must be a positive number"
  - "Amount cannot be zero"
  - "Invalid format: Please use format like 1000.50"

### **Field: Transaction Date**
- **Valid Formats**:
  - **ISO Format**: YYYY-MM-DD (2024-01-15)
  - **US Format**: MM-DD-YYYY (01-15-2024)
  - **EU Format**: DD-MM-YYYY (15-01-2024)
  - **No separators**: YYYYMMDD (20240115), DDMMYYYY (15012024)
- **System should auto-detect format**
- **Date Range Validation**: Must be within reasonable range
  - Not in future (or max 1 year in future for scheduled transactions)
  - Not older than 50 years
- **Mandatory**: YES
- **Errors**:
  - "Invalid date format"
  - "Date cannot be in future (unless scheduled)"
  - "Date seems invalid: DDMMYYYY"
  - "Date must be between 1974 and 2025"

### **Field: Account**
- **Valid Values**: Must match existing account name (case-insensitive with space handling)
- **Database Lookup**: Query accounts table
- **Space Handling**: 
  - User input: "My Checking" → Match with DB: "MY_CHECKING"
  - Auto-correction: Convert to uppercase + replace spaces with "_"
- **Case Handling**: Convert to uppercase for matching
- **Usage Rules**:
  - For INCOME: Required
  - For EXPENSE: Required
  - For TRANSFER: NOT USED (use From Account / To Account instead)
- **Mandatory**: YES (for INCOME/EXPENSE), NO (for TRANSFER)
- **Errors**:
  - "Account 'My_Checking' not found"
  - "Valid accounts: MY_CHECKING, CREDIT_CARD, SAVINGS_ACCOUNT"

### **Field: Category**
- **Valid Values**: Must match existing category for transaction type
- **Database Lookup**: Query categories table filtered by transaction type
- **Space Handling**: 
  - User input: "personal finance" → Match: "PERSONAL_FINANCE"
  - Auto-correction: Convert to uppercase + replace spaces with "_"
- **Case Handling**: Convert to uppercase for matching
- **Type Validation**:
  - If Type=INCOME → Only accept INCOME categories
  - If Type=EXPENSE → Only accept EXPENSE categories
  - If Type=TRANSFER → No category needed (NULL)
- **Mandatory**: 
  - YES for INCOME/EXPENSE
  - NO for TRANSFER
- **Errors**:
  - "Category 'FOOD123' not found for EXPENSE transactions"
  - "Category must be one of: GROCERIES, DINING, TRANSPORT for EXPENSE"
  - "SALARY category is only for INCOME, not EXPENSE"

### **Field: From Account** (For Transfers)
- **Valid Values**: Must match existing account name
- **Space/Case Handling**: Same as Account field (uppercase + underscore)
- **Usage Rules**:
  - Only for TRANSFER type
  - At least FROM or TO must be provided
  - If only one provided, use primary/default account for other
- **Mandatory**: 
  - NO if To Account provided
  - YES if To Account is empty
- **Errors**:
  - "From Account 'XYZ' not found"
  - "From Account cannot be same as To Account"
  - "For TRANSFER, at least one of From/To Account required"

### **Field: To Account** (For Transfers)
- **Valid Values**: Must match existing account name
- **Space/Case Handling**: Same as Account field
- **Usage Rules**:
  - Only for TRANSFER type
  - At least FROM or TO must be provided
  - If only one provided, use primary/default account for other
- **Mandatory**: 
  - NO if From Account provided
  - YES if From Account is empty
- **Errors**:
  - "To Account 'XYZ' not found"
  - "To Account cannot be same as From Account"
  - "For TRANSFER, at least one of From/To Account required"

### **Field: Frequency**
- **Valid Values**: none, daily, weekly, monthly, yearly
- **Case Handling**: Convert to lowercase
- **Default**: "none" if not provided
- **Mandatory**: NO (optional, defaults to "none")
- **Errors**:
  - "Frequency must be one of: none, daily, weekly, monthly, yearly"

### **Field: Notes**
- **Description**: Additional notes for transaction
- **Valid Format**: Any text (0-1000 characters)
- **Case Handling**: Preserve original case
- **Mandatory**: NO (optional)
- **Errors**: If provided, must be ≤1000 characters

---

## Validation Rules

### **Row-Level Validation** (checked for each transaction)

**1. Required Fields Present**:
```
INCOME/EXPENSE:
  - Type ✓
  - Amount ✓
  - Transaction Date ✓
  - Account ✓
  - Category ✓

TRANSFER:
  - Type ✓
  - Amount ✓
  - Transaction Date ✓
  - From Account OR To Account (at least one) ✓
```

**2. Field Format Validation**:
- Type: one of INCOME, EXPENSE, TRANSFER
- Amount: positive decimal, ≤2 decimal places
- Date: valid date in supported format
- Frequency: one of allowed values
- Title: 1-255 chars if provided
- Notes: ≤1000 chars if provided

**3. Referential Integrity**:
- Account exists in database
- Category exists and matches transaction type
- From Account exists and is different from To Account (for transfers)
- To Account exists (if Type=TRANSFER)

**4. Business Logic**:
- Amount > 0
- Date not in future (or within reasonable range)
- For TRANSFER: From Account ≠ To Account
- For INCOME/EXPENSE: Account is valid for that type

**5. Duplicate Check** (after all validations pass):
- Query existing transactions with:
  - amount = CSV amount
  - transaction_date = CSV date
  - account = CSV account (or from/to account for transfers)
- If exact match found:
  - **Action**: Skip row, mark as "Duplicate found"
  - **Show**: "This transaction already exists (Date: 2024-01-15, Amount: $150.50)"
  - **Allow**: User can still import if they uncheck the warning

**6. Cross-Row Validation**:
- Check for duplicates within the same import batch
- If 2+ identical rows in CSV:
  - **Action**: Show warning on both rows
  - **Message**: "Duplicate detected in this import (appears X times)"

---

## Auto-Correction Logic

### **Type Field**
```
Input → Output
"income" → "INCOME"
"Income" → "INCOME"
"INCOME" → "INCOME"
"exp" → ERROR (too ambiguous)
"expense" → "EXPENSE"
"transfer" → "TRANSFER"
```

### **Category & Account Fields**
**Rule**: Case-insensitive matching, spaces → underscore

```
Input → Auto-Corrected
"personal finance" → "PERSONAL_FINANCE"
"Personal Finance" → "PERSONAL_FINANCE"
"personal_finance" → "PERSONAL_FINANCE"
"PERSONAL_FINANCE" → "PERSONAL_FINANCE"

"my checking" → "MY_CHECKING"
"My Checking" → "MY_CHECKING"
"MY CHECKING" → "MY_CHECKING"
"my_checking" → "MY_CHECKING"
```

**Matching Algorithm**:
1. Convert user input to uppercase
2. Replace all spaces with underscores
3. Query database with this normalized value
4. If exact match found: Use matched value from database
5. If no match: Show error with suggestions

**Fuzzy Matching** (for typos):
- Use Levenshtein distance to find similar categories/accounts
- If similarity > 80%: Suggest correction
- Example: User types "GROCERI" → Suggest "GROCERIES"

### **Amount Field**
```
Input → Output
"1000" → 1000.00
"1000.5" → 1000.50
"1,000.50" → 1000.50
"$1000.50" → 1000.50
"1000.50€" → 1000.50
"1.000,50" → ERROR (European format not standard, ask for clarification)
```

### **Date Field**
**Format Detection Algorithm**:
1. Remove any extra spaces
2. Identify separator (-, /, or none)
3. Check all 3 formats:
   - YYYY-MM-DD (ISO)
   - MM-DD-YYYY (US)
   - DD-MM-YYYY (EU)
4. Validate each parse attempt
5. If ambiguous (e.g., "01-02-2024"), use most common format for user's region or ask

```
Input → Parsed As → Output Date
"2024-01-15" → ISO → 2024-01-15
"01-15-2024" → US → 2024-01-15
"15-01-2024" → EU → 2024-01-15
"20240115" → YYYYMMDD → 2024-01-15
"01-02-2024" → AMBIGUOUS → Ask user which format
```

### **Frequency Field**
```
Input → Output
"once" → "none"
"none" → "none"
"daily" → "daily"
"every day" → ERROR (specify format)
"weekly" → "weekly"
"w" → "weekly" (abbreviation)
"monthly" → "monthly"
"m" → "monthly"
"yearly" → "yearly"
"annual" → "yearly"
"y" → "yearly"
```

---

## Error Handling & Inline Editing

### **Error Types & Messages**

**1. Validation Errors** (specific to field):

```javascript
{
  field: "category",
  code: "CATEGORY_NOT_FOUND",
  message: "Category 'FOOD123' not found",
  suggestion: "Did you mean: GROCERIES, FOOD_DELIVERY?",
  severity: "error", // "error" or "warning"
  editable: true, // User can fix inline
}
```

**2. Mandatory Field Missing**:
```
"Type is required"
"Amount is required"
"Transaction Date is required"
"Account is required for INCOME/EXPENSE"
"From Account or To Account required for TRANSFER"
"Category is required for INCOME/EXPENSE"
```

**3. Format Errors**:
```
"Amount must be a positive number (e.g., 150.50)"
"Invalid date format - use YYYY-MM-DD or MM-DD-YYYY"
"Frequency must be one of: none, daily, weekly, monthly, yearly"
```

**4. Business Logic Errors**:
```
"From Account cannot be same as To Account"
"SALARY category is only valid for INCOME transactions"
"Category 'TRANSPORT' is only valid for EXPENSE transactions"
"Amount cannot be zero or negative"
"Date cannot be in the future"
```

**5. Duplicate Errors**:
```
"Duplicate detected: Transaction with Amount=$150.50, Date=2024-01-15, Account=MY_CHECKING already exists"
```

### **Inline Editing Interface**

**When Row Error Detected**:
1. Row marked with red background
2. Red "!" icon shows
3. Hover icon → tooltip shows all errors
4. Click row → expands to show all fields
5. Error fields highlighted in red
6. Error message displayed under field
7. Field becomes editable with appropriate input type

**Editing Experience**:

```
CATEGORY field (has error):
  ┌─────────────────────────────────────┐
  │ Category: [dropdown/input]          │
  │ ⚠️ "FOOD123 not found"              │
  │ Suggestions: GROCERIES, FOOD, DINING│
  └─────────────────────────────────────┘
  
  When user clicks: Dropdown shows valid options for this transaction type
  
AMOUNT field (has error):
  ┌─────────────────────────────────────┐
  │ Amount: [150.50]                    │
  │ ⚠️ "Must be positive number"        │
  └─────────────────────────────────────┘

DATE field (has error):
  ┌─────────────────────────────────────┐
  │ Date: [2024-01-15] (with calendar)  │
  │ ⚠️ "Invalid format detected"        │
  └─────────────────────────────────────┘
```

**Save Inline Edit**:
1. User modifies field
2. Real-time validation as they type
3. Error message updates immediately
4. When error fixed: Field turns green, row status updates
5. Click "Save" button → Save inline changes, re-validate row
6. If all errors fixed → Row becomes green and can be imported

**Row State Transitions**:
```
Error Row (red) 
  ↓ User edits field
Editing Mode (yellow) 
  ↓ User saves & field valid
Valid Row (green) [or remains in Error if more errors exist]
```

---

## Duplicate Detection

### **Duplicate Comparison Logic**

**For INCOME/EXPENSE**:
```javascript
duplicate = existingTransaction where:
  amount == csvAmount AND
  transaction_date == csvDate AND
  account == csvAccount
```

**For TRANSFER**:
```javascript
duplicate = existingTransaction where:
  amount == csvAmount AND
  transaction_date == csvDate AND
  from_account == csvFromAccount AND
  to_account == csvToAccount
```

**Note**: Title/Category/Description NOT compared (these can differ for same transaction)

### **Duplicate Handling**

**Case 1: Exact Duplicate Found**
- Mark row with warning icon (yellow/orange)
- Show message: "Duplicate detected: Amount=$X, Date=Y, Account=Z already exists"
- Default: Row is UNCHECKED (user must explicitly check to import duplicate)
- Allow: User can choose to import anyway if they want

**Case 2: Similar Transaction Found** (for warnings):
- If amount same, date within 1 day, same account:
- Show warning but allow import: "Similar transaction found (date differs by 1 day)"

**Case 3: Duplicate Within Batch**:
- If CSV has 2+ identical rows:
- Show warning on all duplicate rows
- Message: "This transaction appears X times in this import"
- Mark: First instance as OK, subsequent as warning
- Allow: User can uncheck duplicates within batch

### **Query Optimization**:
- Batch query all amounts/dates from transactions table
- Compare with CSV in memory
- Avoid N+1 queries

---

## Transfer Transactions

### **Transfer Specification**

**Type**: TRANSFER

**Required Fields**:
- Amount (transfer amount)
- Transaction Date
- From Account OR To Account (at least one required)

**Optional Fields**:
- Title (auto-generated if not provided: "Transfer: X → Y")
- Notes
- Frequency

**Not Used**:
- Category (NULL)
- Account (not used for transfers)

### **Transfer Rules**

**Rule 1**: At least one account required
```
✓ From Account specified, To Account empty → Use primary account as To
✓ From Account empty, To Account specified → Use primary account as From
✗ Both empty → ERROR: "For TRANSFER, From Account or To Account required"
```

**Rule 2**: Accounts must be different
```
✓ From: My Checking, To: Savings Account
✗ From: My Checking, To: My Checking → ERROR: "Cannot transfer to same account"
```

**Rule 3**: Both accounts must exist
```
✗ From: INVALID_ACCOUNT, To: Savings Account → ERROR: "From Account not found"
```

### **Transfer in CSV Examples**

**Minimal (one account specified)**:
```csv
Type,Amount,To Account,Date
TRANSFER,1000.00,Savings Account,2024-01-15
```
→ From Account defaults to primary account

**Full**:
```csv
Type,Amount,From Account,To Account,Date,Notes
TRANSFER,1000.00,My Checking,Savings Account,2024-01-15,Monthly savings
```

**With Title**:
```csv
Type,Title,Amount,From Account,To Account,Date
TRANSFER,Move to Savings,1000.00,My Checking,Savings Account,2024-01-15
```

### **Database Side**:
- Insert into transactions table with type="TRANSFER"
- Set account_id to from_account_id
- Store to_account_id in related field OR separate transfer record
- Category = NULL
- No category_id

---

## Database & API Considerations

### **New Tables/Modifications Needed**

**1. transactions table** (if not already supporting transfers):
```sql
ALTER TABLE transactions ADD COLUMN to_account_id UUID REFERENCES accounts(id);
-- For transfer transactions, account_id = from_account_id, to_account_id = destination
```

**2. Transaction History/Audit** (optional):
```sql
CREATE TABLE bulk_import_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  import_date TIMESTAMP DEFAULT NOW(),
  total_rows INTEGER,
  successful_imports INTEGER,
  failed_rows INTEGER,
  csv_file_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bulk_import_details (
  id UUID PRIMARY KEY,
  import_log_id UUID REFERENCES bulk_import_logs(id),
  row_number INTEGER,
  transaction_id UUID REFERENCES transactions(id),
  status VARCHAR (success, skipped, error),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints Needed**

**1. Parse CSV**:
```
POST /api/bulk-import/parse
Body: { csv: string, fileName?: string }
Response: { headers: string[], rows: any[], rowCount: number }
```

**2. Detect Headers**:
```
POST /api/bulk-import/detect-headers
Body: { headers: string[] }
Response: { detected: boolean, mappedColumns: Record<string, string> }
```

**3. Validate Transactions**:
```
POST /api/bulk-import/validate
Body: { transactions: any[], columnMapping: Record<string, string> }
Response: {
  valid: any[],
  invalid: { row: number, errors: Error[] }[],
  duplicates: { row: number, matchingTransaction: Transaction }[]
}
```

**4. Import Transactions**:
```
POST /api/bulk-import/import
Body: { transactions: Transaction[], skipDuplicates: boolean }
Response: {
  imported: number,
  skipped: number,
  failed: number,
  details: ImportDetail[]
}
```

---

## UI/UX Specifications

### **Button Placement**
- Location: Transactions page toolbar, before "Add Transaction" button
- Label: "Bulk Import" or "Import CSV"
- Icon: Upload icon or file icon
- Styling: Secondary button (not primary CTA)

### **Modal Specifications**
- **Title**: Consistent across all steps
- **Step Indicator**: Show "Step X of 4" at top
- **Width**: 700-900px (responsive)
- **Close Button**: X in top right (cancel entire flow)
- **Background**: Blur existing content
- **Scrollable**: Content area scrollable, buttons fixed at bottom

### **Table Styling** (Step 4)
- Row height: 50px (normal), 200px (expanded with edits)
- Scrollable horizontal (for mobile)
- Zebra striping for readability
- Color coding:
  - 🟢 Green: Valid rows
  - 🔴 Red: Error rows
  - 🟡 Yellow: Warning/Duplicate rows
  - ⚪ White: Unchecked rows

### **Responsive Design**
- Mobile: Stack fields vertically in inline editing
- Tablet: Show essential columns only, hide Notes/Frequency
- Desktop: Show all columns

---

## Error Messages Reference

### **Validation Errors**

| Field | Error Code | Message | Suggestion |
|-------|-----------|---------|-----------|
| Type | INVALID_TYPE | Type must be INCOME, EXPENSE, or TRANSFER | Show: "Valid types: INCOME, EXPENSE, TRANSFER" |
| Type | MISSING | Type is required | Show: "Please specify transaction type" |
| Amount | MISSING | Amount is required | Show: "Enter the transaction amount" |
| Amount | INVALID | Amount must be a positive number | Show: "Example: 150.50" |
| Amount | INVALID_FORMAT | Invalid amount format | Show: "Use format like: 1000.50 (no currency symbols)" |
| Date | MISSING | Transaction Date is required | Show: "Enter date" |
| Date | INVALID | Invalid date format | Show: "Use YYYY-MM-DD or MM-DD-YYYY" |
| Date | OUT_OF_RANGE | Date is too far in past or future | Show: "Date must be between 1974 and 2025" |
| Account | MISSING | Account is required | Show: "Select an account" |
| Account | NOT_FOUND | Account 'XYZ' not found | Show: "Valid accounts: MY_CHECKING, SAVINGS, CREDIT_CARD" |
| Category | MISSING | Category is required | Show: "Select a category" |
| Category | NOT_FOUND | Category 'XYZ' not found | Show: "Valid categories: GROCERIES, DINING, TRANSPORT" |
| Category | WRONG_TYPE | Category 'SALARY' is only for INCOME | Show: "Use SALARY for INCOME only" |
| From Account | NOT_FOUND | From Account 'XYZ' not found | Show: "Valid accounts: ..." |
| From Account | SAME_AS_TO | From and To accounts cannot be same | Show: "Choose different accounts" |
| To Account | NOT_FOUND | To Account 'XYZ' not found | Show: "Valid accounts: ..." |
| Frequency | INVALID | Invalid frequency | Show: "Valid: none, daily, weekly, monthly, yearly" |

---

## Code Structure

### **Component Hierarchy**

```
BulkImportButton (Toolbar)
  ↓
BulkImportModal (4-step wizard)
  ├─ Step1: ImportSourceModal
  │   ├─ FileUploadSection
  │   ├─ PasteCSVSection
  │   └─ ExampleFormatSection
  │
  ├─ Step2: CSVPreviewModal
  │   ├─ RawDataPreview (table)
  │   └─ CSVStats
  │
  ├─ Step3: ColumnMappingModal
  │   ├─ ColumnMappingTable
  │   ├─ MappedFieldsPreview
  │   └─ MandatoryFieldsValidator
  │
  └─ Step4: ValidationModal
      ├─ ImportSummary (stats box)
      ├─ TransactionTable
      │   ├─ TransactionRow (normal)
      │   └─ TransactionRowExpanded (with inline editing)
      │       ├─ TypeField
      │       ├─ TitleField
      │       ├─ AmountField
      │       ├─ DateField
      │       ├─ AccountField
      │       ├─ CategoryField
      │       ├─ FromAccountField (for transfers)
      │       ├─ ToAccountField (for transfers)
      │       ├─ FrequencyField
      │       └─ NotesField
      └─ ActionButtons (Import/Cancel)
```

### **Hooks & Utilities**

```
Hooks:
- useBulkImport() - Main state management
  - csvData: string | null
  - parsedRows: any[]
  - columnMapping: Record<string, string>
  - validationResults: ValidationResult[]
  - selectedRows: Set<number>
  - Methods: parseCSV, mapColumns, validate, import

Utilities:
- csvParser.ts
  - parseCSV(text: string): any[]
  - detectHeaders(headers: string[]): MappingConfig
  - normalizeValue(value: any, field: string): any

- validator.ts
  - validateTransaction(tx: any, mapping: MappingConfig): ValidationResult
  - validateField(value: any, field: string, txType: string): FieldValidation
  - checkDuplicates(tx: any): DuplicateResult

- autoCorrector.ts
  - autoCorrectionValue(value: string, field: string): string
  - fuzzyMatchCategory(input: string, validCategories: string[]): string
  - fuzzyMatchAccount(input: string, validAccounts: string[]): string
  - normalizeDate(dateStr: string): string (ISO format)

- csvMapper.ts
  - mapCSVRowToTransaction(row: any, mapping: MappingConfig): Transaction
  - handleTransferLogic(tx: any): Transaction

Services:
- bulkImportService.ts
  - uploadAndParse(file: File): Promise<CSVData>
  - mapColumns(headers: string[]): ColumnMapping
  - validateBatch(rows: any[], mapping: ColumnMapping): ValidationResult[]
  - importTransactions(rows: Transaction[], skipDuplicates: boolean): Promise<ImportResult>
```

### **State Management** (Zustand/Context)

```typescript
type BulkImportState = {
  // Step 1: Source
  csvSource: 'file' | 'paste' | null;
  csvText: string;
  fileName: string | null;
  
  // Step 2: Parsing
  parsedRows: any[];
  headers: string[];
  autoDetectedHeaders: boolean;
  
  // Step 3: Mapping
  columnMapping: Record<string, string>; // csvColumn → field
  mappingValid: boolean;
  
  // Step 4: Validation
  validationResults: ValidationResult[]; // per-row validation
  selectedRowIndices: Set<number>; // which rows to import (default all)
  
  // Methods
  parseCSV: (text: string) => Promise<void>;
  setColumnMapping: (mapping: Record<string, string>) => void;
  validateRows: () => Promise<void>;
  importRows: () => Promise<ImportResult>;
  updateRowValue: (rowIndex: number, field: string, value: any) => void;
  toggleRowSelection: (rowIndex: number) => void;
  reset: () => void;
};
```

---

## Additional Notes

### **Performance Considerations**
- Lazy load validation (validate on demand, not all at once)
- Batch database queries for duplicate checking
- Virtualize table if >1000 rows (use react-window)
- Debounce inline field edits before re-validation

### **Security**
- Validate all CSV input server-side (never trust client)
- Sanitize uploaded file names
- Check file size before processing (max 10MB)
- Rate limit bulk import API (max 1 per minute per user)
- Audit log all bulk imports with user_id, timestamp, row count

### **Future Enhancements**
- CSV template download
- Import history / saved imports
- Scheduled imports (e.g., recurring monthly CSV from bank)
- Export template based on current categories/accounts
- Undo bulk import
- Import from bank API (Plaid, etc.)

---

## Implementation Checklist

- [ ] Create `BulkImportButton` component
- [ ] Create modal components (Step 1-4)
- [ ] Implement CSV parser utility
- [ ] Implement validator utility
- [ ] Implement auto-corrector utility
- [ ] Create useBulkImport hook
- [ ] Create bulk import API endpoints
- [ ] Add transfer support to transactions
- [ ] Add tests for validation rules
- [ ] Add tests for auto-correction logic
- [ ] Create error message system
- [ ] Design and style modal UI
- [ ] Test with sample CSV files
- [ ] Test duplicate detection
- [ ] Test inline editing experience
- [ ] Test transfer transactions
- [ ] Handle edge cases (empty fields, special characters, etc.)
