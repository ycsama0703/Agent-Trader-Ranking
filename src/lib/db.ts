import { Pool } from 'pg'

const connectionString = process.env.DB_URL
if (!connectionString) {
  console.warn('DB_URL is not set. Database operations will fail until set.')
}

export const pool = new Pool({ connectionString })

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>{
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return { rows: res.rows as T[] }
  } finally {
    client.release()
  }
}

export type Agent = {
  id: number
  name: string
  prompt: string | null
  provider?: string | null
  model?: string | null
  base_url?: string | null
  api_key_env?: string | null
  active?: boolean | null
}

// Ensure newer columns exist for convenience when users haven't run schema.sql manually
export async function ensureAgentColumns() {
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai';`)
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini';`)
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS base_url TEXT;`)
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_env TEXT DEFAULT 'OPENAI_API_KEY';`)
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;`)
}
