import { useState, useEffect, useCallback } from 'react'

export function useMarketData() {
  const [marketData, setMarketData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/data/market/latest.json?t=' + Date.now())
      if (!res.ok) throw new Error('行情数据暂未生成')
      const data = await res.json()
      setMarketData(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { marketData, loading, error, refresh: fetchData }
}

export function useFavorites() {
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('a10lucky_favs') || '[]') }
    catch { return [] }
  })

  const toggleFav = useCallback((code) => {
    setFavs(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      localStorage.setItem('a10lucky_favs', JSON.stringify(next))
      return next
    })
  }, [])

  return { favs, toggleFav }
}

export function useStrategyHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/data/archive/index.json?t=' + Date.now())
        if (res.ok) {
          const data = await res.json()
          setHistory(data)
        }
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [])

  return { history, loading }
}
