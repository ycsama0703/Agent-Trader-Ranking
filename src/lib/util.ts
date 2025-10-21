import { subDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

const NY_TZ = 'America/New_York'

export function getTradeDateYYYYMMDD(date: Date = new Date()): string {
  // Use date-fns-tz v3 API to format "yesterday in NY" directly.
  const yday = subDays(date, 1)
  return formatInTimeZone(yday, NY_TZ, 'yyyy-MM-dd')
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function parseUniverseFromEnv(): string[] {
  const v = (process.env.SYMBOL_UNIVERSE ?? '').trim()
  const raw = v.length > 0 ? v : 'AAPL,MSFT,GOOG'
  return raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
}

export function parseUniverseFromString(input: string): string[] {
  if (!input) return []
  return input
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
}
