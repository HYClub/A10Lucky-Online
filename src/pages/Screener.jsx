import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { runStrategy, listStrategies, loadStrategy, detectRegime } from '../engine/index.js'
import { dataUrl } from '../dataUrl.js'

export default function Screener() {
  const [marketData, setMarketData] = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    fetch(dataUrl('/data/market/latest.json?t=') + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMarketData(d))
      .catch(() => {})
  }, [])

  const strategies = useMemo(() => listStrategies().filter(s => !s.deprecated), [])

  const allResults = useMemo(() => {
    if (!marketData?.stocks) return []
    return strategies.map(s => {
      const cfg = loadStrategy(s.name)
      if (!cfg) return null
      const result = runStrategy(marketData, cfg)
      return { ...s, result }
    }).filter(Boolean)
  }, [marketData, strategies])

  const regime = useMemo(() => {
    if (!marketData?.index_kline) return 'neutral'
    return detectRegime(marketData.index_kline)
  }, [marketData])

  const active = allResults[activeTab]

  return (
    <div className="page screener">
      <div className="page-header">
        <h2>策略选股</h2>
        <div className={'regime-tag ' + regime}>
          {regime === 'bull' ? '📈 牛市' : regime === 'bear' ? '📉 熊市' : '➡️ 震荡'}
        </div>
      </div>

      <div className="strategy-tabs-wrap">
        <div className="strategy-tabs">
          {allResults.map((s, i) => (
            <button key={s.name} className={'strategy-tab' + (activeTab === i ? ' active' : '')} onClick={() => setActiveTab(i)}>
              <span className="st-name">{s.displayName}</span>
              <span className="st-count">{s.result.stocks.length}</span>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="card" style={{marginTop:16}}>
          <div className="card-header">
            <div>
              <h3>{active.displayName}</h3>
              {active.description && <span style={{fontSize:13,color:'var(--text3)',marginLeft:8}}>{active.description}</span>}
            </div>
          </div>
          <div className="table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>代码</th>
                  <th>名称</th>
                  <th>评分</th>
                  <th>价格</th>
                  <th>涨跌幅</th>
                  <th>行业</th>
                  <th>市值(亿)</th>
                  <th>PE_TTM</th>
                  <th>PB</th>
                </tr>
              </thead>
              <tbody>
                {active.result.stocks.map((item, i) => (
                  <tr key={item.stock.code}>
                    <td className="rank">{i + 1}</td>
                    <td><Link to={'/stock/' + item.stock.code} className="stock-link">{item.stock.code}</Link></td>
                    <td>{item.stock.name}</td>
                    <td><span className="score-badge">{item.totalScore}</span></td>
                    <td>{item.stock.price?.toFixed(2)}</td>
                    <td className={item.stock.change_pct >= 0 ? 'up' : 'down'}>
                      {item.stock.change_pct >= 0 ? '+' : ''}{item.stock.change_pct?.toFixed(2)}%
                    </td>
                    <td style={{color:'var(--text3)'}}>{item.stock.industry || '-'}</td>
                    <td>{item.stock.market_cap_yi?.toFixed(0)}</td>
                    <td>{item.stock.pe_ttm?.toFixed(2) || '-'}</td>
                    <td>{item.stock.pb?.toFixed(2) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}