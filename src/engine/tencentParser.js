const DECODER = new TextDecoder('gbk')

export async function fetchGbk(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  return DECODER.decode(buf)
}

export function parseStocks(text) {
  const stocks = []
  const entries = text.split(/\n/)
  for (const entry of entries) {
    const t = entry.trim()
    if (!t.includes('="')) continue
    const eq = t.indexOf('=')
    const inner = t.slice(eq + 2)
    if (!inner.endsWith('";')) continue
    const fields = inner.slice(0, -2).split('~')
    if (fields.length < 40) continue
    stocks.push({
      code: fields[2],
      name: fields[1],
      price: parseFloat(fields[3]) || 0,
      pre_close: parseFloat(fields[4]) || 0,
      open: parseFloat(fields[5]) || 0,
      volume: parseInt(fields[6]) || 0,
      change_pct: parseFloat(fields[32]) || 0,
      high: parseFloat(fields[33]) || 0,
      low: parseFloat(fields[34]) || 0,
      amount: parseFloat(fields[37]) || 0,
      turnover_pct: parseFloat(fields[38]) || 0,
      market_cap_yi: parseFloat(fields[44]) || 0,
      pb: parseFloat(fields[46]) || 0,
    })
  }
  return stocks
}

export function parseIndices(text) {
  const indices = []
  const entries = text.split(/\n/)
  for (const entry of entries) {
    const t = entry.trim()
    if (!t.includes('="')) continue
    const eq = t.indexOf('=')
    const inner = t.slice(eq + 2)
    if (!inner.endsWith('";')) continue
    const fields = inner.slice(0, -2).split('~')
    if (fields.length < 33) continue
    indices.push({
      code: fields[2],
      name: fields[1],
      price: parseFloat(fields[3]) || 0,
      pre_close: parseFloat(fields[4]) || 0,
      change_pct: parseFloat(fields[32]) || 0,
      change_amount: parseFloat(fields[31]) || 0,
    })
  }
  return indices
}
