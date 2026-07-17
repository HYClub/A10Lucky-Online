import { clamp } from '../helpers.js'

export function scorePattern(stock) {
  const k = stock.kline
  if (k && k.length >= 20) {
    const last = k[k.length - 1]
    const prev = k[k.length - 2]
    let score = 50
    const body = Math.abs(last.close - last.open)
    const upper = last.high - Math.max(last.close, last.open)
    const lower = Math.min(last.close, last.open) - last.low
    if (last.close > last.open) {
      if (body > (last.high - last.low) * 0.7) score += 10
      if (lower > body * 2) score += 15
    } else {
      if (body > (last.high - last.low) * 0.7) score -= 10
      if (upper > body * 2) score -= 10
    }
    const gap = (last.open - prev.close) / prev.close
    if (gap > 0.02 && last.close > last.open) score += 15
    if (gap < -0.02 && last.close < last.open) score -= 15
    if (last.close > prev.close && prev.close < prev.open) score += 10
    if (last.close < prev.close && prev.close > prev.open) score -= 10
    return clamp(score, 0, 100)
  }
  /* fallback */
  const chg = stock.change_pct
  const op = stock.open
  const pc = stock.pre_close
  if (chg == null || op == null || pc == null) return 50
  let score = 50
  const gap = (op - pc) / pc
  if (gap > 0.02 && chg > 0) score += 15
  if (gap < -0.02 && chg < 0) score -= 15
  if (chg > 0 && (stock.high - stock.close) / (stock.high - stock.low || 1) > 0.6) score -= 8
  if (chg < 0 && (stock.close - stock.low) / (stock.high - stock.low || 1) > 0.6) score += 8
  return clamp(Math.round(score), 0, 100)
}
