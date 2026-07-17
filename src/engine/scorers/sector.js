export function scoreSector(stock, marketData) {
  if (!stock.industry || !marketData?.sectors) return 50
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
