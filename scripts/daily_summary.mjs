import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'

const MARKET_FILE = 'docs/data/market/latest.json'
const STRAT_FILE = 'docs/data/strategies/latest.json'
const INDEX_FILE = 'docs/data/archive/index.json'
const ARCHIVE_DIR = 'docs/data/archive'

function calcStats(stocks) {
  const up = stocks.filter(s => (s.change_pct ?? 0) > 0).length
  const down = stocks.filter(s => (s.change_pct ?? 0) < 0).length
  const flat = stocks.length - up - down
  const limitUp = stocks.filter(s => (s.change_pct ?? 0) >= 9.8).length
  const limitDown = stocks.filter(s => (s.change_pct ?? 0) <= -9.8).length
  return { up, down, flat, limitUp, limitDown, total: stocks.length }
}

function main() {
  const market = JSON.parse(readFileSync(MARKET_FILE, 'utf-8'))
  const strat = JSON.parse(readFileSync(STRAT_FILE, 'utf-8'))

  const date = market.date
  const stocks = market.stocks || []
  const stats = calcStats(stocks)

  /* 深沪涨跌 */
  const shStocks = stocks.filter(s => s.code?.startsWith('6'))
  const szStocks = stocks.filter(s => s.code?.startsWith('0') || s.code?.startsWith('3'))
  const sh = calcStats(shStocks)
  const sz = calcStats(szStocks)

  const archive = {
    date,
    timestamp: market.timestamp,
    indices: market.indices || [],
    market: stats,
    sh, sz,
    strategies: (strat.results || []).map(r => {
      const picks = r.stocks || []
      const up = picks.filter(s => (s.stock.change_pct ?? 0) > 0).length
      const down = picks.filter(s => (s.stock.change_pct ?? 0) < 0).length
      return {
        name: r.name,
        displayName: r.displayName,
        up, down,
        accuracy: picks.length > 0 ? Math.round(up / picks.length * 100) : 0,
        stocks: picks.map(s => ({
          code: s.stock.code,
          name: s.stock.name,
          score: s.totalScore,
          price: s.stock.price,
          change_pct: s.stock.change_pct,
          industry: s.stock.industry,
        })),
      }
    }),
  }

  mkdirSync(ARCHIVE_DIR, { recursive: true })
  writeFileSync(`${ARCHIVE_DIR}/${date}.json`, JSON.stringify(archive, null, 2))
  console.log(`Archive saved: ${date}.json`)

  let index = []
  if (existsSync(INDEX_FILE)) {
    try { index = JSON.parse(readFileSync(INDEX_FILE, 'utf-8')) } catch {}
  }
  const existing = index.findIndex(e => e.date === date)
  const entry = {
    date,
    count: stats.total,
    up: stats.up, down: stats.down, flat: stats.flat,
    limitUp: stats.limitUp, limitDown: stats.limitDown,
    sh_up: sh.up, sh_down: sh.down,
    sz_up: sz.up, sz_down: sz.down,
    strategies: archive.strategies.length,
  }
  if (existing >= 0) index[existing] = entry
  else index.push(entry)
  index.sort((a, b) => b.date.localeCompare(a.date))
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2))
  console.log(`Archive index updated: ${index.length} entries`)
}

main()
