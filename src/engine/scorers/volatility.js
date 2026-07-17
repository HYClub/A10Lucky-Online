import { rollingMean, clamp } from '../helpers.js'

export function scoreVolatility(stock) {
  const k = stock.kline
  if (!k || k.length < 15) return 50
  const close = k.map(x => x.close)
  const high = k.map(x => x.high)
  const low = k.map(x => x.low)
  const lastIdx = close.length - 1
  let score = 50

  // ATR(14)
  const tr = []
  for (let i = 0; i < k.length; i++) {
    if (i === 0) { tr.push(high[0] - low[0]); continue }
    tr.push(Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1])))
  }
  const atr14 = rollingMean(tr, 14)
  const atrVal = atr14[atr14.length - 1] || 0
  const price = close[lastIdx]
  const atrPct = price > 0 ? atrVal / price : 0
  if (atrPct > 0.01 && atrPct < 0.03) score += 10
  if (atrPct > 0.03 && atrPct < 0.05) score += 5
  if (atrPct > 0.05) score -= 10
  if (atrPct < 0.005) score -= 5

  // Amplitude range last 20 days
  const high20 = Math.max(...high.slice(-20))
  const low20 = Math.min(...low.slice(-20))
  const range20 = price > 0 ? (high20 - low20) / low20 : 0
  if (range20 > 0.1 && range20 < 0.3) score += 10
  if (range20 > 0.3) score -= 5
  if (range20 < 0.05) score -= 5

  return clamp(score, 0, 100)
}
