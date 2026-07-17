// Rolling window utilities (replaces pandas rolling + numpy)

export function rollingMean(arr, n) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n - 1) { result.push(null); continue }
    let sum = 0
    for (let j = i - n + 1; j <= i; j++) sum += arr[j]
    result.push(sum / n)
  }
  return result
}

export function rollingStd(arr, n) {
  const mean = rollingMean(arr, n)
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n - 1) { result.push(null); continue }
    let sum = 0
    for (let j = i - n + 1; j <= i; j++) sum += (arr[j] - mean[i]) ** 2
    result.push(Math.sqrt(sum / n))
  }
  return result
}

export function rollingCorr(a, b, n) {
  const result = []
  for (let i = 0; i < a.length; i++) {
    if (i < n - 1) { result.push(null); continue }
    let sumA = 0, sumB = 0
    for (let j = i - n + 1; j <= i; j++) { sumA += a[j]; sumB += b[j] }
    const mA = sumA / n, mB = sumB / n
    let num = 0, denA = 0, denB = 0
    for (let j = i - n + 1; j <= i; j++) {
      num += (a[j] - mA) * (b[j] - mB)
      denA += (a[j] - mA) ** 2
      denB += (b[j] - mB) ** 2
    }
    result.push(denA && denB ? num / Math.sqrt(denA * denB) : 0)
  }
  return result
}

export function rollingRank(arr, n) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n - 1) { result.push(null); continue }
    const window = arr.slice(i - n + 1, i + 1)
    const sorted = [...window].sort((a, b) => a - b)
    result.push(sorted.indexOf(arr[i]) + 1)
  }
  return result
}

export function rollingMax(arr, n) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n - 1) { result.push(null); continue }
    let max = -Infinity
    for (let j = i - n + 1; j <= i; j++) if (arr[j] > max) max = arr[j]
    result.push(max)
  }
  return result
}

export function rollingMin(arr, n) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n - 1) { result.push(null); continue }
    let min = Infinity
    for (let j = i - n + 1; j <= i; j++) if (arr[j] < min) min = arr[j]
    result.push(min)
  }
  return result
}

export function ema(arr, alpha) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) { result.push(arr[0]); continue }
    result.push(arr[i] * alpha + result[i - 1] * (1 - alpha))
  }
  return result
}

export function delta(arr, n) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n) { result.push(0); continue }
    result.push(arr[i] - arr[i - n])
  }
  return result
}

export function zscore(arr) {
  const n = arr.length
  if (n === 0) return arr
  const mean = arr.reduce((s, v) => s + v, 0) / n
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
  if (std === 0) return arr.map(() => 0)
  return arr.map(v => (v - mean) / std)
}

export function percentile(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  return arr.map(v => {
    const idx = sorted.indexOf(v)
    return (idx / (arr.length - 1)) * 100
  })
}

export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

export function getKline(kline, field) {
  return kline && kline.length > 0 ? kline.map(k => k[field]) : []
}
