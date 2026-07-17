import { clamp } from '../helpers.js'

export function scorePattern(stock) {
  const k = stock.kline
  if (!k || k.length < 20) return 50
  const last = k[k.length - 1]
  const prev = k[k.length - 2]
  let score = 50

  // Gap up
  if (last.low > prev.high) score += 15
  // Gap down
  if (last.high < prev.low) score -= 15
  // Bullish engulfing
  if (last.close > last.open && prev.close < prev.open &&
      last.close > prev.open && last.open < prev.close) score += 15
  // Bearish engulfing
  if (last.close < last.open && prev.close > prev.open &&
      last.close < prev.open && last.open > prev.close) score -= 15
  // Hammer (lower wick > 2x body)
  const body = Math.abs(last.close - last.open)
  const lowerWick = Math.min(last.close, last.open) - last.low
  if (body > 0 && lowerWick > body * 2 && last.close > last.open) score += 10

  return clamp(score, 0, 100)
}
