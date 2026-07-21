import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const prefix = { '6': 'sh', '0': 'sz', '3': 'sz', '8': 'bj', '4': 'bj' }
const latest = JSON.parse(readFileSync('docs/data/market/latest.json', 'utf-8'))
const stocks = latest.stocks || []

const codes = stocks.map(s => (prefix[s.code?.[0]] || 'sh') + s.code)
writeFileSync('docs/data/stocks.json', JSON.stringify(codes))

const meta = stocks.map(s => ({
  c: s.code,
  n: s.name,
  i: s.industry,
  p: s.pe_ttm,
  b: s.pb,
  m: s.market_cap_yi,
}))
writeFileSync('docs/data/stock_meta.json', JSON.stringify(meta))

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/stocks.json', JSON.stringify(codes))
writeFileSync('public/data/stock_meta.json', JSON.stringify(meta))

console.log(`Generated ${codes.length} codes and ${meta.length} meta entries`)
