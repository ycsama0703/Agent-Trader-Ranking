export const metadata = {
  title: 'Agent Trader Ranking',
  description: 'AI 实时交易排名网站 — MVP'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans SC, sans-serif', margin: 20 }}>
        <h1>Agent Trader Ranking (ATR)</h1>
        {children}
      </body>
    </html>
  )
}

