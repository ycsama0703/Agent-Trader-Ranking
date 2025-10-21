import { NextRequest } from 'next/server'
import { fetchDailyPricesForSymbols } from '@/src/lib/alpaca'
import { getTradeDateYYYYMMDD } from '@/src/lib/util'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol') || 'AAPL').toUpperCase()
  const date = searchParams.get('date') || getTradeDateYYYYMMDD(new Date())
  try {
    const prices = await fetchDailyPricesForSymbols(date, [symbol])
    return Response.json({ ok: true, base: process.env.ALPACA_BASE_URL, feed: process.env.ALPACA_FEED || 'iex', mode: process.env.ALPACA_AUTH_MODE || 'trading', date, symbol, prices })
  } catch (e: any) {
    return new Response(`diag failed: ${e?.message || 'unknown'}`, { status: 500 })
  }
}

