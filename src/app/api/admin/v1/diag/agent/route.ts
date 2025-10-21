import { NextRequest } from 'next/server'
import { query, ensureAgentColumns } from '@/src/lib/db'
import { callAgentLLMWithProvider as callAgentLLM, validatePortfolio } from '@/src/lib/ai'

function unauthorized(req: NextRequest): Response | null {
  const token = process.env.ADMIN_TOKEN
  if (!token) return null
  const hdr = req.headers.get('x-admin-token')
  if (hdr !== token) return new Response('Unauthorized', { status: 401 })
  return null
}

export async function GET(req: NextRequest) {
  const unauth = unauthorized(req)
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id') || 0)
  const symbolsParam = searchParams.get('symbols') || 'AAPL,MSFT,GOOG'
  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)

  await ensureAgentColumns()

  let name = 'diag-agent'
  let prompt = searchParams.get('prompt') || ''
  let provider: string | null = searchParams.get('provider')
  let model: string | null = searchParams.get('model')
  let base_url: string | null = searchParams.get('base_url')
  let api_key_env: string | null = searchParams.get('api_key_env')

  if (id) {
    const { rows } = await query<any>('SELECT id, name, prompt, provider, model, base_url, api_key_env FROM agents WHERE id = $1', [id])
    if (rows.length === 0) return new Response('not found', { status: 404 })
    const a = rows[0]
    name = a.name
    prompt = prompt || a.prompt || ''
    provider = provider || a.provider
    model = model || a.model
    base_url = base_url || a.base_url
    api_key_env = api_key_env || a.api_key_env
  }

  if (!prompt) {
    prompt = 'Return strictly this JSON: {"cash":1, "positions":[]}'
  }

  try {
    const portfolio = await callAgentLLM({ name, prompt, marketContext: { symbols }, provider, model, base_url, api_key_env })
    const ok = !!portfolio && !!validatePortfolio(portfolio)
    return Response.json({ ok, provider, model, base_url, api_key_env, symbols, portfolio })
  } catch (e: any) {
    return new Response(`diag agent failed: ${e?.message || 'unknown'}`, { status: 500 })
  }
}

