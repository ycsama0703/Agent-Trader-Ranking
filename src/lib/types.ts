export type PortfolioPosition = {
  ticker: string
  target_weight: number
}

export type Portfolio = {
  cash: number
  positions: PortfolioPosition[]
}

export type PriceBar = {
  t: string // trade date YYYY-MM-DD
  o: number // open
  c: number // close
}

export type PricesBySymbol = Record<string, PriceBar[]>

