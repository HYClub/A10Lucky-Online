import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMarketData, useFavorites } from '../hooks/useMarketData.js'
import { runStrategy, loadStrategy, listStrategies } from '../engine/index.js'

export default function StockDetail() {
  const { code } = useParams()
  const { marketData } = useMarketData()
  const { favs, toggleFav } = useFavorites()
  const [activeResult, setActiveResult] = useState(null)

  const stock = useMemo(() => marketData?.stocks?.find(s => s.code === code), [marketData, code])

  const strategies = useMemo(() => listStrategies(), [])

  const strategyScores = useMemo(() => {
    if (!marketData?.stocks || !stock) return []
    const singleStockMarket = { stocks: [stock], sectors: marketData.sectors, index_kline: marketData.index_kline }
    return strategies.map(s => {
      const cfg = loadStrategy(s.name)
      if (!cfg) return null
      const result = runStrategy(singleStockMarket, cfg)
      const scored = result.stocks[0]
      return { name: s.displayName, key: s.name, totalScore: scored?.totalScore || 0, dimScores: scored?.dimScores || {} }
    }).filter(Boolean)
  }, [marketData, stock, strategies])

  useEffect(() => {
    if (strategyScores.length > 0) setActiveResult(strategyScores[0].key)
  }, [strategyScores])

  if (!marketData) return <div className="page"><div className="loading">加载中...</div></div>
  if (!stock) return <div className="page"><div className="empty">未找到该股票</div></div>

  const active = strategyScores.find(s => s.key === activeResult)
  const kline = stock.kline || []
  const dimNames = { technical: '技术', momentum: '动量', volume: '成交量', valuation: '估值', sector: '板块', pattern: '形态', volatility: '波动率', sentiment: '情绪', fund_flow: '资金流' }

  return (
    <div className="page stock-detail">
      <Link to="/market" className="back-link">← 返回行情</Link>
      <div className="stock-header">
        <div>
          <h2>{stock.name} <span className="stock-code">{stock.code}</span></h2>
          <div className="stock-price-row">
            <span className="stock-price">{stock.price?.toFixed(2)}</span>
            <span className={'stock-pct ' + (stock.change_pct >= 0 ? 'up' : 'down')}>
              {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct?.toFixed(2)}%
            </span>
          </div>
        </div>
        <button className={'fav-btn big' + (favs.includes(code) ? ' active' : '')} onClick={() => toggleFav(code)}>
          {favs.includes(code) ? '★ 已收藏' : '☆ 加入自选'}
        </button>
      </div>

      <div className="stock-info-row">
        <div className="info-item"><span className="info-label">行业</span><span>{stock.industry || '-'}</span></div>
        <div className="info-item"><span className="info-label">市值</span><span>{stock.market_cap_yi?.toFixed(0)}亿</span></div>
        <div className="info-item"><span className="info-label">PE_TTM</span><span>{stock.pe_ttm?.toFixed(2) || '-'}</span></div>
        <div className="info-item"><span className="info-label">PB</span><span>{stock.pb?.toFixed(2) || '-'}</span></div>
        <div className="info-item"><span className="info-label">换手率</span><span>{stock.turnover_pct?.toFixed(2)}%</span></div>
      </div>

      <div className="card">
        <h3>多策略评分对比</h3>
        <div className="strategy-score-row">
          {strategyScores.map(s => (
            <div key={s.key} className={'strategy-score-card' + (activeResult === s.key ? ' active' : '')} onClick={() => setActiveResult(s.key)}>
              <div className="ss-name">{s.name}</div>
              <div className={'ss-score ' + (s.totalScore >= 60 ? 'high' : s.totalScore >= 40 ? 'mid' : 'low')}>{s.totalScore}</div>
            </div>
          ))}
        </div>
        {active && (
          <div className="dim-score-list">
            {Object.entries(active.dimScores).map(([dim, score]) => (
              <div key={dim} className="dim-score-item">
                <span className="dim-label">{dimNames[dim] || dim}</span>
                <div className="dim-bar-wrap">
                  <div className="dim-bar" style={{ width: score + '%', backgroundColor: score >= 60 ? '#4caf50' : score >= 40 ? '#ff9800' : '#f44336' }}></div>
                </div>
                <span className="dim-val">{Math.round(score)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {kline.length > 0 && (
        <div className="card">
          <h3>K线走势（近 {kline.length} 日）</h3>
          <MiniKline kline={kline} />
        </div>
      )}
    </div>
  )
}

function MiniKline({ kline }) {
  const close = kline.map(k => k.close)
  const max = Math.max(...close)
  const min = Math.min(...close)
  const range = max - min || 1
  const w = 800, h = 200
  const padding = { t: 20, r: 10, b: 20, l: 50 }
  const chartW = w - padding.l - padding.r
  const chartH = h - padding.t - padding.b
  const step = chartW / (kline.length - 1)

  const points = close.map((v, i) => ({
    x: padding.l + i * step,
    y: padding.t + chartH - ((v - min) / range) * chartH
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const gradId = 'kline-grad'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxHeight: 200 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4caf50" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4caf50" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linePath} L${points[points.length - 1].x},${padding.t + chartH} L${points[0].x},${padding.t + chartH} Z`} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke="#4caf50" strokeWidth="2" />
      {[0, 0.25, 0.5, 0.75, 1].map(p => {
        const val = min + range * p
        const y = padding.t + chartH - p * chartH
        return <text key={p} x={padding.l - 5} y={y + 4} textAnchor="end" fill="#888" fontSize="11">{val.toFixed(2)}</text>
      })}
    </svg>
  )
}
