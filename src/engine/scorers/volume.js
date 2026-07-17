import { rollingMean, clamp } from '../helpers.js'

export function scoreVolume(stock) {
  const k = stock.kline
  if (!k || k.length < 20) return 50
  const close = k.map(x => x.close)
  const volume = k.map(x => x.volume)
  const lastIdx = close.length - 1
  let score = 50

  // Volume ratio (current vs avg 5)
  const avgVol5 = rollingMean(volume, 5)[lastIdx]
  if (avgVol5 > 0) {
    const ratio = volume[lastIdx] / avgVol5
    if (ratio > 1.5 && ratio < 3) score += 15
    if (ratio > 3) score += 5
    if (ratio < 0.5) score -= 10
    if (ratio < 0.3) score -= 5
  }

  // OBV trend
  const obv = [0]
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) obv.push(obv[i - 1] + volume[i])
    else if (close[i] < close[i - 1]) obv.push(obv[i - 1] - volume[i])
    else obv.push(obv[i - 1])
  }
  const obvMA5 = rollingMean(obv, 5)
  const obvMA10 = rollingMean(obv, 10)
  const obvLast = obv[lastIdx]
  const obv5 = obvMA5[lastIdx]
  const obv10 = obvMA10[lastIdx]
  if (obvLast > obv5 && obv5 > obv10) score += 10
  if (obvLast > obv5 && obvLast < obv10) score += 5
  if (obvLast < obv5) score -= 10

  // Turnover rate
  if (stock.turnover_pct != null) {
    if (stock.turnover_pct > 1 && stock.turnover_pct < 10) score += 5
    if (stock.turnover_pct > 10) score -= 5
    if (stock.turnover_pct < 0.5) score -= 5
  }

  return clamp(score, 0, 100)
}
