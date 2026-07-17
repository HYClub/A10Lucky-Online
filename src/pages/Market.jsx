import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMarketData, useFavorites } from '../hooks/useMarketData.js'

export default function Market() {
  const { marketData, loading, error } = useMarketData()
  const { favs, toggleFav } = useFavorites()
  const [tab, setTab] = useState('all')
  const [sortField, setSortField] = useState('change_pct')
  const [sortDir, setSortDir] = useState('desc')

  const sortedStocks = useMemo(() => {
    if (!marketData?.stocks) return []
    const stocks = tab === 'fav' ? marketData.stocks.filter(s => favs.includes(s.code)) : [...marketData.stocks]
    return stocks.sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [marketData, tab, favs, sortField, sortDir])

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  if (loading) return <div className="page"><div className="loading">加载中...</div></div>
  if (error) return <div className="page"><div className="empty">行情数据加载中，请稍候</div></div>

  return (
    <div className="page market">
      <div className="page-header">
        <h2>实时行情</h2>
        <div className="tabs">
          <button className={'tab' + (tab === 'all' ? ' active' : '')} onClick={() => setTab('all')}>全部</button>
          <button className={'tab' + (tab === 'fav' ? ' active' : '')} onClick={() => setTab('fav')}>
            自选 {favs.length > 0 && <span className="badge">{favs.length}</span>}
          </button>
        </div>
      </div>

      {marketData?.indices && (
        <div className="index-row">
          {marketData.indices.map(idx => (
            <div key={idx.code} className="index-card">
              <div className="index-name">{idx.name}</div>
              <div className="index-price">{idx.price?.toFixed(2)}</div>
              <div className={'index-pct ' + (idx.change_pct >= 0 ? 'up' : 'down')}>
                {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              <th style={{width:30}}></th>
              <th>代码</th>
              <th>名称</th>
              <th className="sortable" onClick={() => toggleSort('price')}>价格 {sortField === 'price' && (sortDir === 'desc' ? '↓' : '↑')}</th>
              <th className="sortable" onClick={() => toggleSort('change_pct')}>涨跌幅 {sortField === 'change_pct' && (sortDir === 'desc' ? '↓' : '↑')}</th>
              <th className="sortable" onClick={() => toggleSort('turnover_pct')}>换手率 {sortField === 'turnover_pct' && (sortDir === 'desc' ? '↓' : '↑')}</th>
              <th>行业</th>
              <th className="sortable" onClick={() => toggleSort('market_cap_yi')}>市值(亿) {sortField === 'market_cap_yi' && (sortDir === 'desc' ? '↓' : '↑')}</th>
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
                <td>{s.industry || '-'}</td>
                <td>{s.market_cap_yi?.toFixed(0)}</td>
                <td>{s.pe_ttm?.toFixed(2) || '-'}</td>
                <td>{s.pb?.toFixed(2) || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
