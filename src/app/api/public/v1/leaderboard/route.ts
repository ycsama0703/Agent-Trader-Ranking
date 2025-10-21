import { NextRequest } from 'next/server'
import { query } from '@/src/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) {
    return new Response('Missing date', { status: 400 })
  }
  const capital = Number(process.env.NOMINAL_CAPITAL || '10000') || 10000
  const sql = `
    SELECT a.id as agent_id, a.name as agent_name, a.provider, a.model, r.day_return
    FROM results r
    JOIN agents a ON a.id = r.agent_id
    WHERE r.trade_date = $1
    ORDER BY r.day_return DESC NULLS LAST
  `
  const { rows } = await query<{ agent_id: number; agent_name: string; provider?: string | null; model?: string | null; day_return: number }>(sql, [date])
  const resp = rows.map((row, idx) => ({
    rank: idx + 1,
    agent_id: row.agent_id,
    agent_name: row.agent_name,
    provider: row.provider || null,
    model: row.model || null,
    day_return: row.day_return,
    day_pnl: (row.day_return ?? 0) * capital
  }))
  return Response.json(resp)
}
