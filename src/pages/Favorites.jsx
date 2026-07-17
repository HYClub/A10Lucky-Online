import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { dataUrl } from '../dataUrl.js'

function StockSearch({ stocks, favs, onToggle }) {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const results = useMemo(() => {
    if (!query || query.length < 1) return []
    const q = query.toUpperCase()
    return stocks.filter(s => {
      if (!s.code || !s.name) return false
      return s.code.includes(q) || s.name.toUpperCase().includes(q)
    }).slice(0, 20)
  }, [query, stocks])

  const select = (s) => {
    onToggle(s.code)
    setQuery('')
    setShow(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={ref} style={{ position: 'relative', maxWidth: 400 }}>
      <input ref={inputRef}
        type="text"
        placeholder="输入代码或名称搜索..."
        value={query}
        onChange={e => { setQuery(e.target.value); setShow(true) }}
        onFocus={() => query && setShow(true)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 14, outline: 'none',
        }} />
      {show && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
          maxHeight: 320, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {results.map(s => (
            <div key={s.code} onClick={() => select(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer',
                fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: favs.includes(s.code) ? '#f59e0b' : 'var(--text-tertiary)', fontSize: 13 }}>
                {favs.includes(s.code) ? '★' : '☆'}
              </span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-num)', fontSize: 13 }}>{s.code}</span>
              <span style={{ flex: 1 }}>{s.name}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{s.industry || ''}</span>
              <span className={s.change_pct >= 0 ? 'up' : 'down'} style={{ fontFamily: 'var(--font-num)', fontSize: 13 }}>
                {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Favorites() {
  const [marketData, setMarketData] = useState(null)
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('a10lucky_favs') || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    fetch(dataUrl('/data/market/latest.json?t=') + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMarketData(d))
      .catch(() => {})
  }, [])

  const toggleFav = (code) => {
    setFavs(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      localStorage.setItem('a10lucky_favs', JSON.stringify(next))
      return next
    })
  }

  const stocks = marketData?.stocks ?? []
  const favStocks = stocks.filter(s => favs.includes(s.code))
  const indices = marketData?.indices ?? []

  return (
    <div className="page">
      <div className="page-header">
        <h2>自选股</h2>
        {marketData?.date && <span style={{fontSize:13,color:'var(--text-tertiary)'}}>{marketData.date}</span>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <StockSearch stocks={stocks} favs={favs} onToggle={toggleFav} />
      </div>

      {indices.length > 0 && (
        <div className="index-row" style={{marginBottom:20}}>
          {indices.map(idx => (
            <div key={idx.code} className="index-card">
              <div className="index-name">{idx.code === '000001' ? '上证指数' : idx.code === '399001' ? '深证成指' : idx.code === '399006' ? '创业板指' : '沪深300'}</div>
              <div className="index-price">{idx.price?.toFixed(2)}</div>
              <div className={'index-pct ' + (idx.change_pct >= 0 ? 'up' : 'down')}>
                {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {favStocks.length === 0 ? (
        <div className="empty">
          <p style={{fontSize:24,marginBottom:8}}>⭐</p>
          <p>还没有自选股</p>
          <p className="hint">在上方搜索框输入代码或名称添加</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th style={{width:30}}></th>
                <th>代码</th>
                <th>名称</th>
                <th>价格</th>
                <th>涨跌幅</th>
                <th>换手率</th>
                <th>行业</th>
                <th>市值(亿)</th>
                <th>PE_TTM</th>
                <th>PB</th>
              </tr>
            </thead>
            <tbody>
              {favStocks.map(s => (
                <tr key={s.code}>
                  <td>
                    <button className={'fav-btn active'} onClick={() => toggleFav(s.code)}>★</button>
                  </td>
                  <td><Link to={'/stock/' + s.code} className="stock-link">{s.code}</Link></td>
                  <td>{s.name}</td>
                  <td className={s.change_pct >= 0 ? 'up' : 'down'}>{s.price?.toFixed(2)}</td>
                  <td className={s.change_pct >= 0 ? 'up' : 'down'}>{s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%</td>
                  <td>{s.turnover_pct?.toFixed(2)}%</td>
                  <td style={{color:'var(--text-tertiary)'}}>{s.industry || '-'}</td>
                  <td>{s.market_cap_yi?.toFixed(0)}</td>
                  <td>{s.pe_ttm?.toFixed(2) || '-'}</td>
                  <td>{s.pb?.toFixed(2) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}