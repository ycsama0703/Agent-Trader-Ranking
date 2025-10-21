// Use plain anchor to avoid Link context issues in some dev setups
import { headers } from 'next/headers'
import { getTradeDateYYYYMMDD } from '@/src/lib/util'
import RunButton from './components/RunButton'

function getBaseUrl() {
  const h = headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('host')
  return process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : 'http://localhost:3000')
}

async function fetchLeaderboard(date: string) {
  const base = getBaseUrl()
  const url = `${base}/api/public/v1/leaderboard?date=${date}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function Page({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const paramDate = typeof searchParams?.date === 'string' ? (searchParams as any).date as string : undefined
  const date = paramDate || getTradeDateYYYYMMDD(new Date())
  const data = await fetchLeaderboard(date)
  return (
    <div>
      <h2>排行榜（{date}）</h2>
      <RunButton />
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>排名</th>
            <th>Agent</th>
            <th>当日收益%</th>
            <th>当日盈亏($)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: any) => (
            <tr key={row.rank}>
              <td>{row.rank}</td>
              <td>
                <a href={`/agents/${row.agent_id}?date=${date}`}>
                  {(row.provider && row.model)
                    ? `${row.provider}/${row.model}`
                    : `agent-${row.agent_id}`}
                </a>
              </td>
              <td>{(row.day_return * 100).toFixed(2)}%</td>
              <td>{(row.day_pnl ?? 0).toFixed(2)}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={4}>暂无数据。请稍后或运行管理端任务。</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
