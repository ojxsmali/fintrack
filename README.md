# FinTrack

*Designed & built by [**Ojas Mali**](https://github.com/ojxsmali)*

**Live demo → [fintrack-ojasmali.vercel.app](https://fintrack-ojasmali.vercel.app)** — open the prototype, or build your own; no sign-up needed.

**Where your money goes, what's changing, and what deserves attention.**

FinTrack is a personal finance web app that turns raw transactions into a calm monthly picture: your balance, what came in, what went out, how you're pacing against last month, which budgets need attention, and short insights. Each insight shows the calculation it comes from.

> Screenshots: _placeholder. Add `docs/overview.png`, `docs/transactions.png` and `docs/mobile.png` after deploying._

---

## Features

| Area | What it does |
|---|---|
| **Overview** | Greeting with a one-line summary, total balance, this month's income / spending / saved, savings rate, budget usage and spending pace (each with its formula on demand), a cumulative spending-pace chart vs last month, "Worth your attention" insights, spending by category, budget progress and recent transactions. |
| **Transactions** | Search (merchant, description, notes), filter by type, category and period (presets or a custom range), sort by date or amount, server-side pagination. A table on tablet/desktop and a day-grouped list on phones. Add, view, edit and delete happen in a side panel (a bottom sheet on phones), and every delete asks for confirmation. CSV export. |
| **Budgets** | One monthly limit per spending category. Shows spent, remaining and % used, with three states: on track, close to limit (≥ 80%) and over budget (> 100%). Step back through previous months, and see spending that has no budget. |
| **Analytics** | Highlights (biggest spending day, no-spend days, largest category), balance over time, average spending by weekday, income sources, largest expenses (one per merchant), and a period picker (this month, last month, last 3 / 6 months, this year, custom). KPIs with change vs the previous equal-length period, shown only when your history actually covers it. Income vs spending by month, savings rate by month, spending by category with change, top merchants, and category trend sparklines. Every chart has a "View table" alternative. |
| **Settings** | Display name, currency (every current ISO currency, formatted with its own symbol, digit grouping and decimal places), accounts and starting balances, budget-warning preference, CSV export, loading or removing sample data, deleting all transactions, sign out. |
| **Auth** | Email + password sign-up and sign-in through Supabase Auth, persistent sessions and protected routes. Cached data is cleared on sign-out. |
| **Two ways in, no sign-up** | The welcome page offers **See the prototype** (a workspace pre-filled with labelled sample data) and **Build your own FinTrack** (a workspace that starts from zero for tracking your own money). Both are stored only in that browser, kept separate, and can be erased from Settings. Real accounts are optional. |

**Deliberately left out of v1:** dark mode, recurring transactions, goals, multiple currencies with conversion, and bank sync (see *Future improvements*). Insights are deterministic calculations, so they are called **Insights**, not "AI Insights".

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + TypeScript, Vite | Fast dev loop and a static build that deploys anywhere. The app sits behind a login, so server rendering adds nothing. |
| Styling | Tailwind CSS v4 with design tokens in `@theme` | Tokens live as CSS variables in one file (`src/index.css`). |
| Server state | TanStack Query | Caching, de-duplication, invalidation after writes, and safe optimistic deletes. No Redux; there is almost no client-only global state. |
| Routing | React Router 7 | Routes are code-split so the login page never loads the chart library. |
| Charts | Recharts | Line and bar charts with custom tooltips. Category bars and sparklines are plain HTML, which is lighter and more accessible. |
| Backend | Supabase (Postgres + Auth + Row Level Security) | Real auth and a relational schema, with security enforced in the database. |
| Icons | Lucide | Used sparingly, mostly in navigation. |
| Fonts | Geist (UI and numbers), Instrument Serif (greeting and auth headline only) | Self-hosted through Fontsource, so there are no third-party font requests. |
| Tests | Vitest + Testing Library; PGlite for database checks | |

Framer Motion was not added. The only motion is short CSS transitions (120–180 ms), which are disabled under `prefers-reduced-motion`.

---

## Architecture

```
src/
  components/
    ui/            Button, Field/Input/Select/Textarea/Toggle, Dialog (modal + drawer),
                   Toast, Segmented, Panel, PeriodPicker, Money, States (Skeleton/Empty/Error), Logo
    layout/        AppShell (sidebar / icon rail / bottom tabs), ErrorBoundary
    dashboard/     InsightList
    transactions/  TransactionEditor (context + drawer: view / edit / create / delete), TransactionList
    budgets/       BudgetProgress
    charts/        ChartFrame (legend + summary + table view), Charts (pace, income/expense, savings), CategoryBars
  hooks/           useFinance (queries + mutations), useDashboard (derived overview), useExportCsv
  lib/             finance.ts (all calculations), insights.ts, validation.ts, format.ts,
                   dates.ts, periods.ts, sampleData.ts         ← pure, unit-tested
  services/        repository.ts (FinanceRepo interface + safe errors), supabaseRepo.ts,
                   demoRepo.ts, auth.tsx (AuthProvider), backend.ts (mode detection)
  pages/           Dashboard, Transactions, Budgets, Analytics, Settings, AuthPages
  types/           finance.ts
supabase/
  migrations/      20261120000000_init.sql  (schema, constraints, RLS, views, signup trigger)
  tests/           rls-check.mjs            (security + constraint checks against real Postgres)
  config.toml
```

**Data flow:** page → hook (TanStack Query) → `FinanceRepo` → Supabase. Components never import the Supabase client. Calculations are pure functions in `lib/`, so the numbers on screen are the numbers in the tests.

**Two backends, one interface.** Signed-in users talk to Supabase. Guests who choose **See the prototype** or **Build your own FinTrack** get the same app backed by a browser-only store (`localStorage`, one key per workspace), with a banner saying which one they are in. If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set at all, the guest demo is the only option and account sign-up is hidden. Guest data never reaches the server and is not a substitute for an account.

---

## Database schema

```
auth.users ─┬─< profiles (id = user id)        display_name, currency, show_budget_warnings
            ├─< accounts                       name, kind (bank|card|cash|wallet), starting_balance
            ├─< categories                     name, kind (income|expense)          unique (user, lower(name), kind)
            ├─< transactions                   account_id, category_id, type, amount > 0, merchant,
            │                                  description, notes, occurred_on, is_sample
            └─< budgets                        category_id (expense only), monthly_limit > 0, is_sample
                                               unique (user, category)
views (security_invoker): account_balances, monthly_summaries
```

Integrity is enforced by the database, not only the UI:

- **Composite foreign keys** `(category_id, user_id, type) → categories(id, user_id, kind)` and `(account_id, user_id) → accounts(id, user_id)`. A transaction cannot point at another user's category or account, and an expense cannot be filed under an income category.
- `CHECK` constraints on amounts (positive, bounded), text lengths and date range.
- A budget can only reference an expense category (`kind = 'expense'` plus the composite FK).
- Indexes on `(user_id, occurred_on desc)` and `(user_id, category_id, occurred_on)`.
- A signup trigger (`handle_new_user`, `security definer`, fixed `search_path`) creates the profile, a "Main account" and 16 default categories. Users get their own category rows, so categories can be extended per user later.

`monthly_summaries` is a view, not a table. A stored table would have to be kept in sync, and at personal-finance scale the view is cheap.

---

## Security model

1. **Row Level Security on every table.** Policies allow `select/insert/update/delete` only where `user_id = auth.uid()`; profiles use `id = auth.uid()`. Updates also carry `WITH CHECK`, so a row can't be handed to another user.
2. **The client never supplies `user_id`.** It defaults to `auth.uid()` in Postgres, and any attempt to insert another user's id is rejected by RLS.
3. **Views use `security_invoker = true`,** so they run with the caller's RLS and cannot leak rows.
4. **`anon` has no table privileges** (revoked in the migration).
5. **Only the public anon key reaches the browser.** The service-role key is never used in this codebase. `.env*` files are git-ignored apart from `.env.example`.
6. **No raw database errors reach users.** `supabaseRepo` maps Postgres error codes to plain-language messages, and auth errors are mapped the same way.
7. **CSV export guards against formula injection** (cells starting with `= + - @` are prefixed with `'`). Search input is sanitised before it reaches PostgREST filter syntax.
8. **On sign-in or sign-out the query cache is cleared,** so one user's data can't flash on screen for the next.

`npm run test:db` checks all of this against real Postgres (19 checks: isolation, spoofing, cross-user foreign keys, constraints, views, anonymous access).

---

## How the numbers are calculated

All in `src/lib/finance.ts`. Money is summed in integer paise to avoid floating-point drift. Any ratio without a valid denominator returns `null` and renders as "—", so NaN and Infinity never reach the UI.

| Metric | Formula | Edge cases |
|---|---|---|
| Total balance | Σ account starting balances + Σ income − Σ expenses (all time) | Can be negative (e.g. a card account), shown in clay red |
| Saved (month) | income − expenses | Negative → labelled "Overspent" |
| Savings rate | (income − expenses) ÷ income × 100 | No income → "—" |
| Budget usage | Σ spent in budgeted categories ÷ Σ limits × 100 | No budgets → "—" |
| Budget state | spent ÷ limit: < 80% on track, ≥ 80% close, > 100% over | |
| Spending pace | (spent 1st→today this month − same days last month) ÷ last month's same-days figure × 100 | No baseline → "—" |
| Change vs previous period | (current − previous) ÷ previous × 100, over an equal-length previous window | Hidden unless your history reaches back to the start of that window |
| Avg. daily spend | spending ÷ days elapsed in the period | Future days are not counted |

**Insights** (`src/lib/insights.ts`) are rules with thresholds. For example, a category move must start from at least ₹500 and change by at least 15% before it is reported. Each insight carries a `basis` string with the exact figures, which you can reveal in the UI. With too little data, the panel says nothing rather than guessing.

---

## Running locally

Requirements: Node 20+ (tested on Node 24). For the full backend you also need Docker Desktop and the Supabase CLI (`npx supabase`).

```bash
npm install
npm run dev            # http://localhost:5180 — demo mode if no Supabase env vars are set
```

### With a real Supabase backend (local)

```bash
npx supabase start     # needs Docker; applies supabase/migrations automatically
npx supabase status    # copy "API URL" and "anon key"
cp .env.example .env.local   # paste them in
npm run dev
```

Local auth has email confirmation turned off (`supabase/config.toml`), so sign-up logs you straight in. Local emails are viewable in Inbucket at http://127.0.0.1:54324.

### With a hosted Supabase project

1. Create a project at supabase.com.
2. `npx supabase link --project-ref <ref>`, then `npx supabase db push`. Or paste each file in `supabase/migrations/` into the SQL editor, oldest first.
3. Under Authentication → URL Configuration, set the Site URL to your deployed origin and add `<origin>/**` as a redirect URL.
4. **Email confirmation.** Supabase requires email confirmation by default, and its built-in mailer only sends a few emails per hour. For a portfolio demo, turn off **Authentication → Sign In / Providers → Email → Confirm email** so new accounts can sign in straight away. Turn it back on (and add your own SMTP) for real users.
4. Put the project URL and anon key in `.env.local` (and in your host's environment variables).

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | for real accounts | Public project URL |
| `VITE_SUPABASE_ANON_KEY` | for real accounts | Public anon / publishable key. **Never** the service-role key. |

### Scripts

| | |
|---|---|
| `npm run dev` | dev server on :5180 |
| `npm run build` | type-check + production build |
| `npm test` | unit + integration tests (Vitest) |
| `npm run test:db` | schema, RLS and constraint checks on in-process Postgres (PGlite) |
| `npm run lint` | oxlint |

---

## Deployment (Vercel, free)

1. Push this repo to GitHub.
2. Sign in to [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import the repo. Vercel detects Vite (build `npm run build`, output `dist`).
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the publishable key — never the secret / service_role key). Deploy.
4. In Supabase → **Authentication → URL Configuration**, set the Site URL to your Vercel URL and add `https://<your-app>.vercel.app/**` to Redirect URLs.
5. Every `git push` to `main` redeploys automatically.

`vercel.json` already includes the SPA rewrite (deep links work) and basic security headers. Netlify also works (`public/_redirects` is included).

**Free-tier note:** Supabase pauses free projects after about a week with no activity. If that happens, real sign-in stops until you click **Restore project** in the Supabase dashboard — but the guest demo keeps working, because it needs no backend.

---

## Testing

- **`src/lib/*.test.ts`**: calculations (totals, paise rounding, savings rate with zero income, negative balances, budget thresholds, cumulative pace, empty months), insights (no output without data, thresholds, budget-warning preference), validation (negative, zero and malformed amounts, impossible dates, category kind mismatch), formatting (Indian grouping, true minus sign, no NaN), and period maths.
- **`src/services/demoRepo.test.ts`**: create, edit and delete a transaction with balances updating; the category-kind constraint; search, filter, sort and pagination; one budget per category; sample data is flagged and removable without touching real data; auth error copy.
- **`src/test/app.test.tsx`**: integration test of the redirect to `/login` when signed out, the empty state, add-transaction validation errors, a successful save, the toast, and the dashboard updating without a reload.
- **`supabase/tests/rls-check.mjs`**: database security, see above.

Not covered by automated tests: the live `supabaseRepo` network path and the Supabase sign-up/sign-in round trip. Run these by hand against `supabase start` (see *Known limitations*).

---

## Design decisions

- **Direction.** Warm paper background, ink text, one petrol accent, and muted semantic colours (moss for positive values, ochre for caution, clay for over-budget). Spending is shown in ink rather than red, because spending money is normal and not an error. Structure comes mainly from type, spacing and hairlines, and only some sections sit in bordered panels.
- **Type.** Geist for its neutral, technical tone and true tabular figures (verified: digits render at equal width). Instrument Serif appears only in the greeting and the auth headline, which gives warmth without becoming decoration.
- **Charts.** A cumulative line for "am I on pace?", because daily bars are spiky and hide the trajectory. Horizontal bars for categories, because labels sit next to exact values on a common baseline, which reads better than a donut, especially at 320 px. The two-series colours were checked with a colour-vision-deficiency validator (blue/amber, ΔE ≥ 20 under protanopia and tritanopia). Last month is a dashed neutral line, and every chart has a legend, a written summary and a table view.
- **Navigation.** Labelled sidebar on desktop, icon rail on tablet, bottom tab bar on phones. Research (NN/g) favours visible navigation over hidden menus. On phones, "Add" lives in the top bar so it doesn't compete with the tabs.
- **No dark mode in v1.** People check finances in short, mostly daytime sessions. A proper dark theme needs its own validated chart colours and states rather than inverted colours. The tokens are set up so it can be added later.
- **Empty states** are text only: one sentence, one primary action, plus an optional sample-data shortcut.

### Research references
Linear and Stripe (table density, restrained colour), Mercury (calm, editorial money hierarchy), Ramp (attention-first rather than chart walls), Monzo and Revolut (mobile transaction lists grouped by day); NN/g on hidden vs visible navigation; Smashing Magazine on fintech typography and tabular figures.

---

## Known limitations

- The Supabase network path has not been run end-to-end in this environment because Docker was unavailable. The schema and RLS were verified on real Postgres through PGlite, and the UI was verified against the demo backend, which implements the same interface and constraints.
- One currency per workspace or account. All 150+ current ISO currencies are available, but there is no exchange-rate conversion and no mixing currencies within one account.
- No transfers between accounts. Moving money between your own accounts would currently count as both income and spending.
- Analytics loads the selected window's transactions and aggregates them in the browser. This is fine for personal volumes. Large histories should move to SQL aggregates through the existing `monthly_summaries` view or RPCs.
- Lint reports React-Compiler-style warnings (no errors) about `new Date()` during render and setState in effects.

## Future improvements

Recurring transactions and subscription detection; goals; transfers between accounts; CSV import; multiple currencies with FX; bank sync (Account Aggregator / Plaid); email or push budget alerts (the preference already exists); shared budgets; a carefully designed dark theme; an AI assistant that cites the same deterministic `basis` data.

---

## Author

[**Ojas Mali**](https://github.com/ojxsmali) — design, frontend, data model and security.
Credit (linked to GitHub) appears on the welcome page, the sign-in pages and the app sidebar — configured in `src/lib/brand.ts`.

Licensed under the MIT License.
