import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { runStrategy, listStrategies, loadStrategy, detectRegime } from '../engine/index.js'

const dimNames = { technical: '技术', momentum: '动量', volume: '成交量', valuation: '估值', sector: '板块', pattern: '形态', volatility: '波动率', sentiment: '情绪', fund_flow: '资金流', trend_strength: '趋势强度', correlation: '相关性', alpha: 'Alpha因子' }

export default function Screener() {
  const [marketData, setMarketData] = useState(null)
  const [selectedStrategy, setSelectedStrategy] = useState('balanced')
  const [customWeights, setCustomWeights] = useState(null)

  useEffect(() => {
    fetch('/data/market/latest.json?t=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMarketData(d))
      .catch(() => {})
  }, [])

  const strategies = useMemo(() => listStrategies(), [])
  const currentStrategy = useMemo(() => loadStrategy(selectedStrategy), [selectedStrategy])
  const dims = currentStrategy?.dimensions || {}

  const result = useMemo(() => {
    if (!marketData?.stocks || !currentStrategy) return null
    const config = customWeights ? { ...currentStrategy, dimensions: customWeights } : currentStrategy
    return runStrategy(marketData, config)
  }, [marketData, currentStrategy, customWeights])

  const regime = useMemo(() => {
    if (!marketData?.index_kline) return 'neutral'
    return detectRegime(marketData.index_kline)
  }, [marketData])

  const handleWeightChange = (dim, val) => {
    setCustomWeights(prev => ({ ...(prev || dims), [dim]: parseFloat(val) || 0 }))
  }

  return (
    <div className="page screener">
      <div className="page-header">
        <h2>交互选股</h2>
        <select className="strategy-select" value={selectedStrategy} onChange={e => { setSelectedStrategy(e.target.value); setCustomWeights(null) }}>
          {strategies.map(s => <option key={s.name} value={s.name}>{s.displayName}</option>)}
        </select>
      </div>

      {currentStrategy?.description && <p className="strategy-desc">{currentStrategy.description}</p>}

      <div className="screener-layout">
        <div className="screener-sidebar">
          <div className="card">
            <div className="card-header">
              <h3>权重调整</h3>
              <button className="btn-sm" onClick={() => setCustomWeights(null)}>重置</button>
            </div>
            <div className="weight-list">
              {Object.entries(dims).map(([dim, weight]) => (
                <div key={dim} className="weight-item">
                  <label className="weight-label">{dimNames[dim] || dim}</label>
                  <div className="weight-control">
                    <input type="range" min="0" max="100" value={customWeights?.[dim] ?? weight * 100}
                      onChange={e => { const v = parseInt(e.target.value); handleWeightChange(dim, v / 100) }} />
                    <span className="weight-val">{Math.round((customWeights?.[dim] ?? weight) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>市场状态</h3>
            <div className={'regime-tag ' + regime}>
              {regime === 'bull' ? '📈 牛市' : regime === 'bear' ? '📉 熊市' : '➡️ 震荡'}
            </div>
          </div>
        </div>

        <div className="screener-results">
          {result && result.stocks.length === 0 && <div className="empty">没有符合筛选条件的股票</div>}
          {result && result.stocks.length > 0 && (
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
                    <th>PE_TTM</th>
                    <th>PB</th>
                    <th>市值(亿)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stocks.map((item, i) => (
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
                      <td>{item.stock.pe_ttm?.toFixed(2) || '-'}</td>
                      <td>{item.stock.pb?.toFixed(2) || '-'}</td>
                      <td>{item.stock.market_cap_yi?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}