import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSharedMarketData } from '../hooks/MarketDataContext.jsx'

const dimNames = { technical: '技术', momentum: '动量', volume: '成交量', valuation: '估值', sector: '板块', pattern: '形态', volatility: '波动率', sentiment: '情绪', fund_flow: '资金流', trend_strength: '趋势强度', correlation: '相关性', alpha: 'Alpha因子' }

function safeScore(v) { return v != null ? v : '-' }

export default function StockDetail() {
  const { code } = useParams()
  const { marketData, strategies } = useSharedMarketData()
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('a10lucky_favs') || '[]') }
    catch { return [] }
  })
  const [activeResult, setActiveResult] = useState(null)

  const toggleFav = () => {
    setFavs(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      localStorage.setItem('a10lucky_favs', JSON.stringify(next))
      return next
    })
  }

  const stock = useMemo(() => marketData?.stocks?.find(s => s.code === code), [marketData, code])

  const industryAvg = useMemo(() => {
    if (!marketData?.stocks || !stock?.industry) return null
    const same = marketData.stocks.filter(s => s.industry === stock.industry && s.change_pct != null)
    if (same.length < 2) return null
    const avg = same.reduce((a, s) => a + s.change_pct, 0) / same.length
    const rank = same.filter(s => (s.change_pct ?? 0) > (stock.change_pct ?? 0)).length + 1
    return { avg: avg.toFixed(2), count: same.length, rank, total: same.length }
  }, [marketData, stock])

  const strategyScores = useMemo(() => {
    if (!strategies?.length) return []
    return strategies.map(r => {
      const found = r.stocks.find(s => s.stock.code === code)
      return { name: r.displayName, key: r.name, totalScore: found?.totalScore, dimScores: found?.dimScores || {} }
    })
  }, [strategies, code])

  useEffect(() => {
    if (strategyScores.length > 0) setActiveResult(strategyScores[0].key)
  }, [strategyScores])

  if (!stock) return <div className="page"><div className="empty">未找到该股票</div></div>

  const active = strategyScores.find(s => s.key === activeResult)

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
        <div className="info-item"><span className="info-label">市值</span><span className="info-value">{stock.market_cap_yi?.toFixed(0) ?? '-'}亿</span></div>
        <div className="info-item"><span className="info-label">PE_TTM</span><span className="info-value">{stock.pe_ttm?.toFixed(2) ?? '-'}</span></div>
        <div className="info-item"><span className="info-label">PB</span><span className="info-value">{stock.pb?.toFixed(2) ?? '-'}</span></div>
        <div className="info-item"><span className="info-label">换手率</span><span className="info-value">{stock.turnover_pct?.toFixed(2) ?? '-'}%</span></div>
        <div className="info-item"><span className="info-label">量比</span><span className="info-value">{stock.volume_ratio?.toFixed(2) ?? '-'}</span></div>
      </div>

      <div className="stock-info-row">
        {stock.high != null && <div className="info-item"><span className="info-label">今日高</span><span className="info-value">{stock.high.toFixed(2)}</span></div>}
        {stock.low != null && <div className="info-item"><span className="info-label">今日低</span><span className="info-value">{stock.low.toFixed(2)}</span></div>}
        {stock.open != null && <div className="info-item"><span className="info-label">开盘</span><span className="info-value">{stock.open.toFixed(2)}</span></div>}
        {stock.pre_close != null && <div className="info-item"><span className="info-label">昨收</span><span className="info-value">{stock.pre_close.toFixed(2)}</span></div>}
        {industryAvg && (
          <div className="info-item">
            <span className="info-label">行业表现</span>
            <span className={'info-value ' + (industryAvg.avg >= 0 ? 'up' : 'down')}>
              {industryAvg.avg >= 0 ? '+' : ''}{industryAvg.avg}%
            </span>
          </div>
        )}
        {industryAvg && (
          <div className="info-item">
            <span className="info-label">行业排名</span>
            <span className="info-value">{industryAvg.rank}/{industryAvg.total}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>多策略评分对比 <span style={{fontSize:12,fontWeight:400,color:'var(--text-tertiary)',marginLeft:8}}>— 不在前10的显示为 -</span></h3>
        {strategyScores.length > 0 ? (
          <>
            <div className="strategy-score-row">
              {strategyScores.map(s => (
                <div key={s.key} className={'strategy-score-card' + (activeResult === s.key ? ' active' : '')} onClick={() => setActiveResult(s.key)}>
                  <div className="ss-name">{s.name}</div>
                  <div className={'ss-score ' + ((s.totalScore ?? 0) >= 60 ? 'high' : (s.totalScore ?? 0) >= 40 ? 'mid' : 'low')}>{safeScore(s.totalScore)}</div>
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
    </div>
  )
}