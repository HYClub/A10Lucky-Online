import { clamp } from '../helpers.js'

export function scoreEP(stock) {
  const pe = stock.pe_ttm
  if (pe == null || pe <= 0) return 50
  let score = 50
  // EP = 1/PE * 100, higher is better value
  const ep = (1 / pe) * 100
  if (ep > 5) score = 70
  if (ep > 10) score = 80
  if (ep > 15) score = 90
  if (ep > 20) score = 95
  if (ep > 30) score = 80
  if (ep > 50) score = 60
  if (ep < 2) score = 30
  if (ep < 1) score = 20
  return clamp(score, 0, 100)
}

export function scoreBP(stock) {
  const pb = stock.pb
  if (pb == null || pb <= 0) return 50
  let score = 50
  const bp = (1 / pb) * 100
  if (bp > 50) score = 85
  if (bp > 100) score = 90
  if (bp > 200) score = 95
  if (bp > 300) score = 80
  if (bp < 30) score = 40
  if (bp < 20) score = 30
  return clamp(score, 0, 100)
}

export function scoreSize(stock) {
  const mc = stock.market_cap_yi
  if (mc == null) return 50
  if (mc > 1000) return 70
  if (mc > 500) return 60
  if (mc > 100) return 50
  if (mc > 50) return 60
  if (mc > 20) return 70
  if (mc > 10) return 60
  return 50
}
