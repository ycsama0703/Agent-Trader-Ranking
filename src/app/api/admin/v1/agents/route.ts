import { NextRequest } from 'next/server'
import { query, ensureAgentColumns } from '@/src/lib/db'

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
  await ensureAgentColumns()
  const { rows } = await query(
    'SELECT id, name, prompt, provider, model, base_url, api_key_env, COALESCE(active, TRUE) as active FROM agents ORDER BY id ASC'
  )
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const unauth = unauthorized(req)
  if (unauth) return unauth
  await ensureAgentColumns()
  const body = await req.json().catch(() => ({} as any))
  const { name, prompt, provider, model, base_url, api_key_env, active } = body || {}
  if (!name) return new Response('name required', { status: 400 })
  const pvd = provider ?? 'openai'
  const mdl = model ?? 'gpt-4o-mini'
  const ake = api_key_env ?? 'OPENAI_API_KEY'
  const act = active ?? true
  const sql = `INSERT INTO agents (name, prompt, provider, model, base_url, api_key_env, active)
               VALUES ($1,$2,$3,$4,$5,$6,$7)
               RETURNING id`
  const { rows } = await query(sql, [name, prompt ?? null, pvd, mdl, base_url ?? null, ake, act])
  return Response.json({ id: rows[0]?.id }, { status: 201 })
}

