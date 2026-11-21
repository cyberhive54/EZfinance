# PRODUCT.md — EZfinance

## Product truth

EZfinance is a mobile-first personal finance manager. A signed-in user records accounts, transactions, budgets and goals; the app turns those records into balances, spending progress and analytics. It is a single-page web app with no server-side application code: Supabase provides authentication, Postgres storage and Row Level Security, and Cloudinary stores receipt and profile images. There is no backend API, no payment processing and no multi-tenant organisation model — every row belongs to one `auth.users` identity.

**Repository:** https://github.com/cyberhive54/EZfinance
**Deployment:** Vercel (`vercel.json`, Vite static build).
**Environment:** see `.env.example`; real values live in untracked `.env.local`.

## Audience and use scene

One person managing their own money on a phone or desktop. The primary job is fast capture of an expense or income, followed by checking whether spending stays inside budgets and goals. The UI is therefore dense but calm: native-feeling controls, immediate press feedback, no decorative motion, and readable dark mode.

## Capabilities

- **Auth:** email/password sign up and sign in via Supabase Auth, protected routes, persisted session with token refresh.
- **Accounts:** bank, cash, wallet, credit, investment, crypto and other account types, each with a currency, balance, icon and colour. Transfers are stored as a sender/receiver pair.
- **Transactions:** income, expense, transfer-sender and transfer-receiver types; amount, category, date, notes, recurring frequency (`none`, `daily`, `every-2-days`, `weekly`, `monthly`, `yearly`), optional goal allocation, and image attachments.
- **Bulk import:** three-step CSV wizard — upload/paste, map columns, review and correct errors, then import with a result summary.
- **Budgets:** overall and per-category budgets; weekly/monthly periods; recurring creation; rollover amount; manual rollover; nested budgets via `parent_budget_id`; change history in `budget_logs`.
- **Goals:** target amount, current amount, deadline, priority, status (active/paused/completed), archiving, contribution tracking via transactions, and `goal_logs` audit entries.
- **Analytics:** monthly income/expense summaries, category breakdown and account breakdown using Recharts.
- **Settings:** profile (including Cloudinary profile photo), preferences, categories, priorities, notification information, and security actions.
- **Themes:** light/dark/system, resolved before first paint, following OS changes while in system mode.

## Data model (public schema)

`profiles`, `accounts`, `categories`, `transactions`, `transaction_attachments`, `budgets`, `budget_logs`, `goals`, `goal_logs`, `priority_types`. Every user-owned table has Row Level Security enabled with policies scoped to `auth.uid() = user_id`; default categories and priorities are visible to all users. Database functions: `update_account_balance(account_id, amount_change)` and `create_recurring_budgets()`. All migrations live in `supabase/migrations/` and are applied in filename order.

## Constraints and non-goals

- Client-side app: the Supabase **publishable** key is public by design; a service-role/secret key must never be placed in `VITE_*` variables.
- Cloudinary uploads use an **unsigned** preset. Deleting Cloudinary assets needs Admin API credentials and is intentionally not implemented client-side; the app only deletes database records.
- Notifications are informational only — the app does not send email or push messages in this version.
- No rate limiting or WAF is configured in the client; Supabase Auth and Vercel provide the platform-level controls.
- The CSV importer is client-side and bounded by the browser; there is no server-side import queue.

## Known gaps (tracked, not hidden)

- A few shadcn UI primitives are unused (`command`, `drawer`, `sidebar`, etc.); their dependencies are installed only to keep type-checking green.
- `useAnalytics`, `useBudgets`, `useGoals` and `useCategories` do not expose query errors directly; pages use `useQueryError` from `src/components/ui/error-state.tsx` as an interim observer.
- `react-day-picker` requires v9's `Chevron` API; the shared Calendar wrapper already uses it.
- The seed script `seed-demo.mjs` replaces demo data for `cybermart2022@gmail.com` and requires a `DB_URL` environment variable.

## Verification commands

```bash
npm run build                       # Vite production build
npx tsc -p tsconfig.app.json --noEmit # type-check (currently clean)
npx supabase db push --remote="<DB_URL>" --yes
node seed-demo.mjs                  # with DB_URL set
```
