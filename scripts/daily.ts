#!/usr/bin/env tsx
import 'dotenv/config'
import { query, ensureAgentColumns } from '@/src/lib/db'
import { parseUniverseFromEnv, getTradeDateYYYYMMDD } from '@/src/lib/util'
import { fetchDailyPricesForSymbols } from '@/src/lib/alpaca'
import { computeDayReturn } from '@/src/lib/returns'
import { callAgentLLMWithProvider as callAgentLLM, validatePortfolio } from '@/src/lib/ai'

type Agent = { id: number; name: string; prompt: string | null; provider?: string | null; model?: string | null; base_url?: string | null; api_key_env?: string | null }

async function main() {
  const tradeDate = getTradeDateYYYYMMDD(new Date())
  const symbols = parseUniverseFromEnv()
  if (symbols.length === 0) throw new Error('SYMBOL_UNIVERSE is empty')

  console.log(`[daily] trade_date=${tradeDate} symbols=${symbols.length}`)

  // Fetch prices
  const prices = await fetchDailyPricesForSymbols(tradeDate, symbols)
  console.log(`[daily] fetched prices for ${Object.keys(prices).length} symbols`)

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

  // Ensure schema then load agents
  await ensureAgentColumns()
  const { rows: agents } = await query<Agent>('SELECT id, name, prompt, provider, model, base_url, api_key_env FROM agents WHERE COALESCE(active, TRUE) = TRUE ORDER BY id ASC')
  console.log(`[daily] agents=${agents.length}`)

  const marketContext = { trade_date: tradeDate, prices }

  for (const agent of agents) {
    console.log(`[daily] agent=${agent.name}`)
    let portfolio = null
    if (agent.prompt) {
      portfolio = await callAgentLLM({
        name: agent.name,
        prompt: agent.prompt,
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

  console.log('[daily] done')
}

main().catch(err => {
  console.error('[daily] failed', err)
  process.exit(1)
})
