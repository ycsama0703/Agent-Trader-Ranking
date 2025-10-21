import { NextRequest } from 'next/server'
import { query, ensureAgentColumns } from '@/src/lib/db'

function unauthorized(req: NextRequest): Response | null {
  const token = process.env.ADMIN_TOKEN
  if (!token) return null
  const hdr = req.headers.get('x-admin-token')
  if (hdr !== token) return new Response('Unauthorized', { status: 401 })
  return null
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = unauthorized(req)
  if (unauth) return unauth
  await ensureAgentColumns()
  const id = Number(params.id)
  if (!id) return new Response('invalid id', { status: 400 })
  const body = await req.json().catch(() => ({} as any))
  const { name, prompt, provider, model, base_url, api_key_env, active } = body || {}
  const sql = `UPDATE agents SET
    name = COALESCE($2, name),
    prompt = $3,
    provider = COALESCE($4, provider),
    model = COALESCE($5, model),
    base_url = $6,
    api_key_env = COALESCE($7, api_key_env),
    active = COALESCE($8, active)
    WHERE id = $1`
  await query(sql, [id, name ?? null, prompt ?? null, provider ?? null, model ?? null, base_url ?? null, api_key_env ?? null, active ?? null])
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = unauthorized(req)
  if (unauth) return unauth
  const id = Number(params.id)
  if (!id) return new Response('invalid id', { status: 400 })
  await query('DELETE FROM agents WHERE id = $1', [id])
  return Response.json({ ok: true })
}

