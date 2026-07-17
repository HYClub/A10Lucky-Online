import { rollingMean, clamp } from '../helpers.js'

export function scoreVolatility(stock) {
  const k = stock.kline
  if (k && k.length >= 15) {
    const close = k.map(x => x.close)
    const high = k.map(x => x.high)
    const low = k.map(x => x.low)
    const tr = close.map((c, i) => {
      if (i === 0) return high[i] - low[i]
      return Math.max(high[i] - low[i], Math.abs(high[i] - c), Math.abs(low[i] - c))
    })
    const atr14 = rollingMean(tr, 14)
    const lastATR = atr14[atr14.length - 1] || 0
    const lastClose = close[close.length - 1] || 1
    const atrPct = lastATR / lastClose
    let score = 50
    if (atrPct > 0.04) score += 15
    else if (atrPct > 0.025) score += 8
    else if (atrPct < 0.01) score -= 10
    const range20 = Math.max(...high.slice(-20)) - Math.min(...low.slice(-20))
    const rangePct = range20 / rollingMean(close, 20)[close.length - 1]
    if (rangePct > 0.2) score += 10
    else if (rangePct < 0.05) score -= 10
    return clamp(score, 0, 100)
  }
  /* fallback: daily range as volatility proxy */
  const h = stock.high
  const l = stock.low
  const pc = stock.pre_close
  if (h == null || l == null || pc == null || pc === 0) return 50
  const range = (h - l) / pc
  let score = 50
  if (range > 0.05) score += 15
  else if (range > 0.03) score += 8
  else if (range < 0.01) score -= 10
  const chg = Math.abs(stock.change_pct ?? 0)
  if (chg > 5) score += 10
  return clamp(Math.round(score), 0, 100)
}
