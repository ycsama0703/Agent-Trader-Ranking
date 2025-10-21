"use client"
import { useEffect, useState } from 'react'

export default function RunButton() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [symbols, setSymbols] = useState('')
  const [prompt, setPrompt] = useState('')

  // Load saved inputs (prefer URL symbols)
  useEffect(() => {
    try {
      const u = new URL(window.location.href)
      const qsSym = u.searchParams.get('symbols') || ''
      const s = localStorage.getItem('atr_symbols') || ''
      const p = localStorage.getItem('atr_prompt') || ''
      const d = localStorage.getItem('atr_date') || ''
      if (qsSym) setSymbols(qsSym); else if (s) setSymbols(s)
      if (p) setPrompt(p)
      if (d) setDate(d)
    } catch {}
  }, [])

  // Persist inputs
  useEffect(() => { try { localStorage.setItem('atr_symbols', symbols) } catch {} }, [symbols])
  useEffect(() => { try { localStorage.setItem('atr_prompt', prompt) } catch {} }, [prompt])
  useEffect(() => { try { localStorage.setItem('atr_date', date) } catch {} }, [date])

  async function run() {
    try {
      setLoading(true)
      setMsg(null)
      const res = await fetch('/api/admin/v1/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(date ? { date } : {}),
          ...(symbols ? { symbols } : {}),
          ...(prompt ? { prompt } : {})
        })
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const json = await res.json().catch(() => ({}))
      const td: string = json?.trade_date || date || ''
      setMsg(`已触发：${td}，处理 ${json?.agents_processed ?? '?'} 个 AI`)
      setTimeout(() => {
        const u = new URL(window.location.href)
        if (td) u.searchParams.set('date', td); else u.searchParams.delete('date')
        if (symbols) u.searchParams.set('symbols', symbols); else u.searchParams.delete('symbols')
        window.location.href = u.toString()
      }, 600)
    } catch (e: any) {
      setMsg(`触发失败：${e?.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#444' }}>
          交易日（可选）：
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label style={{ fontSize: 13, color: '#444' }}>
          股票池（可选，逗号分隔）：
          <input
            type="text"
            placeholder="AAPL,MSFT,GOOG"
            value={symbols}
            onChange={e => setSymbols(e.target.value)}
            style={{ marginLeft: 6, minWidth: 220 }}
          />
        </label>
        <button onClick={run} disabled={loading} style={{ padding: '6px 12px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '正在跑批…' : '手动跑批'}
        </button>
      </div>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 13, color: '#444', marginBottom: 4 }}>共享 Prompt（可选，若填写则对所有已启用 Agent 使用相同 Prompt 评测）</div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder="在此粘贴策略文本；留空则使用各 Agent 自己的 Prompt"
          style={{ width: '100%', maxWidth: 720 }}
        />
        <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
          <button onClick={() => { setPrompt(''); try { localStorage.removeItem('atr_prompt') } catch {} }} style={{ padding: '4px 10px' }}>
            清空 Prompt
          </button>
          <button onClick={() => { setSymbols(''); try { localStorage.removeItem('atr_symbols') } catch {} }} style={{ padding: '4px 10px' }}>
            清空股票池
          </button>
        </div>
      </div>
      {msg && <div style={{ marginTop: 8, color: '#555' }}>{msg}</div>}
    </div>
  )
}

