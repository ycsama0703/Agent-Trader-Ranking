import { NextRequest } from 'next/server'
import { query, type Agent, ensureAgentColumns } from '@/src/lib/db'
import { parseUniverseFromEnv, parseUniverseFromString, getTradeDateYYYYMMDD } from '@/src/lib/util'
import { fetchDailyPricesForSymbols } from '@/src/lib/alpaca'
import { callAgentLLMWithProvider as callAgentLLM, validatePortfolio } from '@/src/lib/ai'
import { computeDayReturn } from '@/src/lib/returns'

export async function POST(req: NextRequest) {
  try {
    let tradeDate = getTradeDateYYYYMMDD(new Date())
    let symbols = parseUniverseFromEnv()
    let promptOverride: string | undefined
    // Optional overrides from JSON body: { date: 'YYYY-MM-DD', symbols: 'AAPL,MSFT' | ['AAPL','MSFT'] }
    try {
      const body = await req.json().catch(() => null as any)
      const d = body?.date
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        tradeDate = d
      }
      if (typeof body?.prompt === 'string' && body.prompt.trim().length > 0) {
        promptOverride = body.prompt.trim()
      }
      const sym = body?.symbols
      if (Array.isArray(sym)) {
        const arr = sym.map((s: any) => String(s || '').trim().toUpperCase()).filter(Boolean)
        if (arr.length) symbols = arr
      } else if (typeof sym === 'string') {
        const arr = parseUniverseFromString(sym)
        if (arr.length) symbols = arr
      }
    } catch {}

    // [01] Fetch daily prices for universe
    const prices = await fetchDailyPricesForSymbols(tradeDate, symbols)

    // Persist prices
    const values: any[] = []
    const tuples: string[] = []
    let i = 1
    for (const [ticker, p] of Object.entries(prices)) {
      tuples.push(`($${i++}, $${i++}, $${i++}, $${i++})`)
      values.push(tradeDate, ticker, p.o, p.c)
    }
    if (tuples.length > 0) {
      await query(
        `INSERT INTO prices (trade_date, ticker, open, close)
         VALUES ${tuples.join(',')}
         ON CONFLICT (trade_date, ticker)
         DO UPDATE SET open = EXCLUDED.open, close = EXCLUDED.close`,
        values
      )
    }

    // [02] Ensure schema and load agents
    await ensureAgentColumns()
    const { rows: agents } = await query<Agent>('SELECT id, name, prompt, provider, model, base_url, api_key_env FROM agents WHERE COALESCE(active, TRUE) = TRUE ORDER BY id ASC')

    // [03] Create MarketContext for AI
    const marketContext = { trade_date: tradeDate, prices }

    // [04] For each agent: call AI, validate, compute returns, persist
    for (const agent of agents) {
      let portfolio = null
      const usedPrompt = promptOverride ?? agent.prompt ?? ''
      if (usedPrompt) {
        portfolio = await callAgentLLM({
          name: agent.name,
          prompt: usedPrompt,
          marketContext: { symbols, market: marketContext },
          provider: agent.provider || 'openai',
          model: agent.model || 'gpt-4o-mini',
          base_url: agent.base_url || undefined,
          api_key_env: agent.api_key_env || undefined
        })
      }
      if (!portfolio || !validatePortfolio(portfolio)) {
        portfolio = { cash: 1, positions: [] }
      }
      const dayReturn = computeDayReturn(portfolio, prices)
      await query(
        `INSERT INTO results (trade_date, agent_id, portfolio, day_return)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (trade_date, agent_id)
         DO UPDATE SET portfolio = EXCLUDED.portfolio, day_return = EXCLUDED.day_return`,
        [tradeDate, agent.id, JSON.stringify(portfolio), dayReturn]
      )
    }

    return Response.json({ ok: true, trade_date: tradeDate, agents_processed: agents.length })
  } catch (e: any) {
    console.error('Run failed', e)
    return new Response(`Run failed: ${e?.message || 'unknown'}`, { status: 500 })
  }
}
