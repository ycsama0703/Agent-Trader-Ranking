import { z } from 'zod'
import type { Portfolio } from './types'

const PortfolioSchema = z.object({
  cash: z.number().min(0),
  positions: z.array(
    z.object({
      ticker: z.string(),
      target_weight: z.number()
    })
  )
})

export function validatePortfolio(json: unknown): Portfolio | null {
  const parsed = PortfolioSchema.safeParse(json)
  if (!parsed.success) return null
  const p = parsed.data
  // normalize tickers and ensure weights sum to 1 within tolerance
  const sum = p.cash + p.positions.reduce((s, x) => s + x.target_weight, 0)
  const within = Math.abs(sum - 1) < 1e-6
  if (!within) return null
  return {
    cash: p.cash,
    positions: p.positions.map(x => ({
      ticker: x.ticker.toUpperCase(),
      target_weight: x.target_weight
    }))
  }
}

export async function callAgentLLM(
  name: string,
  prompt: string,
  marketContext: any
): Promise<Portfolio | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set; returning null portfolio')
    return null
  }
  // Compose final prompt
  const system = `你是一名量化投资 AI。请基于以下股票及昨日市场信息，\n输出目标权重组合。返回 JSON 格式：\n{\n  "cash": 0.1,\n  "positions": [\n    {"ticker": "AAPL", "target_weight": 0.4},\n    {"ticker": "MSFT", "target_weight": 0.5}\n  ]\n}\n要求：cash + Σ target_weight = 1。`

  const user = `${prompt}\n\nMarketContext(JSON):\n${JSON.stringify(marketContext)}`

  // Lazy import to avoid ESM friction in Next edge
  const { OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
    const text = completion.choices[0]?.message?.content || ''
    // Extract JSON from response
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const json = JSON.parse(match[0])
    return validatePortfolio(json)
  } catch (e) {
    console.warn(`AI call failed for ${name}:`, e)
    return null
  }
}

// New provider-aware variant. Keeps the original for backward compatibility.
export async function callAgentLLMWithProvider(opts: {
  name: string
  prompt: string
  marketContext: any
  provider?: string | null
  model?: string | null
  base_url?: string | null
  api_key_env?: string | null
}): Promise<Portfolio | null> {
  const { name, prompt, marketContext } = opts
  const provider = (opts.provider || 'openai').toLowerCase()
  const model = opts.model || 'gpt-4o-mini'
  const baseURL = opts.base_url || undefined
  const keyEnv = opts.api_key_env || (provider === 'openai' ? 'OPENAI_API_KEY' : undefined)

  const apiKey = keyEnv ? (process.env as any)[keyEnv] : process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn(`API key not set for provider=${provider} env=${keyEnv}`)
    return null
  }
  const system = `你是一名量化投资AI。请基于以下股票及昨日市场信息，\n输出目标权重组合。返回JSON格式：\n{\n  \"cash\": 0.1,\n  \"positions\": [\n    {\"ticker\": \"AAPL\", \"target_weight\": 0.4},\n    {\"ticker\": \"MSFT\", \"target_weight\": 0.5}\n  ]\n}\n要求：cash + Σ target_weight = 1。`

  const user = `${prompt}\n\nMarketContext(JSON):\n${JSON.stringify(marketContext)}`

  const { OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey, baseURL })

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
    const text = completion.choices[0]?.message?.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const json = JSON.parse(match[0])
    return validatePortfolio(json)
  } catch (e) {
    console.warn(`AI call failed for ${name} [provider=${provider} model=${model}]:`, e)
    return null
  }
}
