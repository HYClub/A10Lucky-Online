import { rollingMean, clamp } from '../helpers.js'

export function scoreTechnical(stock) {
  const k = stock.kline
  if (!k || k.length < 20) return 50
  const close = k.map(x => x.close)
  const ma5 = rollingMean(close, 5)
  const ma10 = rollingMean(close, 10)
  const ma20 = rollingMean(close, 20)
  const last = close[close.length - 1]
  const lastMA5 = ma5[ma5.length - 1]
  const lastMA10 = ma10[ma10.length - 1]
  const lastMA20 = ma20[ma20.length - 1]

  let score = 50
  // Price above MA5
  if (last > lastMA5) score += 10
  // MA5 above MA10 (short-term uptrend)
  if (lastMA5 > lastMA10) score += 10
  // MA10 above MA20 (mid-term uptrend)
  if (lastMA10 > lastMA20) score += 10
  // Deviation from MA5 (moderate is good, extreme is bad)
  const dev5 = (last - lastMA5) / lastMA5
  if (dev5 > 0.02 && dev5 < 0.08) score += 10
  if (dev5 > 0.08) score -= 10
  if (dev5 < -0.02 && dev5 > -0.08) score -= 5
  if (dev5 < -0.08) score -= 15
  // MACD line
  const ema12 = emaArr(close, 12)
  const ema26 = emaArr(close, 26)
  const macd = ema12.map((v, i) => v - ema26[i])
  const signal = emaArr(macd, 9)
  const lastMACD = macd[macd.length - 1]
  const lastSignal = signal[signal.length - 1]
  if (lastMACD > lastSignal) score += 10
  if (lastMACD < 0 && lastMACD > lastSignal) score += 5

  return clamp(score, 0, 100)
}

function emaArr(arr, period) {
  const alpha = 2 / (period + 1)
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) { result.push(arr[0]); continue }
    result.push(arr[i] * alpha + result[i - 1] * (1 - alpha))
  }
  return result
}
