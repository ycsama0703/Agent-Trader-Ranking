import { NextRequest } from 'next/server'
import { query } from '@/src/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (!id) return new Response('Invalid id', { status: 400 })
  const capital = Number(process.env.NOMINAL_CAPITAL || '10000') || 10000

  const agentSql = 'SELECT id, name, prompt FROM agents WHERE id = $1'
  const { rows: agents } = await query(agentSql, [id])
  if (agents.length === 0) return new Response('Not found', { status: 404 })

  const resultsSql = `
    SELECT trade_date, day_return, portfolio
    FROM results WHERE agent_id = $1
    ORDER BY trade_date DESC
    LIMIT 14
  `
  const { rows: results } = await query(resultsSql, [id])
  const recent = results.map((r: any) => ({ ...r, day_pnl: (r.day_return ?? 0) * capital }))
  return Response.json({ agent: agents[0], recent })
}
