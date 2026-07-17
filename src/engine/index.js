import { scoreTechnical } from './scorers/technical.js'
import { scoreMomentum } from './scorers/momentum.js'
import { scoreVolume } from './scorers/volume.js'
import { scoreEP, scoreBP, scoreSize } from './scorers/valuation.js'
import { scoreSector } from './scorers/sector.js'
import { scorePattern } from './scorers/pattern.js'
import { scoreVolatility } from './scorers/volatility.js'
import { rollingMean } from './helpers.js'

const DIMENSION_SCORERS = {
  technical: (s, m) => scoreTechnical(s),
  momentum: (s, m) => scoreMomentum(s),
  volume: (s, m) => scoreVolume(s),
  valuation: (s, m) => (scoreEP(s) + scoreBP(s) + scoreSize(s)) / 3,
  sector: (s, m) => scoreSector(s, m),
  pattern: (s, m) => scorePattern(s),
  volatility: (s, m) => scoreVolatility(s),
  sentiment: () => 50,
  fund_flow: () => 50,
  trend_strength: () => 50,
  correlation: () => 50,
  alpha: () => 50,
}

export function detectRegime(kline) {
  if (!kline || kline.length < 60) return 'neutral'
  const close = kline.map(k => k.close)
  const ma5 = rollingMean(close, 5)
  const ma20 = rollingMean(close, 20)
  const ma60 = rollingMean(close, 60)
  const last = close.length - 1
  if (ma5[last] > ma20[last] && ma20[last] > ma60[last]) return 'bull'
  if (ma5[last] < ma20[last] && ma20[last] < ma60[last]) return 'bear'
  return 'neutral'
}

export function applyFilters(stock, filters) {
  if (!filters) return true
  if (filters.exclude_st && stock.name && stock.name.includes('ST')) return false
  if (filters.min_market_cap_yi != null && (stock.market_cap_yi || 0) < filters.min_market_cap_yi) return false
  if (filters.max_market_cap_yi != null && (stock.market_cap_yi || Infinity) > filters.max_market_cap_yi) return false
  if (filters.min_price != null && (stock.price || 0) < filters.min_price) return false
  if (filters.max_price != null && (stock.price || Infinity) > filters.max_price) return false
  if (filters.max_turnover_pct != null && (stock.turnover_pct || 0) > filters.max_turnover_pct) return false
  return true
}

function adjustWeight(weight, regime, adjustments) {
  if (!adjustments || !regime) return weight
  const adj = adjustments[regime]
  if (adj != null) return weight * (1 + adj)
  return weight
}

export function runStrategy(marketData, strategyConfig) {
  const { dimensions, filters, top_n = 10, regime_adjustments } = strategyConfig
  const stocks = marketData?.stocks || []
  if (stocks.length === 0) return { stocks: [], regime: 'neutral', timestamp: Date.now() }

  const regime = detectRegime(marketData.index_kline || [])
  const filteredStocks = stocks.filter(s => applyFilters(s, filters))
  if (filteredStocks.length === 0) return { stocks: [], regime, timestamp: Date.now() }

  const scored = filteredStocks.map(stock => {
    const dimScores = {}
    let total = 0, totalWeight = 0
    for (const [dim, weight] of Object.entries(dimensions)) {
      const scorer = DIMENSION_SCORERS[dim]
      if (!scorer) continue
      const score = scorer(stock, marketData)
      dimScores[dim] = score
      const adjWeight = adjustWeight(weight, regime, regime_adjustments?.[dim])
      total += score * adjWeight
      totalWeight += adjWeight
    }
    const finalScore = totalWeight > 0 ? Math.round(total / totalWeight) : 0
    return {
      stock: { code: stock.code, name: stock.name, price: stock.price, change_pct: stock.change_pct, market_cap_yi: stock.market_cap_yi, pe_ttm: stock.pe_ttm, pb: stock.pb, industry: stock.industry, turnover_pct: stock.turnover_pct },
      totalScore: finalScore,
      dimScores,
    }
  })

  scored.sort((a, b) => b.totalScore - a.totalScore)
  return {
    stocks: scored.slice(0, Math.min(top_n, scored.length)),
    regime,
    timestamp: Date.now(),
  }
}

export function loadStrategy(name) {
  try {
    const strategies = import.meta.glob('./strategies/*.json', { eager: true })
    for (const [path, mod] of Object.entries(strategies)) {
      if (path.includes(`/${name}.json`)) return mod.default || mod
    }
    return null
  } catch {
    return null
  }
}

export function listStrategies() {
  const strategies = import.meta.glob('./strategies/*.json', { eager: true })
  return Object.entries(strategies).map(([path, mod]) => {
    const s = mod.default || mod
    const name = path.split('/').pop().replace('.json', '')
    return { name, displayName: s.display_name || name, description: s.description || '' }
  })
}
