import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchGbk, parseStocks, parseIndices } from '../engine/tencentParser.js'
import { runStrategy, listStrategies, loadStrategy } from '../engine/index.js'
import { dataUrl } from '../dataUrl.js'

const TENCENT_URL = 'https://qt.gtimg.cn/q='
const INDICES = ['sh000001', 'sz399001', 'sz399006', 'sh000300']
const BATCH_SIZE = 500
const CONCURRENCY = 6
const REFRESH_MS = 65000
const META_KEY = 'a10lucky_meta'
const META_URL = dataUrl('/data/stock_meta.json')
const CODES_URL = dataUrl('/data/stocks.json')

async function loadCodes() {
  const res = await fetch(CODES_URL + '?t=' + Date.now())
  return res.json()
}

async function loadMeta() {
  try {
    const cached = localStorage.getItem(META_KEY)
    if (cached) {
      const p = JSON.parse(cached)
      if (p._date && Date.now() - p._date < 86400000) return p.data
    }
  } catch {}
  const res = await fetch(META_URL + '?t=' + Date.now())
  const data = await res.json()
  const cache = { _date: Date.now(), data }
  localStorage.setItem(META_KEY, JSON.stringify(cache))
  return data
}

function buildMetaLookup(meta) {
  const map = {}
  for (const m of meta) map[m.c] = m
  return map
}

async function fetchOneBatch(codes) {
  const url = TENCENT_URL + codes.join(',')
  const text = await fetchGbk(url)
  return parseStocks(text)
}

async function fetchStocks(codes) {
  const all = []
  for (let i = 0; i < codes.length; i += BATCH_SIZE * CONCURRENCY) {
    const batchGroup = []
    for (let j = 0; j < CONCURRENCY && i + j * BATCH_SIZE < codes.length; j++) {
      const start = i + j * BATCH_SIZE
      batchGroup.push(codes.slice(start, Math.min(start + BATCH_SIZE, codes.length)))
    }
    const results = await Promise.all(batchGroup.map(fetchOneBatch))
    for (const r of results) all.push(...r)
  }
  return all
}

async function fetchIndices() {
  const text = await fetchGbk(TENCENT_URL + INDICES.join(','))
  return parseIndices(text)
}

function mergeMeta(stocks, metaLookup) {
  for (const s of stocks) {
    const m = metaLookup[s.code]
    if (m) {
      s.name = m.n || s.name
      s.industry = m.i || ''
      s.pe_ttm = m.p
      s.pb = m.b || s.pb
      s.market_cap_yi = m.m || s.market_cap_yi
      s.volume_ratio = 1
    }
  }
}

function computeStrategies(marketData) {
  if (!marketData?.stocks?.length) return []
  const strategies = listStrategies()
  return strategies.map(s => {
    const config = loadStrategy(s.name)
    if (!config) return null
    const result = runStrategy(marketData, config)
    return {
      name: s.name,
      displayName: s.displayName,
      description: s.description,
      regime: result.regime,
      timestamp: result.timestamp,
      stocks: result.stocks,
    }
  }).filter(Boolean)
}

export function useMarketData() {
  const [marketData, setMarketData] = useState(null)
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const codesRef = useRef(null)
  const metaRef = useRef(null)
  const lastDataRef = useRef(null)
  const mountedRef = useRef(true)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    try {
      if (!codesRef.current) codesRef.current = await loadCodes()
      if (!metaRef.current) {
        const raw = await loadMeta()
        metaRef.current = buildMetaLookup(raw)
      }

      const codes = codesRef.current
      const meta = metaRef.current

      const [indices, stocks] = await Promise.all([
        fetchIndices(),
        fetchStocks(codes),
      ])

      mergeMeta(stocks, meta)

      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10)
      const data = {
        _updated_at: now.toISOString(),
        _source: 'tencent',
        date: dateStr,
        timestamp: Date.now(),
        indices,
        stocks,
      }

      const stratResults = computeStrategies(data)

      lastDataRef.current = { data, strategies: stratResults }
      if (mountedRef.current) {
        setMarketData(data)
        setStrategies(stratResults)
        setError(null)
      }
    } catch (e) {
      if (lastDataRef.current && mountedRef.current) {
        setMarketData(lastDataRef.current.data)
        setStrategies(lastDataRef.current.strategies)
      }
      if (mountedRef.current) setError(e.message)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchAll()
    const interval = setInterval(fetchAll, REFRESH_MS)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchAll])

  return { marketData, strategies, loading, refreshing, error, refresh: fetchAll }
}
