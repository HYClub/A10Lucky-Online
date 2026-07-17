import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

const STRATEGIES = [
  { name: 'all_factor', display: '全因子', dims: { technical: 1, momentum: 1, volume: 1, valuation: 1, sector: 1, pattern: 1, volatility: 1, sentiment: 0.5, fund_flow: 0.5, trend_strength: 0.5 } },
  { name: 'alpha_blend', display: '板块轮动+技术', dims: { sector: 4, technical: 2.5, pattern: 2, sentiment: 1.5 } },
  { name: 'balanced', display: '多因子均衡', dims: { technical: 3, momentum: 3, volume: 2, volatility: 2 } },
  { name: 'fund_momentum', display: '资金动量', dims: { fund_flow: 3.5, trend_strength: 2.5, volume: 2, momentum: 2 } },
  { name: 'insider_track', display: '龙虎榜+资金流', dims: { pattern: 4.5, sector: 3, momentum: 2.5 } },
  { name: 'reversal', display: '超跌反转', dims: { volatility: 5, momentum: 2.5, technical: 2.5 } },
  { name: 'smart_money', display: '量价异动', dims: { volume: 4.5, technical: 2.5, pattern: 3 } },
  { name: 'value_pick', display: '价值精选', dims: { valuation: 10 } },
]
const OUTPUT = 'docs/data/strategies/latest.json'

/* ── Scorers (snapshot-only, no kline needed) ── */

function scoreTechnical(s) {
  const chg = s.change_pct
  if (chg == null) return 50
  const vol = s.volume_ratio ?? 1
  let sc = 50
  if (chg > 0) sc += chg * 2; else sc += chg * 1.5
  if (vol > 1.2) sc += 8; else if (vol > 0.8) sc += 3; else sc -= 5
  return Math.round(Math.max(0, Math.min(100, sc)))
}
function scoreMomentum(s) {
  const chg = s.change_pct; if (chg == null) return 50
  const vol = s.volume_ratio ?? 1
  let sc = 50
  if (chg > 2) sc += 20; else if (chg > 0) sc += 10; else if (chg < -2) sc -= 15; else if (chg < 0) sc -= 5
  if (vol > 2) sc += 10; else if (vol > 1.5) sc += 5
  return Math.round(Math.max(0, Math.min(100, sc)))
}
function scoreVolume(s) {
  const t = s.turnover_pct; const v = s.volume_ratio; let sc = 50
  if (t != null) { if (t > 10) sc += 15; else if (t > 5) sc += 10; else if (t > 2) sc += 5; else if (t < 0.3) sc -= 10 }
  if (v != null) { if (v > 2) sc += 10; else if (v > 1.5) sc += 5; else if (v < 0.5) sc -= 8 }
  return Math.round(Math.max(0, Math.min(100, sc)))
}
function scoreEP(s) { const p = s.pe_ttm; if (p == null || p <= 0) return 50; const e = 1 / p; if (e > 0.1) return 80; if (e > 0.05) return 70; if (e > 0.03) return 60; return 50 }
function scoreBP(s) { const p = s.pb; if (p == null || p <= 0) return 50; const b = 1 / p; if (b > 2) return 80; if (b > 1) return 70; if (b > 0.5) return 60; return 50 }
function scoreSize(s) { const m = s.market_cap_yi; if (m == null) return 50; if (m > 1000) return 80; if (m > 200) return 70; if (m > 50) return 60; if (m > 10) return 50; return 40 }
function scoreValuation(s) { return (scoreEP(s) + scoreBP(s) + scoreSize(s)) / 3 }
function scorePattern(s) {
  const chg = s.change_pct; const op = s.open; const pc = s.pre_close
  if (chg == null || op == null || pc == null) return 50
  let sc = 50; const gap = (op - pc) / pc
  if (gap > 0.02 && chg > 0) sc += 15; if (gap < -0.02 && chg < 0) sc -= 15
  if (chg > 0 && s.high != null && s.low != null && (s.high - s.close) / (s.high - s.low || 1) > 0.6) sc -= 8
  if (chg < 0 && s.close != null && s.low != null && (s.close - s.low) / (s.high - s.low || 1) > 0.6) sc += 8
  return Math.round(Math.max(0, Math.min(100, sc)))
}
function scoreVolatility(s) {
  const h = s.high; const l = s.low; const pc = s.pre_close
  if (h == null || l == null || pc == null || pc === 0) return 50
  const range = (h - l) / pc; let sc = 50
  if (range > 0.05) sc += 15; else if (range > 0.03) sc += 8; else if (range < 0.01) sc -= 10
  if (Math.abs(s.change_pct ?? 0) > 5) sc += 10
  return Math.round(Math.max(0, Math.min(100, sc)))
}
function scoreSector(s, sectorMap) {
  if (!s.industry) return 50
  const sec = sectorMap?.[s.industry]; if (!sec) return 50
  let sc = 50
  if (sec > 1) sc += 20; else if (sec > 0.3) sc += 10; else if (sec > 0) sc += 5; else if (sec < -1) sc -= 15; else if (sec < -0.3) sc -= 8
  return Math.round(Math.max(0, Math.min(100, sc)))
}
const FALLBACKS = { sentiment: 50, fund_flow: 50, trend_strength: 50, correlation: 50, alpha: 50 }

/* ── Main ── */

function main() {
  const raw = readFileSync('docs/data/market/latest.json', 'utf-8')
  const data = JSON.parse(raw)
  const stocks = data.stocks || []

  const sectorMap = {}
  stocks.forEach(s => {
    if (!s.industry) return
    if (!sectorMap[s.industry]) sectorMap[s.industry] = { sum: 0, count: 0 }
    sectorMap[s.industry].sum += s.change_pct ?? 0
    sectorMap[s.industry].count++
  })
  const secAvg = {}
  Object.entries(sectorMap).forEach(([k, v]) => { secAvg[k] = v.sum / v.count })

  const SCORERS = {
    technical: s => scoreTechnical(s),
    momentum: s => scoreMomentum(s),
    volume: s => scoreVolume(s),
    valuation: s => scoreValuation(s),
    sector: s => scoreSector(s, secAvg),
    pattern: s => scorePattern(s),
    volatility: s => scoreVolatility(s),
  }

  const results = STRATEGIES.map(cfg => {
    const scored = stocks.map(s => {
      let total = 0, totalW = 0
      const dimScores = {}
      for (const [dim, weight] of Object.entries(cfg.dims)) {
        const fn = SCORERS[dim] || (() => FALLBACKS[dim] ?? 50)
        const sc = fn(s)
        dimScores[dim] = sc
        total += sc * weight
        totalW += weight
      }
      const finalScore = totalW > 0 ? Math.round(total / totalW) : 0
      return {
        stock: { code: s.code, name: s.name, price: s.price, change_pct: s.change_pct, market_cap_yi: s.market_cap_yi, pe_ttm: s.pe_ttm, pb: s.pb, industry: s.industry, turnover_pct: s.turnover_pct },
        totalScore: finalScore,
        dimScores,
      }
    })
    scored.sort((a, b) => b.totalScore - a.totalScore)
    return { name: cfg.name, displayName: cfg.display, stocks: scored.slice(0, 10) }
  })

  const out = { timestamp: data.timestamp, date: data.date, results }
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(out, null, 2))
  console.log(`Strategies saved: ${results.length} strategies, ${data.date}`)
}

main()
