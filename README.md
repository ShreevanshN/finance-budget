# Zordr Budget Planner

Q1 (Jul–Sep 2026) finance tracker for Zordr — built with React + Vite + Supabase.

---

## Quick start

### 1. Run the Supabase SQL (one-time setup)

Go to your Supabase Dashboard → **SQL Editor** → **New query**, paste the contents of `supabase_setup.sql`, and click **Run**.

This creates two tables:
- `daily_entries` — one row per day, stores expenses & revenue as JSONB
- `settings` — stores colleges and expense categories (editable from the UI)

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Environment variables

Credentials are pre-filled in `.env`. If you ever rotate your keys, update `.env`:

```
VITE_SUPABASE_URL=https://phuvieywkohrwoovrkqj.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

> **Note:** `.env` is in `.gitignore` — don't commit it to a public repo.

---

## Features

| Feature | Description |
|---|---|
| **Daily log** | Click any past/today row to open a full day editor — log expenses by category and revenue by college |
| **+ Add entry** | Quick-add a single expense or revenue without opening the day editor (keyboard shortcut: `N`) |
| **Monthly summary** | Per-month expense breakdown with budget bars and per-college revenue |
| **Colleges tab** | Per-college revenue, GMV, and adoption spend tracking |
| **Budget health** | Q1 vs budget bars + 4 control triggers (burn rate, bank balance, coverage ratio, net loss) |
| **Settings ⚙** | Edit college names/types and expense categories (color, label, budget) — saved to Supabase |
| **Excel export** | Exports Daily Log, Monthly Summary, and Budget vs Actual sheets |
| **Dark mode** | Toggle with ◑ button or auto-detected from system preference |
| **Supabase sync** | All changes upserted in real-time; app reloads state on mount |

---

## Project structure

```
zordr-budget/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Root component — state, Supabase, layout
│   ├── index.css             # Global resets + keyframes
│   ├── supabaseClient.js     # Supabase singleton
│   ├── constants.js          # Shared data, defaults, helpers
│   ├── exportExcel.js        # XLSX export logic
│   └── components/
│       ├── UI.jsx            # Badge, MetricCard, BudgetBar, Toast, ModalBackdrop
│       ├── DayModal.jsx      # Full day editor modal
│       ├── AddEntryModal.jsx # Quick add expense/revenue modal
│       ├── SettingsModal.jsx # Colleges + categories editor
│       ├── DailyLogTab.jsx   # Daily log table
│       ├── MonthlySummaryTab.jsx
│       ├── CollegeTab.jsx
│       └── BudgetHealthTab.jsx
├── index.html
├── vite.config.js
├── package.json
├── .env                      # Supabase credentials (not committed)
└── supabase_setup.sql        # Run once in Supabase SQL editor
```

---

## Build for production

```bash
npm run build      # outputs to /dist
npm run preview    # preview the production build locally
```
