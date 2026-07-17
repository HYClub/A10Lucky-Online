let _sectorCache = null

export function scoreSector(stock, marketData) {
  if (!stock.industry) return 50

  if (marketData?.sectors) {
    const sector = marketData.sectors.find(s => s.name === stock.industry)
    if (!sector) return 50
    let score = 50
    if (sector.change_pct > 2) score += 20
    else if (sector.change_pct > 1) score += 10
    else if (sector.change_pct > 0.5) score += 5
    else if (sector.change_pct < -1) score -= 10
    else if (sector.change_pct < -2) score -= 20
    if (sector.rank && sector.rank <= 5) score += 10
    return Math.max(0, Math.min(100, score))
  }

  /* fallback: compute industry averages from stocks */
  if (!_sectorCache && marketData?.stocks?.length) {
    const map = {}
    marketData.stocks.forEach(s => {
      if (!s.industry) return
      if (!map[s.industry]) map[s.industry] = { sum: 0, count: 0 }
      map[s.industry].sum += s.change_pct ?? 0
      map[s.industry].count++
    })
    _sectorCache = Object.entries(map).map(([name, v]) => ({
      name,
      change_pct: v.sum / v.count,
    }))
  }
  const sector = _sectorCache?.find(s => s.name === stock.industry)
  if (!sector) return 50
  let score = 50
  if (sector.change_pct > 1) score += 20
  else if (sector.change_pct > 0.3) score += 10
  else if (sector.change_pct > 0) score += 5
  else if (sector.change_pct < -1) score -= 15
  else if (sector.change_pct < -0.3) score -= 8
  return Math.max(0, Math.min(100, score))
}
