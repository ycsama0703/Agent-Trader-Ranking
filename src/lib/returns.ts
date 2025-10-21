import type { Portfolio } from './types'

export function computeDayReturn(
  portfolio: Portfolio,
  prices: Record<string, { o: number; c: number }>
): number {
  let r = 0
  for (const p of portfolio.positions) {
    const bar = prices[p.ticker]
    if (!bar || bar.o === 0) continue
    const daily = bar.c / bar.o - 1
    r += p.target_weight * daily
  }
  // cash earns 0 for MVP
  return r
}

