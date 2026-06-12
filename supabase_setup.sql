-- ─────────────────────────────────────────────────────────────────
-- Zordr Budget Planner — Supabase SQL Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────

-- 1. Daily entries table
CREATE TABLE IF NOT EXISTS daily_entries (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE UNIQUE NOT NULL,
  bank_balance  NUMERIC,
  notes         TEXT,
  expenses      JSONB DEFAULT '{}',
  gmv           JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_entries_date_idx ON daily_entries (date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER daily_entries_updated_at
  BEFORE UPDATE ON daily_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Settings table
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Seed defaults (skipped if rows already exist)
INSERT INTO settings (key, value) VALUES
  ('colleges', '[
    {"id":"c1","name":"College 1","type":"normal","commission":2.5},
    {"id":"c2","name":"College 2","type":"normal","commission":2.5},
    {"id":"c3","name":"College 3","type":"normal","commission":2.5},
    {"id":"c4","name":"College 4","type":"zordr_first","commission":2.5},
    {"id":"c5","name":"College 5","type":"zordr_first","commission":2.5}
  ]'),
  ('expense_categories', '[
    {"id":"team","label":"Team salaries","color":"#5DCAA5","budget":45000},
    {"id":"adoption","label":"Adoption / marketing","color":"#F0997B","budget":36000},
    {"id":"travel","label":"Travel","color":"#B4B2A9","budget":5000},
    {"id":"infra","label":"Server & infra","color":"#FAC775","budget":10000},
    {"id":"hardware_upfront","label":"Hardware (upfront)","color":"#AFA9EC","budget":0},
    {"id":"hardware_emi","label":"Hardware EMI","color":"#7F77DD","budget":0},
    {"id":"other","label":"Other / misc","color":"#D3D1C7","budget":0}
  ]')
ON CONFLICT (key) DO NOTHING;

-- 3b. MIGRATION — run this section if you already had the old schema
-- (rename revenue -> gmv, add commission field to existing colleges)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_entries' AND column_name = 'revenue'
  ) THEN
    ALTER TABLE daily_entries RENAME COLUMN revenue TO gmv;
  END IF;
END $$;

-- Add commission: 2.5 to any existing college entries missing it
UPDATE settings
SET value = (
  SELECT jsonb_agg(
    CASE WHEN elem ? 'commission' THEN elem
         ELSE elem || jsonb_build_object('commission', 2.5)
    END
  )
  FROM jsonb_array_elements(value) AS elem
)
WHERE key = 'colleges';

-- 4. Row Level Security (open access — no auth required)
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_daily_entries" ON daily_entries
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_settings" ON settings
  FOR ALL USING (true) WITH CHECK (true);
