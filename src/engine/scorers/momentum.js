import { rollingMean, clamp } from '../helpers.js'

export function scoreMomentum(stock) {
  const k = stock.kline
  if (k && k.length >= 15) {
    const close = k.map(x => x.close)
    const lastIdx = close.length - 1
    let score = 50
    const gains = [], losses = []
    for (let i = 1; i < close.length; i++) {
      const diff = close[i] - close[i - 1]
      gains.push(diff > 0 ? diff : 0)
      losses.push(diff < 0 ? -diff : 0)
    }
    const avgGain = rollingMean(gains, 14)
    const avgLoss = rollingMean(losses, 14)
    const rsi = avgGain.map((g, i) => {
      if (avgLoss[i] === 0) return 100
      if (g === 0) return 0
      return 100 - 100 / (1 + g / avgLoss[i])
    })
    const lastRSI = rsi[rsi.length - 1] || 50
    if (lastRSI > 30 && lastRSI < 70) score += 15
    if (lastRSI > 20 && lastRSI < 30) score += 5
    if (lastRSI > 70) score -= 10
    if (lastRSI < 20) score -= 15
    const roc5 = close[lastIdx] / close[lastIdx - 5] - 1
    const roc10 = close[lastIdx] / close[lastIdx - 10] - 1
    const roc20 = close[lastIdx] / close[lastIdx - 20] - 1
    if (roc5 > 0 && roc10 > 0) score += 10
    if (roc5 > 0.05) score += 5
    if (roc5 < -0.05) score -= 10
    if (roc10 > 0 && roc20 > 0) score += 5
    if (roc10 < -0.05 && roc20 < -0.05) score -= 10
    let upDays = 1
    for (let i = lastIdx; i > lastIdx - 5 && i > 0; i--) {
      if (close[i] > close[i - 1]) upDays++
      else break
    }
    if (upDays >= 3) score += 5
    if (upDays >= 5) score += 5
    return clamp(score, 0, 100)
  }
  /* fallback */
  const chg = stock.change_pct
  if (chg == null) return 50
  const vol = stock.volume_ratio ?? 1
  let score = 50
  if (chg > 2) score += 20
  else if (chg > 0) score += 10
  else if (chg < -2) score -= 15
  else if (chg < 0) score -= 5
  if (vol > 2) score += 10
  else if (vol > 1.5) score += 5
  return clamp(Math.round(score), 0, 100)
}
