import { headers } from 'next/headers'

type AgentDetail = {
  agent: { id: number; name: string; prompt: string | null }
  recent: { trade_date: string; day_return: number; day_pnl?: number; portfolio: any }[]
}

function getBaseUrl() {
  const h = headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('host')
  return process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : 'http://localhost:3000')
}

async function fetchAgent(id: string) {
  const base = getBaseUrl()
  const res = await fetch(`${base}/api/public/v1/agents/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json() as Promise<AgentDetail>
}

export default async function AgentPage({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
  const data = await fetchAgent(params.id)
  if (!data) return <div>未找到该 AI</div>
  const wantDate = typeof searchParams?.date === 'string' ? String(searchParams?.date) : undefined
  const selected = wantDate ? data.recent.find(r => String(r.trade_date).startsWith(wantDate)) : undefined
  const latest = selected || data.recent?.[0]
  return (
    <div>
      <h2>AI 详情：{data.agent.name}</h2>
      <div>
        <strong>Prompt</strong>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{data.agent.prompt || '—'}</pre>
      </div>
      {latest && (
        <div>
          <h3>当日数据（{latest.trade_date}）</h3>
          <div>收益率：{(latest.day_return * 100).toFixed(2)}%</div>
          <div>盈亏($)：{(latest.day_pnl ?? 0).toFixed(2)}</div>
          <div>
            组合：<pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(latest.portfolio, null, 2)}</pre>
          </div>
        </div>
      )}
      <h3>近 14 日结果</h3>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>日期</th>
            <th>收益%</th>
            <th>盈亏($)</th>
          </tr>
        </thead>
        <tbody>
          {data.recent.map(r => (
            <tr key={r.trade_date}>
              <td>{r.trade_date}</td>
              <td>{(r.day_return * 100).toFixed(2)}%</td>
              <td>{(r.day_pnl ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
