# EZfinance

A mobile-first personal finance manager for tracking accounts, transactions, budgets, goals, and spending analytics. It is a React + TypeScript single-page app with Supabase for authentication and data storage, and Cloudinary for image uploads.

## Features

- **Authentication** — email/password sign up and sign in via Supabase Auth, with protected routes and automatic session refresh.
- **Accounts** — track balances across bank accounts, cash, digital wallets, credit cards, investments, crypto, and more, with per-account currency, icon, and color.
- **Transactions** — record income, expenses, and transfers (with sender/receiver subtypes). Supports notes, categories, recurring frequency (daily/weekly/monthly/yearly), and goal allocations.
- **Bulk import** — import transactions from CSV files through a three-step flow: upload, map columns, then review and correct errors before committing.
- **Attachments** — attach receipt images (JPG/PNG/WebP, up to 6 MB) to transactions, stored in Cloudinary with an in-app preview/download viewer.
- **Budgets** — overall and per-category budgets with weekly/monthly periods, recurring creation, rollover amounts, nested budgets, and a change history log.
- **Goals** — savings goals with deadlines, priorities, statuses, pause/complete/archiving, and contribution tracking.
- **Analytics** — charts and breakdowns of income and expenses by category over time.
- **Settings & profile** — customizable categories and priorities, preferences, notifications, security settings, and profile photos (stored in Cloudinary).
- **Theming** — light/dark themes with a responsive layout optimized for mobile, tablet, and desktop.

## Tech stack

| Area | Technology |
| --- | --- |
| Build tool | Vite 5 |
| UI | React 18, TypeScript, Tailwind CSS, shadcn-ui / Radix UI |
| Routing | React Router 6 |
| Data fetching | TanStack React Query 5 |
| Backend | Supabase (Auth, Postgres database) |
| Charts | Recharts |
| Forms & validation | react-hook-form, zod |
| Files / images | Cloudinary |
| Notifications | Sonner, toast |
| Deployment | Vercel (`vercel.json` included) |

## Project structure

```
src/
  App.tsx                  App shell, providers, and route definitions
  main.tsx                 React entry point
  components/
    AppLayout.tsx          Shared layout (mobile header, bottom nav, <Outlet/>)
    ProtectedRoute.tsx     Auth guard for private routes
    budget/                Budget cards, forms, history, and modals
    bulk-import/           CSV upload, header mapping, and error correction steps
    goals/                 Goal status, pause/delete/view components
    profile/               Profile photo upload
    settings/              Profile, categories, priorities, preferences, etc.
    ui/                    shadcn-ui component primitives
  contexts/                AuthContext, ThemeContext
  hooks/                   Data hooks (useAccounts, useBudgets, useGoals, ...)
  integrations/supabase/   Supabase client and generated database types
  pages/                   Dashboard, Accounts, Transactions, BulkImport,
                           Budget, Analytics, Categories, Goals, Settings, Auth
  types/                   Handwritten domain types and constants
  utils/                   Cloudinary upload, CSV parsing/validation/import helpers
supabase/
  migrations/              SQL migrations for tables, RLS policies, and functions
Docs/                      Implementation and troubleshooting guides
```

## Getting started

### Prerequisites

- Node.js and npm
- A Supabase project (for auth and database)
- A Cloudinary account (for image uploads)

### 1. Install dependencies

```bash
git clone https://github.com/cyberhive54/EZfinance.git
cd EZfinance/EZfinance
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
```

> These files are gitignored. Never commit real credentials.

### 3. Set up Supabase

1. Create a Supabase project and enable email/password authentication.
2. Apply all SQL files in `supabase/migrations/` to your project, in filename order. This creates the tables, enables Row Level Security, and adds policies and database functions. Either paste each file into the Supabase SQL Editor, or use the CLI with a direct database connection (no `link` needed):

   ```bash
   npx supabase db push \
     --remote="postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
     --yes
   ```

   After pushing, regenerate the typed client from the live schema:

   ```bash
   npx supabase gen types typescript --schema public \
     --remote="postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
     > src/integrations/supabase/types.ts
   ```

3. Add your site URL (e.g. `http://localhost:5173`) to the allowed redirect URLs in Supabase Auth settings.

### 4. Set up Cloudinary

1. Create an **unsigned** upload preset and set it in `VITE_CLOUDINARY_UPLOAD_PRESET`.
2. Uploads go to the `ezfinance/transactions` and `ezfinance/profile` folders in your Cloudinary cloud.
3. Deleting files from Cloudinary requires the Admin API and should be handled by a backend service; the app only removes database records on delete.

### 5. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` by default.

## Project context

`PRODUCT.md` records product truth, capabilities, data model and constraints. `DESIGN.md` records the design system and the reasoning behind its tokens. Read both before making changes.

## Design system

The UI follows an Apple-native reference: a cool neutral ramp with a single blue accent, a system font stack, a small radius scale (8/10/12px), and elevation reserved for floating layers. Motion is quick and state-driven, with `prefers-reduced-motion` and `prefers-reduced-transparency` support. Tokens live in `src/index.css` and `tailwind.config.ts`; categorical chart/picker colors come from the single shared palette in `src/lib/palette.ts`. Navigation is defined once in `src/lib/navigation.ts`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run seed` | Re-seed demo data for `cybermart2022@gmail.com` (requires `DB_URL`) |

`npm run seed` connects directly to Postgres and replaces that user's demo data. Run it as
`$env:DB_URL = "postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"; npm run seed`.

## Deployment

The project includes a `vercel.json` configured for Vite: it builds with `npm run build`, serves `dist/`, and rewrites all routes to `/` for client-side routing. Set the same environment variables in your Vercel project settings before deploying.

## Notes

- All feature data is scoped to the signed-in user via Supabase Row Level Security policies.
- The generated Supabase typings in `src/integrations/supabase/types.ts` may lag behind newer migrations; regenerate them from your Supabase schema if you extend the database.
- Additional design and implementation notes are available in the `Docs/` directory.
