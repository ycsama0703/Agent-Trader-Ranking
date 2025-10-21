-- Core tables per spec
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT,
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o-mini',
  base_url TEXT,
  api_key_env TEXT DEFAULT 'OPENAI_API_KEY',
  active BOOLEAN DEFAULT TRUE
);

-- Ensure columns exist for upgraded databases
ALTER TABLE agents ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS base_url TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_env TEXT DEFAULT 'OPENAI_API_KEY';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS prices (
  trade_date DATE NOT NULL,
  ticker TEXT NOT NULL,
  open DOUBLE PRECISION,
  close DOUBLE PRECISION,
  PRIMARY KEY (trade_date, ticker)
);

CREATE TABLE IF NOT EXISTS results (
  trade_date DATE NOT NULL,
  agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
  portfolio JSONB,
  day_return DOUBLE PRECISION,
  PRIMARY KEY (trade_date, agent_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_results_date ON results(trade_date);
CREATE INDEX IF NOT EXISTS idx_prices_date ON prices(trade_date);
