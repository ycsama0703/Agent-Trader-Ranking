import { chunk } from './util'

type AlpacaBar = {
  T: string // type
  S: string // symbol
  t: string // ISO timestamp
  o: number // open
  c: number // close
}

type BarsResponse = {
  // Single-symbol API returns an array; multi-symbol API may return a map
  bars?: AlpacaBar[] | Record<string, AlpacaBar[]>
}

async function fetchBars(symbols: string[], startISO: string, endISO: string) {
  const base = process.env.ALPACA_BASE_URL || 'https://data.alpaca.markets/v2'
  const key = process.env.ALPACA_API_KEY
  const secret = process.env.ALPACA_API_SECRET
  if (!key || !secret) throw new Error('Alpaca credentials not set')

  const authMode = (process.env.ALPACA_AUTH_MODE || 'trading').toLowerCase()
  function authHeaders() {
    if (authMode === 'broker') {
      const token = Buffer.from(`${key}:${secret}`).toString('base64')
      return { Authorization: `Basic ${token}` }
    }
    return { 'APCA-API-KEY-ID': key, 'APCA-API-SECRET-KEY': secret }
  }

  const url = new URL(`${base}/stocks/bars`)
  url.searchParams.set('timeframe', '1Day')
  url.searchParams.set('symbols', symbols.join(','))
  url.searchParams.set('start', startISO)
  url.searchParams.set('end', endISO)
  // Prefer free Basic plan compatible feed by default; allow override
  const feed = process.env.ALPACA_FEED || 'iex'
  url.searchParams.set('feed', feed)
  // Request one daily bar per symbol and adjusted prices
  url.searchParams.set('limit', '1')
  url.searchParams.set('adjustment', 'all')

  let lastErr: any
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url.toString(), { headers: { ...authHeaders(), accept: 'application/json' } })
      if (!res.ok) {
        let body = ''
        try { body = await res.text() } catch {}
        const reqId = res.headers.get('x-request-id') || ''
        throw new Error(`Alpaca error ${res.status}${reqId ? ` [req:${reqId}]` : ''}${body ? `: ${body}` : ''}`)
      }
      const data = (await res.json()) as BarsResponse
      return data
    } catch (e) {
      lastErr = e
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt))
    }
  }
  throw lastErr
}

export type DailyPriceMap = Record<string, { o: number; c: number }>

export async function fetchDailyPricesForSymbols(
  tradeDate: string,
  symbols: string[]
): Promise<DailyPriceMap> {
  // Build NY day window (00:00 to 23:59 at -04:00/-05:00 is not trivial; Alpaca accepts offsets)
  // Simplify by using full day bounds with fixed -04:00 as per spec example.
  const start = `${tradeDate}T00:00:00-04:00`
  const end = `${tradeDate}T23:59:59-04:00`

  const out: DailyPriceMap = {}
  for (const group of chunk(symbols, 100)) {
    const resp = await fetchBars(group, start, end)
    const bars: any = (resp as any).bars
    if (!bars) continue

    if (Array.isArray(bars)) {
      for (const b of bars as AlpacaBar[]) {
        out[b.S] = { o: b.o, c: b.c }
      }
    } else if (typeof bars === 'object') {
      for (const [sym, arr] of Object.entries(bars as Record<string, AlpacaBar[]>)) {
        const b = (arr as AlpacaBar[])[0]
        if (b) out[sym] = { o: b.o, c: b.c }
      }
    }
  }
  return out
}
