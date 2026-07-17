import { rollingMean, clamp } from '../helpers.js'

export function scoreVolume(stock) {
  const k = stock.kline
  if (k && k.length >= 20) {
    const close = k.map(x => x.close)
    const volume = k.map(x => x.volume || 0)
    const lastIdx = close.length - 1
    let score = 50
    const avgVol5 = rollingMean(volume, 5)[lastIdx]
    const volRatio = avgVol5 > 0 ? volume[lastIdx] / avgVol5 : 1
    if (volRatio > 1.5) score += 15
    else if (volRatio > 1.2) score += 8
    else if (volRatio < 0.5) score -= 10
    let obv = [0]
    for (let i = 1; i < close.length; i++) {
      if (close[i] > close[i - 1]) obv.push(obv[i - 1] + volume[i])
      else if (close[i] < close[i - 1]) obv.push(obv[i - 1] - volume[i])
      else obv.push(obv[i - 1])
    }
    const obvSlope = (obv[lastIdx] - obv[Math.max(0, lastIdx - 5)]) / 5
    if (obvSlope > 0) score += 8
    if (obvSlope < 0) score -= 5
    const t = stock.turnover_pct
    if (t != null) {
      if (t > 5) score += 10
      else if (t > 2) score += 5
    }
    return clamp(score, 0, 100)
  }
  /* fallback */
  const t = stock.turnover_pct
  const v = stock.volume_ratio
  let score = 50
  if (t != null) {
    if (t > 10) score += 15
    else if (t > 5) score += 10
    else if (t > 2) score += 5
    else if (t < 0.3) score -= 10
  }
  if (v != null) {
    if (v > 2) score += 10
    else if (v > 1.5) score += 5
    else if (v < 0.5) score -= 8
  }
  return clamp(Math.round(score), 0, 100)
}
