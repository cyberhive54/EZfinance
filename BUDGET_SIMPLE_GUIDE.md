# Budget Function - Simple Explanation

## What is the Budget System?

The budget system lets you set spending limits and track how much you've spent. Think of it like setting a monthly allowance for groceries or entertainment.

---

## Two Types of Budgets

### 1. Overall Budget (Global Limit)
**What**: Total spending limit for everything
**Example**: "I can spend max $2000 this month on anything"
**Tracks**: All expenses combined
**Flag**: `is_overall: true`

### 2. Category Budget (Category Limit)
**What**: Spending limit for specific categories
**Example**: "I can spend max $300 on groceries, $100 on entertainment, $200 on transport"
**Tracks**: Only that category's expenses
**Flag**: `is_overall: false` with `category_id`

---

## Budget Periods

### Available Periods:
- **Weekly**: Monday → Sunday (follows ISO weeks)
- **Monthly**: 1st → Last day of month
- **Yearly**: Jan 1 → Dec 31
- **Custom**: You pick start and end dates

### How Dates Are Set:
```
Period: Monthly
Today: Feb 3, 2026
→ Budget: Feb 1 - Feb 28
→ Automatically calculated, user picks period type
```

---

## Spending Calculation

### Simple Flow:

**For Overall Budget:**
```
1. Get all expenses in the period
2. Add them up
3. Compare to budget limit
4. Show: "You spent $1500 of $2000" (75%)
```

**For Category Budget:**
```
1. Get all expenses in the period AND for that category
2. Add them up
3. Compare to budget limit
4. Show: "Groceries: $280 of $300" (93%)
```

---

## Key Concepts

### Budget Amount
**What**: The limit you set
**Example**: $500 for entertainment
**Used for**: Comparison with actual spending

### Spent Amount
**What**: How much you actually spent in that period
**Example**: $450 on entertainment
**Used for**: Showing progress (450/500 = 90%)

### Remaining Amount
**What**: How much you can still spend
**Calculation**: `remaining = budget - spent`
**Example**: $500 - $450 = $50 left

### Rollover Amount
**What**: Unused budget that carries to next period
**Example**: This month you only spent $450 of $500, so $50 rolls to next month
**New Total**: $500 + $50 = $550 next month
**Used for**: Flexibility month-to-month

---

## Recurring Budgets

### What It Means:
Auto-create the same budget for next period

### How It Works:
```
1. Create budget: Amount $500, Monthly, Recurring=true
2. Budget runs: Feb 1 - Feb 28
3. Around Feb 28, system auto-creates next budget: Mar 1 - Mar 31
4. Same $500 limit, new period
5. Any unused amount (rollover) is added to March budget
```

### Constraints:
- ✅ Works with: Weekly or Monthly
- ❌ Doesn't work with: Yearly or Custom
- ⚠️ Why: System needs predictable period endings

---

## Visual Indicators

### Progress Bar:
```
Under Budget:      [==============    ] 65% spent (Green/Primary color)
Near Limit:        [================  ] 80% spent (Warning color)
Over Budget:       [===================] 110% spent (Red/Destructive)
```

### Status Messages:
```
$450 of $500 spent      → Normal
$500 of $500 spent      → At limit
$520 of $500 spent      → OVER BUDGET ⚠️
```

---

## Practical Examples

### Example 1: Simple Monthly Budget
```
Category: Groceries
Budget Amount: $300
Period: Monthly (Mar 1 - Mar 31)
Recurring: Yes

Week 1: Spent $50  → Progress: 17% (250 left)
Week 2: Spent $40  → Progress: 30% (210 left)
Week 3: Spent $45  → Progress: 45% (165 left)
Week 4: Spent $35  → Progress: 57% (130 left)
Total: $170 of $300 (57%)

Remaining: $130
Rollover to April: $130
Next month's budget: $300 + $130 = $430
```

### Example 2: Annual Budget with Overspending
```
Category: Dining Out
Budget Amount: $200
Period: Monthly (Feb 1 - Feb 28)
Recurring: No

Spent: $220

Status: OVER BUDGET ⚠️
Exceeded by: $20
Percentage: 110%
```

---

## How the System Checks & Rules

### Budget Creation Rules:
1. ✅ Must have amount > 0
2. ✅ Must have valid period type (weekly/monthly/yearly/custom)
3. ✅ If category budget: must pick a category AND set `is_overall: false`
4. ✅ If overall budget: leave category empty AND set `is_overall: true`
5. ⚠️ Recurring only works with weekly/monthly

### Budget Date Range Rules:
1. ✅ Start date ≤ End date
2. ✅ Period dates auto-calculated based on type
3. ✅ Custom period: user provides both start and end
4. ✅ Cannot have negative amounts

### Spending Calculation Rules:
1. ✅ Only counts "expense" type transactions
2. ✅ Only counts transactions within budget date range
3. ✅ For category budgets: only counts that category's expenses
4. ✅ For overall budgets: counts ALL expenses

### Update Rules:
1. ✅ Can modify amount anytime
2. ✅ Can toggle recurring (if weekly/monthly)
3. ✅ Can extend dates on custom periods
4. ✅ Changes logged automatically

---

## Common Scenarios

### Scenario 1: "I spent too much this month"
```
Budget Set: $500
Actually Spent: $600
Overspend: $100

What Happens:
- Red warning appears
- Shows: "Over budget by $100"
- Remaining shows: $0 (you're $100 in debt)
- Next period gets no rollover
```

### Scenario 2: "I saved money this month"
```
Budget Set: $500
Actually Spent: $350
Saved: $150

What Happens:
- Green/normal color
- Shows: "You saved $150"
- $150 rolls to next period
- Next month budget: $500 + $150 = $650
```

### Scenario 3: "My spending varies each week"
```
Weekly Budget: $100

Week 1: Spent $95  (95%)
Week 2: Spent $80  (80%) + $15 rollover
Week 3: Spent $100 (new week, reset)
Week 4: Spent $50  (50%) + $50 rollover

System auto-creates new week budgets with rollovers
```

---

## Data Flow

### Creating a Budget:
```
User selects budget params
  ↓
System calculates date range
  ↓
Validates constraints
  ↓
Saves to database
  ↓
Logs the action
  ↓
Refreshes UI
```

### Updating a Budget:
```
User modifies amount or period
  ↓
Validates new values
  ↓
Updates database
  ↓
Logs the change
  ↓
Recalculates spending
  ↓
Refreshes UI
```

### Recurring Budget (Automated):
```
System checks at midnight
  ↓
Finds budgets where `is_recurring: true` and end_date < today
  ↓
Calculates next period dates
  ↓
Includes rollover amount
  ↓
Creates new budget
  ↓
Updates UI
```

---

## Tracking & History

### What Gets Logged:
1. Budget creation (date, amount, period)
2. Budget updates (what changed)
3. Budget deletion (before deletion)

### Where Logs Live:
- Database table: `budget_logs`
- Each log shows: timestamp, user, action, details
- Used for: Audit trail, undo, history

### History View Shows:
- Past budget periods
- How much was actually spent
- Whether you stayed within budget
- Trend over time

---

## Troubleshooting

### "My budget shows wrong amount"
- Check: Is date range correct?
- Check: Does it include today's transactions?
- Check: Is it the right category?

### "Recurring budget didn't create"
- Check: Period is weekly or monthly? (yearly/custom don't recur)
- Check: `is_recurring` is true?
- Check: Previous budget ended?

### "Overspending isn't showing"
- Check: Spent amount is correct?
- Check: Transactions are in date range?
- Check: Is it counting the right category?

---

## Quick Reference Table

| Feature | Overall Budget | Category Budget |
|---------|-----------------|-----------------|
| Tracks | All expenses | One category only |
| Has category_id | No | Yes |
| is_overall flag | true | false |
| Can be recurring | Weekly/Monthly | Weekly/Monthly |
| Can have custom period | Yes | Yes |
| Shows rollover | Yes | Yes |
| Color coded | Yes (primary) | Yes (category color) |

---

## Key Formulas

```
Percentage = (Spent ÷ (Amount + Rollover)) × 100
Remaining = (Amount + Rollover) - Spent
IsOverBudget = Spent > (Amount + Rollover)
NextBudgetAmount = Amount + Unused
```

---

## Summary

The budget system:
1. **Lets you set spending limits** for specific periods
2. **Tracks actual spending** automatically
3. **Shows visual progress** (percentage, color, remaining)
4. **Warns when over budget**
5. **Carries unused amounts** to next period
6. **Auto-creates recurring budgets** (weekly/monthly)
7. **Logs all changes** for history

Think of it as a financial guardrail that helps you stay on track! 📊
