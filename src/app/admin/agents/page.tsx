"use client"
import { useEffect, useState } from 'react'

type Agent = {
  id?: number
  name: string
  prompt: string
  provider?: string
  model?: string
  base_url?: string
  api_key_env?: string
  active?: boolean
}

export default function AdminAgentsPage() {
  const [items, setItems] = useState<Agent[]>([])
  const [form, setForm] = useState<Agent>({ name: '', prompt: '', provider: 'openai', model: 'gpt-4o-mini', api_key_env: 'OPENAI_API_KEY', active: true })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')

  async function load() {
    const res = await fetch('/api/admin/v1/agents', { cache: 'no-store' })
    if (!res.ok) { setMsg(await res.text()); return }
    setItems(await res.json())
  }
  useEffect(() => { load() }, [])

  async function create() {
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/admin/v1/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) { setMsg(await res.text()); setLoading(false); return }
    setForm({ name: '', prompt: '', provider: 'openai', model: 'gpt-4o-mini', api_key_env: 'OPENAI_API_KEY', active: true })
    await load()
    setLoading(false)
  }

  async function toggleActive(a: Agent) {
    await fetch(`/api/admin/v1/agents/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !a.active }) })
    await load()
  }

  async function remove(a: Agent) {
    if (!confirm(`删除 ${a.name}?`)) return
    await fetch(`/api/admin/v1/agents/${a.id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>策略管理（Agents）</h2>
      <div style={{ display: 'grid', gap: 8, maxWidth: 720, margin: '12px 0' }}>
        <label>名称<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} /></label>
        <label>Prompt<textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} rows={5} style={{ width: '100%' }} /></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <label>Provider<input value={form.provider || ''} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="openai 或 openai_compat" /></label>
          <label>Model<input value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o-mini / deepseek-reasoner" /></label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label>Base URL（可选）<input value={form.base_url || ''} onChange={e => setForm({ ...form, base_url: e.target.value })} placeholder="如 https://api.deepseek.com" /></label>
          <label>API Key 变量名<input value={form.api_key_env || ''} onChange={e => setForm({ ...form, api_key_env: e.target.value })} placeholder="OPENAI_API_KEY / DEEPSEEK_API_KEY" /></label>
        </div>
        <label><input type="checkbox" checked={!!form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> 启用</label>
        <button onClick={create} disabled={loading}>{loading ? '创建中…' : '创建策略'}</button>
        {msg && <div style={{ color: 'crimson' }}>{msg}</div>}
      </div>

      <h3>已配置策略</h3>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th><th>名称</th><th>Provider</th><th>Model</th><th>Active</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map(a => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.name}</td>
              <td>{a.provider}</td>
              <td>{a.model}</td>
              <td>{String(a.active)}</td>
              <td>
                <button onClick={() => toggleActive(a)}>{a.active ? '停用' : '启用'}</button>
                <button onClick={() => remove(a)} style={{ marginLeft: 8 }}>删除</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (<tr><td colSpan={6}>暂无策略，请在上方创建。</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

