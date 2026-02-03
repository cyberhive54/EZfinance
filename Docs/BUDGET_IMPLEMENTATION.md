# Budget Function Implementation Guide

## Overview
The budget system in EZfinance is a comprehensive expense tracking and control mechanism that allows users to set spending limits across different categories or for overall expenses, with support for recurring budgets, rollover amounts, and period-based tracking.

---

## Core Components

### 1. **useBudgets Hook** (`/src/hooks/useBudgets.ts`)
The main hook managing all budget operations.

#### Key Interfaces:
- **Budget**: Core budget entity with properties:
  - `id`: Unique identifier
  - `user_id`: Owner of the budget
  - `category_id`: Target category (null for overall budgets)
  - `amount`: Budget limit
  - `period`: "weekly" | "monthly" | "yearly" | "custom"
  - `start_date`: When budget begins
  - `end_date`: When budget ends (optional)
  - `is_recurring`: Auto-creates next period budget if true
  - `rollover_amount`: Unused budget carried over to next period
  - `is_overall`: True = all expenses, False = specific category

#### Key Functions:

**getPeriodDates(period, referenceDate)**
- Calculates start/end dates based on period type
- Returns: `{ start: Date, end: Date }`
- Used for: Determining budget date ranges

**logBudgetAction(budgetId, userId, action, details)**
- Logs budget changes to `budget_logs` table
- Actions: "created", "updated", "deleted"
- Used for: Audit trail and tracking

---

## Budget Logic & Rules

### Period Types & Date Calculation:
\`\`\`
Weekly:    Monday - Sunday (ISO week)
Monthly:   1st - Last day of month
Yearly:    Jan 1 - Dec 31
Custom:    User-defined start and end dates
\`\`\`

### Budget Constraints & Validation:

1. **Recurring Budgets**
   - ✅ Only "weekly" and "monthly" periods can recur
   - ❌ "yearly" and "custom" periods cannot be recurring
   - Auto-validated in `createMutation` and `updateMutation`

2. **Category-Based Budgets**
   - Must have `category_id` specified (expense categories only)
   - `is_overall` must be false
   - Cannot have both category AND overall flag

3. **Overall Budgets**
   - No `category_id` required
   - Tracks ALL expenses in the period
   - `is_overall` flag must be true

4. **Rollover Logic**
   - Unused budget amount carries to next period
   - Calculation: `totalBudget = amount + rollover_amount`
   - Applied automatically when spending is calculated

---

## Spending Calculation System

### How Spending is Tracked:

**For Overall Budgets:**
\`\`\`typescript
1. Fetch all transactions in budget date range
2. Filter: type === "expense"
3. Sum all amounts for that period
4. Compare: spent vs (amount + rollover_amount)
\`\`\`

**For Category Budgets:**
\`\`\`typescript
1. Fetch all transactions in budget date range
2. Filter: type === "expense" AND category_id === budget.category_id
3. Sum amounts for that category in that period
4. Compare: spent vs (amount + rollover_amount)
\`\`\`

### Multi-Budget Optimization:
- `spendingQuery` uses a single database fetch for efficiency
- Retrieves all transactions between min(start_dates) and max(end_dates)
- Filters in-memory by budget specifications
- Prevents N+1 query problem

---

## Budget Status & Indicators

### Status Calculation in Components:

**OverallBudgetCard.tsx:**
\`\`\`
percentage = (spent / totalBudget) × 100
isOverBudget = spent > totalBudget
remaining = max(totalBudget - spent, 0)
\`\`\`

**BudgetCard.tsx:**
\`\`\`
Same logic, but applies only to specific category
Progress bar color changes when spent > budget
\`\`\`

### Warning States:
- ⚠️ **Over Budget**: Red indicator when `spent > totalBudget`
- ✓ **Within Budget**: Green/normal color when `spent <= totalBudget`
- 📊 **Progress Percentage**: Visual bar capped at 100% even if over

---

## Query System & Caching

### React Query Keys:
\`\`\`
["budgets", "active", userId]           // Current period budgets
["budgets", "history", userId]          // Past budgets
["budget-spending", userId, budgetIds]  // Spending amounts
["budget-history-spending", ...]        // Historical spending
\`\`\`

### Query Dependencies:
1. `budgetsQuery`: Fetches active budgets (current date within range)
2. `categoriesQuery`: Lists all expense categories (for category budgets)
3. `spendingQuery`: Calculates spending (depends on `budgetsQuery`)
4. Invalidates on mutations: create, update, delete operations

---

## Recurring Budget System

### How Recurring Works:

1. **Creation Phase**:
   - User creates budget with `is_recurring: true`
   - Only valid for weekly/monthly periods
   - Initial budget created with calculated dates

2. **Trigger Phase**:
   \`\`\`typescript
   // On component mount, trigger recurring budget creation
   triggerRecurringMutation.mutate();
   \`\`\`

3. **Database Function**:
   - Calls Supabase RPC: `create_recurring_budgets()`
   - Function checks for budgets where `is_recurring = true` and `end_date < today`
   - Creates new budget with advanced dates (next week/month)
   - Carries over unused amount via `rollover_amount`

---

## Data Flow Diagram

\`\`\`
User Creates Budget
    ↓
validateInput (period constraints)
    ↓
Insert to DB + Log Action
    ↓
Query Client Invalidation
    ↓
budgetsQuery Re-fetches ←→ spendingQuery Re-fetches
    ↓
Components Re-render (OverallBudgetCard / BudgetCard)
    ↓
Display Status: Within/Over Budget
\`\`\`

---

## API Endpoints (Supabase)

### Tables:
- `budgets`: Stores budget definitions
- `budget_logs`: Audit trail of changes
- `transactions`: Source of spending data

### RPC Functions:
- `create_recurring_budgets()`: Auto-creates next period budgets

---

## Common Operations

### Create Budget:
\`\`\`typescript
await createBudget({
  category_id: "cat-id",      // Optional for category budget
  amount: 500,
  period: "monthly",
  is_recurring: true,         // Only valid for weekly/monthly
  is_overall: false,          // false if category_id provided
});
\`\`\`

### Update Budget:
\`\`\`typescript
await updateBudget({
  id: "budget-id",
  amount: 600,                // Change limit
  is_recurring: false,        // Toggle recurrence
});
\`\`\`

### Delete Budget:
\`\`\`typescript
await deleteBudget("budget-id");
// Logs deletion before removal
\`\`\`

---

## UI Components

### OverallBudgetCard:
- Shows global spending limits
- Displays: Budget amount, Spent, Remaining
- Includes period badge and recurring indicator

### BudgetCard:
- Shows category-specific limits
- Icon and color based on category
- Same metrics as overall card

### BudgetHistory:
- Displays past budgets
- Shows final spending vs allocated amount
- Links to detailed transaction view

---

## Troubleshooting

### Common Issues:

1. **Recurring Budgets Not Creating**
   - Check: Budget period is "weekly" or "monthly"
   - Check: `is_recurring: true`
   - Check: Database RPC function exists

2. **Overspending Not Showing**
   - Check: `spent > totalBudget` calculation
   - Check: All transactions included in date range
   - Check: Category filter applied correctly

3. **Spending Calculation Wrong**
   - Check: Date range filters (start_date ≤ tx.date ≤ end_date)
   - Check: Category_id matches if category budget
   - Check: Only expense-type transactions counted

---

## Performance Notes

- Uses React Query for caching to avoid unnecessary re-fetches
- Batches spending queries to minimize database calls
- Rolls up recurring budget creation to database level
- Chart updates are memoized to prevent unnecessary recalculations
