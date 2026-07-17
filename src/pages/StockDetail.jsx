import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { dataUrl } from '../dataUrl.js'

const dimNames = { technical: '技术', momentum: '动量', volume: '成交量', valuation: '估值', sector: '板块', pattern: '形态', volatility: '波动率', sentiment: '情绪', fund_flow: '资金流', trend_strength: '趋势强度', correlation: '相关性', alpha: 'Alpha因子' }

export default function StockDetail() {
  const { code } = useParams()
  const [stratData, setStratData] = useState(null)
  const [marketData, setMarketData] = useState(null)
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('a10lucky_favs') || '[]') }
    catch { return [] }
  })
  const [activeResult, setActiveResult] = useState(null)

  useEffect(() => {
    fetch(dataUrl('/data/strategies/latest.json?t=') + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStratData(d))
    fetch(dataUrl('/data/market/latest.json?t=') + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMarketData(d))
  }, [])

  const toggleFav = () => {
    setFavs(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      localStorage.setItem('a10lucky_favs', JSON.stringify(next))
      return next
    })
  }

  const stock = useMemo(() => marketData?.stocks?.find(s => s.code === code), [marketData, code])

  const strategyScores = useMemo(() => {
    if (!stratData?.results) return []
    return stratData.results.map(r => {
      const found = r.stocks.find(s => s.stock.code === code)
      return { name: r.displayName, key: r.name, totalScore: found?.totalScore || 0, dimScores: found?.dimScores || {} }
    })
  }, [stratData, code])

  useEffect(() => {
    if (strategyScores.length > 0) setActiveResult(strategyScores[0].key)
  }, [strategyScores])

  if (!stock) return <div className="page"><div className="empty">未找到该股票</div></div>

  const active = strategyScores.find(s => s.key === activeResult)
  const kline = stock.kline || []

  return (
    <div className="page stock-detail">
      <Link to="/market" className="back-link">← 返回行情</Link>
      <div className="stock-header">
        <div>
          <h2>{stock.name} <span className="stock-code">{stock.code}</span></h2>
          <div className="stock-price-row">
            <span className={'stock-price ' + (stock.change_pct >= 0 ? 'up' : 'down')}>{stock.price?.toFixed(2)}</span>
            <span className={'stock-pct ' + (stock.change_pct >= 0 ? 'up' : 'down')}>
              {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct?.toFixed(2)}%
            </span>
          </div>
        </div>
        <button className={'fav-btn big' + (favs.includes(code) ? ' active' : '')} onClick={toggleFav}>
          {favs.includes(code) ? '★ 已收藏' : '☆ 加入自选'}
        </button>
      </div>

      <div className="stock-info-row">
        <div className="info-item"><span className="info-label">行业</span><span className="info-value">{stock.industry || '-'}</span></div>
        <div className="info-item"><span className="info-label">市值</span><span className="info-value">{stock.market_cap_yi?.toFixed(0)}亿</span></div>
        <div className="info-item"><span className="info-label">PE_TTM</span><span className="info-value">{stock.pe_ttm?.toFixed(2) || '-'}</span></div>
        <div className="info-item"><span className="info-label">PB</span><span className="info-value">{stock.pb?.toFixed(2) || '-'}</span></div>
        <div className="info-item"><span className="info-label">换手率</span><span className="info-value">{stock.turnover_pct?.toFixed(2)}%</span></div>
      </div>

      <div className="card">
        <h3>多策略评分对比</h3>
        {strategyScores.length > 0 ? (
          <>
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
                      <div className="dim-bar" style={{ width: score + '%', backgroundColor: score >= 60 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444' }}></div>
                    </div>
                    <span className="dim-val">{Math.round(score)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{color:'var(--text-tertiary)',fontSize:13}}>暂无评分数据</div>
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
  const points = close.map((v, i) => ({ x: padding.l + i * step, y: padding.t + chartH - ((v - min) / range) * chartH }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const gradId = 'kline-grad'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxHeight: 200 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linePath} L${points[points.length-1].x},${padding.t+chartH} L${points[0].x},${padding.t+chartH} Z`} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {[0,0.25,0.5,0.75,1].map(p => {
        const val = min + range * p
        const y = padding.t + chartH - p * chartH
        return <text key={p} x={padding.l-5} y={y+4} textAnchor="end" fill="var(--text-tertiary)" fontSize="11" fontFamily="monospace">{val.toFixed(2)}</text>
      })}
    </svg>
  )
}