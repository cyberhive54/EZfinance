import { randomUUID } from "node:crypto";
import { Client } from "pg";

const EMAIL = "cybermart2022@gmail.com";
const client = new Client({ connectionString: process.env.DB_URL });
await client.connect();

const { rows } = await client.query("select id from auth.users where email = $1", [EMAIL]);
if (!rows[0]) throw new Error(`No auth user for ${EMAIL}`);
const uid = rows[0].id;

// Idempotent: clear only this user's demo data, keeping profile and priorities.
for (const table of [
  "transaction_attachments",
  "budget_logs",
  "goal_logs",
  "transactions",
  "budgets",
  "goals",
  "categories",
  "accounts",
]) {
  await client.query(`delete from public.${table} where user_id = $1`, [uid]);
}

const id = () => randomUUID();
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const monthEnd = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

// --- Accounts ---------------------------------------------------------------
const accounts = [
  { name: "HDFC Savings", type: "bank", icon: "Landmark", color: "#0A84FF", base: 4200 },
  { name: "Cash Wallet", type: "cash", icon: "Wallet", color: "#FF9F0A", base: 160 },
  { name: "UPI Wallet", type: "wallet", icon: "Smartphone", color: "#30D5C8", base: 480 },
  { name: "Credit Card", type: "credit", icon: "CreditCard", color: "#FF453A", base: -120 },
  { name: "Investment", type: "investment", icon: "TrendingUp", color: "#34C759", base: 8400 },
];
for (const a of accounts) {
  a.id = id();
  await client.query(
    `insert into public.accounts (id, user_id, name, type, currency, balance, icon, color)
     values ($1,$2,$3,$4,'USD',$5,$6,$7)`,
    [a.id, uid, a.name, a.type, a.base, a.icon, a.color],
  );
}

// --- Categories -------------------------------------------------------------
const categorySpecs = [
  ["Salary", "income", "Briefcase", "#34C759"],
  ["Freelance", "income", "Laptop", "#30D5C8"],
  ["Interest", "income", "TrendingUp", "#5AC8FA"],
  ["Refunds", "income", "Wallet", "#A2845E"],
  ["Rent", "expense", "Home", "#FF453A"],
  ["Groceries", "expense", "ShoppingCart", "#FF9F0A"],
  ["Dining", "expense", "UtensilsCrossed", "#A2845E"],
  ["Coffee", "expense", "Coffee", "#8E8E93"],
  ["Transport", "expense", "Car", "#0A84FF"],
  ["Utilities", "expense", "Zap", "#FF9F0A"],
  ["Shopping", "expense", "ShoppingBag", "#30D5C8"],
  ["Health", "expense", "Pill", "#5AC8FA"],
  ["Entertainment", "expense", "Clapperboard", "#A2845E"],
  ["Subscriptions", "expense", "Music", "#8E8E93"],
];
const categories = {};
for (const [name, type, icon, color] of categorySpecs) {
  const cid = id();
  categories[name] = cid;
  await client.query(
    `insert into public.categories (id, user_id, name, type, icon, color, is_default)
     values ($1,$2,$3,$4,$5,$6,false)`,
    [cid, uid, name, type, icon, color],
  );
}

// --- Goals ------------------------------------------------------------------
const { rows: prios } = await client.query(
  "select id, name from public.priority_types where user_id = $1 order by sort_order",
  [uid],
);
const priority = (name) => prios.find((p) => p.name === name)?.id ?? null;

const goals = [
  { name: "Emergency Fund", target: 10000, current: 6500, deadline: day(180), color: "#0A84FF", icon: "PiggyBank", status: "active", priority: "High" },
  { name: "New Laptop", target: 1800, current: 540, deadline: day(120), color: "#30D5C8", icon: "Target", status: "active", priority: "Medium" },
  { name: "Japan Trip", target: 4000, current: 420, deadline: day(300), color: "#FF9F0A", icon: "Plane", status: "active", priority: "Low" },
  { name: "Home Down Payment", target: 25000, current: 1250, deadline: day(500), color: "#34C759", icon: "Home", status: "active", priority: "High" },
  { name: "New Year Savings", target: 500, current: 500, deadline: day(-30), color: "#5AC8FA", icon: "Gift", status: "completed", priority: "Low" },
];
for (const g of goals) {
  g.id = id();
  await client.query(
    `insert into public.goals (id, user_id, name, target_amount, current_amount, deadline, start_date,
       status, is_archived, color, icon, priority_id, completed_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,$11,$12)`,
    [
      g.id, uid, g.name, g.target, g.current, g.deadline, day(-90), g.status,
      g.color, g.icon, priority(g.priority), g.status === "completed" ? new Date().toISOString() : null,
    ],
  );
  await client.query(
    `insert into public.goal_logs (id, goal_id, user_id, action, details)
     values ($1,$2,$3,'created',$4)`,
    [id(), g.id, uid, JSON.stringify({ name: g.name, target_amount: g.target })],
  );
}

// --- Transactions -----------------------------------------------------------
const A = (name) => accounts.find((a) => a.name === name).id;
const C = (name) => categories[name];
const G = (name) => goals.find((g) => g.name === name).id;

// [type, amount, category, account, description, daysAgo, notes, frequency, goal, goalAmount]
const txSpecs = [
  ["income", 5200, "Salary", "HDFC Savings", "Monthly salary", 1, "Automated credit", "monthly", null, null],
  ["income", 850, "Freelance", "UPI Wallet", "Landing page project", 3, "Client: Northstar", "none", null, null],
  ["income", 42, "Interest", "HDFC Savings", "Savings interest", 7, null, "monthly", null, null],
  ["income", 120, "Refunds", "UPI Wallet", "Returned order", 12, null, "none", null, null],
  ["income", 250, "Freelance", "HDFC Savings", "Weekend consulting", 35, null, "none", null, null],
  ["income", 200, "Salary", "HDFC Savings", "Emergency fund contribution", 22, "Goal allocation", "none", "Emergency Fund", 200],
  ["expense", 1500, "Rent", "HDFC Savings", "Apartment rent", 2, "Monthly rent", "monthly", null, null],
  ["expense", 86.4, "Groceries", "UPI Wallet", "Weekly groceries", 1, null, "weekly", null, null],
  ["expense", 6.5, "Coffee", "Cash Wallet", "Morning coffee", 1, null, "none", null, null],
  ["expense", 18, "Transport", "UPI Wallet", "Ride home", 2, null, "none", null, null],
  ["expense", 112, "Utilities", "HDFC Savings", "Electricity bill", 4, null, "monthly", null, null],
  ["expense", 60, "Utilities", "HDFC Savings", "Internet plan", 5, null, "monthly", null, null],
  ["expense", 74, "Dining", "Credit Card", "Dinner with friends", 6, null, "none", null, null],
  ["expense", 35, "Health", "UPI Wallet", "Pharmacy", 7, null, "none", null, null],
  ["expense", 48, "Health", "Credit Card", "Gym membership", 8, null, "monthly", null, null],
  ["expense", 28, "Entertainment", "UPI Wallet", "Cinema tickets", 9, null, "none", null, null],
  ["expense", 145, "Shopping", "Credit Card", "Running shoes", 10, null, "none", null, null],
  ["expense", 92, "Groceries", "UPI Wallet", "Groceries", 11, null, "weekly", null, null],
  ["expense", 7.2, "Coffee", "Cash Wallet", "Coffee", 12, null, "none", null, null],
  ["expense", 30, "Transport", "UPI Wallet", "Bus pass", 13, null, "monthly", null, null],
  ["expense", 45, "Utilities", "HDFC Savings", "Water bill", 14, null, "monthly", null, null],
  ["expense", 40, "Subscriptions", "Credit Card", "Mobile plan", 15, null, "monthly", null, null],
  ["expense", 56, "Shopping", "UPI Wallet", "Books", 16, null, "none", null, null],
  ["expense", 78, "Groceries", "UPI Wallet", "Groceries", 18, null, "weekly", null, null],
  ["expense", 62, "Dining", "Credit Card", "Birthday dinner", 20, null, "none", null, null],
  ["expense", 150, "Shopping", "HDFC Savings", "Laptop fund contribution", 22, "Goal allocation", "none", "New Laptop", 150],
  ["expense", 5200, "Salary", "HDFC Savings", "Previous month salary", 31, null, "monthly", null, null],
  ["expense", 1500, "Rent", "HDFC Savings", "Previous month rent", 32, null, "monthly", null, null],
  ["expense", 88, "Groceries", "UPI Wallet", "Groceries", 33, null, "weekly", null, null],
  ["expense", 15, "Subscriptions", "Credit Card", "Streaming", 34, null, "monthly", null, null],
];

const balances = Object.fromEntries(accounts.map((a) => [a.name, a.base]));
for (const [type, amount, cat, account, desc, ago, notes, frequency, goal, goalAmount] of txSpecs) {
  const tid = id();
  await client.query(
    `insert into public.transactions
       (id, user_id, account_id, category_id, type, amount, currency, description, notes,
        transaction_date, frequency, next_occurrence_date, goal_id, goal_amount, goal_allocation_type)
     values ($1,$2,$3,$4,$5,$6,'USD',$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      tid, uid, A(account), C(cat), type, amount, desc, notes, day(ago), frequency,
      frequency === "none" ? null : day(30 - ago), goal ? G(goal) : null,
      goalAmount, goal ? "all" : null,
    ],
  );
  balances[account] += type === "income" ? amount : -amount;
}

// Transfer pair between accounts (balance-neutral overall).
for (const [type, account, amount, desc] of [
  ["transfer-sender", "HDFC Savings", -300, "Transfer to UPI wallet"],
  ["transfer-receiver", "UPI Wallet", 300, "Transfer from savings"],
]) {
  await client.query(
    `insert into public.transactions
       (id, user_id, account_id, type, amount, currency, description, transaction_date, frequency)
     values ($1,$2,$3,$4,$5,'USD',$6,$7,'none')`,
    [id(), uid, A(account), type, Math.abs(amount), desc, day(21)],
  );
  balances[account] += amount;
}

for (const a of accounts) {
  await client.query("update public.accounts set balance = $1 where id = $2", [balances[a.name], a.id]);
}

// --- Budgets ----------------------------------------------------------------
const budgetSpecs = [
  [null, "monthly", 3000, true, false, 120, monthStart(), monthEnd()],
  ["Groceries", "monthly", 400, false, true, 35, monthStart(), monthEnd()],
  ["Dining", "monthly", 250, false, false, 0, monthStart(), monthEnd()],
  ["Shopping", "monthly", 300, false, false, 0, monthStart(), monthEnd()],
  ["Transport", "weekly", 80, false, true, 0, day(-7), day(7)],
];
for (const [cat, period, amount, overall, recurring, rollover, start, end] of budgetSpecs) {
  const bid = id();
  await client.query(
    `insert into public.budgets
       (id, user_id, category_id, amount, period, start_date, end_date, is_overall, is_recurring,
        rollover_amount, manual_rollover, enforce_child_limit)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,false)`,
    [bid, uid, cat ? C(cat) : null, amount, period, start, end, overall, recurring, rollover],
  );
  await client.query(
    `insert into public.budget_logs (id, budget_id, user_id, action, details)
     values ($1,$2,$3,'created',$4)`,
    [id(), bid, uid, JSON.stringify({ amount, period })],
  );
}

// --- Profile polish ---------------------------------------------------------
await client.query(
  `update public.profiles
     set full_name = coalesce(full_name, 'Cyber Mart'), preferred_currency = 'USD', theme = 'light'
   where user_id = $1`,
  [uid],
);

const counts = {};
for (const t of ["accounts", "categories", "transactions", "budgets", "goals", "goal_logs", "budget_logs"]) {
  const r = await client.query(`select count(*)::int as n from public.${t} where user_id = $1`, [uid]);
  counts[t] = r.rows[0].n;
}
console.log(JSON.stringify({ userId: uid, counts, balances }, null, 2));
await client.end();
