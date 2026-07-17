import { rollingMean, clamp } from '../helpers.js'

function emaArr(arr, period) {
  const alpha = 2 / (period + 1)
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) { result.push(arr[0]); continue }
    result.push(arr[i] * alpha + result[i - 1] * (1 - alpha))
  }
  return result
}

export function scoreTechnical(stock) {
  const k = stock.kline
  if (k && k.length >= 20) {
    const close = k.map(x => x.close)
    const ma5 = rollingMean(close, 5)
    const ma10 = rollingMean(close, 10)
    const ma20 = rollingMean(close, 20)
    const last = close[close.length - 1]
    const lastMA5 = ma5[ma5.length - 1]
    const lastMA10 = ma10[ma10.length - 1]
    const lastMA20 = ma20[ma20.length - 1]
    let score = 50
    if (last > lastMA5) score += 10
    if (lastMA5 > lastMA10) score += 10
    if (lastMA10 > lastMA20) score += 10
    const dev5 = (last - lastMA5) / lastMA5
    if (dev5 > 0.02 && dev5 < 0.08) score += 10
    if (dev5 > 0.08) score -= 10
    if (dev5 < -0.02 && dev5 > -0.08) score -= 5
    if (dev5 < -0.08) score -= 15
    const ema12 = emaArr(close, 12)
    const ema26 = emaArr(close, 26)
    const macd = ema12.map((v, i) => v - ema26[i])
    const signal = emaArr(macd, 9)
    if (macd[macd.length - 1] > signal[signal.length - 1]) score += 10
    if (macd[macd.length - 1] < 0 && macd[macd.length - 1] > signal[signal.length - 1]) score += 5
    return clamp(score, 0, 100)
  }
  /* fallback: use snapshot data */
  const chg = stock.change_pct
  if (chg == null) return 50
  const vol = stock.volume_ratio ?? 1
  let score = 50
  if (chg > 0) score += chg * 2
  else score += chg * 1.5
  if (vol > 1.2) score += 8
  else if (vol > 0.8) score += 3
  else score -= 5
  return clamp(Math.round(score), 0, 100)
}
