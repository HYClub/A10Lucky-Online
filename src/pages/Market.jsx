import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dataUrl } from '../dataUrl.js'

const INDEX_NAMES = { '000001': '上证指数', '399001': '深证成指', '399006': '创业板指', '399300': '沪深300' }

export default function Market() {
  const [marketData, setMarketData] = useState(null)
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('a10lucky_favs') || '[]') }
    catch { return [] }
  })
  const [tab, setTab] = useState('all')
  const [sortField, setSortField] = useState('change_pct')
  const [sortDir, setSortDir] = useState('desc')

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

  const indices = marketData?.indices ?? []
  const allStocks = marketData?.stocks ?? []

  const sortedStocks = useMemo(() => {
    if (!allStocks.length) return []
    const list = tab === 'fav' ? allStocks.filter(s => favs.includes(s.code)) : [...allStocks]
    return list.sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [allStocks, tab, favs, sortField, sortDir])

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sortArrow = (field) => sortField === field ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''

  return (
    <div className="page market">
      <div className="page-header">
        <h2>实时行情</h2>
        <div className="tabs">
          <button className={'tab' + (tab === 'all' ? ' active' : '')} onClick={() => setTab('all')}>全部</button>
          <button className={'tab' + (tab === 'fav' ? ' active' : '')} onClick={() => setTab('fav')}>
            自选 {favs.length > 0 && <span className="badge" style={{marginLeft:6}}>{favs.length}</span>}
          </button>
        </div>
      </div>

      {indices.length > 0 && (
        <div className="index-row">
          {indices.map(idx => (
            <div key={idx.code} className="index-card">
              <div className="index-name">{INDEX_NAMES[idx.code] || idx.code}</div>
              <div className="index-price">{idx.price?.toFixed(2)}</div>
              <div className={'index-pct ' + (idx.change_pct >= 0 ? 'up' : 'down')}>
                {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {marketData?.date && (
        <div style={{marginBottom:12,fontSize:13,color:'var(--text3)'}}>
          {marketData.date} · {allStocks.length} 只股票
        </div>
      )}

      {allStocks.length > 0 ? (
        <div className="table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th style={{width:30}}></th>
                <th>代码</th>
                <th>名称</th>
                <th className="sortable" onClick={() => toggleSort('price')}>价格{sortArrow('price')}</th>
                <th className="sortable" onClick={() => toggleSort('change_pct')}>涨跌幅{sortArrow('change_pct')}</th>
                <th className="sortable" onClick={() => toggleSort('turnover_pct')}>换手率{sortArrow('turnover_pct')}</th>
                <th>行业</th>
                <th className="sortable" onClick={() => toggleSort('market_cap_yi')}>市值(亿){sortArrow('market_cap_yi')}</th>
                <th>PE_TTM</th>
                <th>PB</th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.slice(0, 50).map(s => (
                <tr key={s.code}>
                  <td>
                    <button className={'fav-btn' + (favs.includes(s.code) ? ' active' : '')} onClick={() => toggleFav(s.code)}>
                      {favs.includes(s.code) ? '★' : '☆'}
                    </button>
                  </td>
                  <td><Link to={'/stock/' + s.code} className="stock-link">{s.code}</Link></td>
                  <td>{s.name}</td>
                  <td>{s.price?.toFixed(2)}</td>
                  <td className={s.change_pct >= 0 ? 'up' : 'down'}>{s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%</td>
                  <td>{s.turnover_pct?.toFixed(2)}%</td>
                  <td style={{color:'var(--text3)'}}>{s.industry || '-'}</td>
                  <td>{s.market_cap_yi?.toFixed(0)}</td>
                  <td>{s.pe_ttm?.toFixed(2) || '-'}</td>
                  <td>{s.pb?.toFixed(2) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">数据加载中...</div>
      )}
    </div>
  )
}