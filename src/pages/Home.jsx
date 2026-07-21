import { Link } from 'react-router-dom'
import { useSharedMarketData } from '../hooks/MarketDataContext.jsx'

const INDEX_NAMES = { '000001': '上证指数', '399001': '深证成指', '399006': '创业板指', '399300': '沪深300' }

function calcStats(stocks) {
  if (!stocks?.length) return null
  const up = stocks.filter(s => (s.change_pct ?? 0) > 0).length
  const down = stocks.filter(s => (s.change_pct ?? 0) < 0).length
  const flat = stocks.length - up - down
  const limitUp = stocks.filter(s => (s.change_pct ?? 0) >= 9.8).length
  const limitDown = stocks.filter(s => (s.change_pct ?? 0) <= -9.8).length
  const turnover = stocks.reduce((a, s) => a + (s.turnover_pct ?? 0), 0)
  return { up, down, flat, limitUp, limitDown, turnover }
}

export default function Home() {
  const { marketData, loading } = useSharedMarketData()

  const indices = marketData?.indices ?? []
  const stats = marketData?.stocks ? calcStats(marketData.stocks) : null

  if (loading && !marketData) {
    return (
      <div className="home">
        <section className="index-hero">
          <div className="index-hero-header"><h2>A股市场</h2></div>
          <div className="index-hero-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="index-hero-card">
                <div className="idxh-name" style={{opacity:0.3}}>——</div>
                <div className="idxh-price" style={{opacity:0.15}}>——</div>
                <div className="idxh-change" style={{opacity:0.1}}>——</div>
              </div>
            ))}
          </div>
        </section>
        <div style={{textAlign:'center',padding:40,color:'var(--text-tertiary)',fontSize:14}}>
          加载行情数据中...<span className="loading-dots"></span>
        </div>
      </div>
    )
  }

  return (
    <div className="home">

      <section className="index-hero">
        <div className="index-hero-header">
          <h2>A股市场</h2>
          {marketData?.date && <span className="market-date">{marketData.date}</span>}
        </div>
        <div className="index-hero-grid">
          {(indices.length ? indices : [1,2,3,4]).map((idx, i) => (
            <div key={idx.code || i} className="index-hero-card">
              <div className="idxh-name">{idx.code ? INDEX_NAMES[idx.code] || idx.code : '—'}</div>
              <div className="idxh-price">{idx.price?.toFixed(2) ?? '—'}</div>
              {idx.change_pct != null ? (
                <div className={'idxh-change ' + (idx.change_pct >= 0 ? 'up' : 'down')}>
                  <span>{idx.change_pct >= 0 ? '▲' : '▼'}</span>
                  {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                </div>
              ) : (
                <div className="idxh-change" style={{color:'var(--text-tertiary)'}}>—</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {marketData?.index_kline?.['000001'] && (
        <section style={{marginBottom:24}}>
          <IndexChart data={marketData.index_kline['000001']} indexData={marketData.indices?.find(i => i.code === '000001')} />
        </section>
      )}

      {stats && (
        <section className="market-overview">
          <div className="overview-grid">
            <div className="overview-card up">
              <div className="ov-label">上涨</div>
              <div className="ov-value">{stats.up}</div>
            </div>
            <div className="overview-card down">
              <div className="ov-label">下跌</div>
              <div className="ov-value">{stats.down}</div>
            </div>
            <div className="overview-card">
              <div className="ov-label">平盘</div>
              <div className="ov-value">{stats.flat}</div>
            </div>
            <div className="overview-card limit-up">
              <div className="ov-label">涨停</div>
              <div className="ov-value">{stats.limitUp}</div>
            </div>
            <div className="overview-card limit-down">
              <div className="ov-label">跌停</div>
              <div className="ov-value">{stats.limitDown}</div>
            </div>
            <div className="overview-card">
              <div className="ov-label">总换手率</div>
              <div className="ov-value">{stats.turnover.toFixed(0)}%</div>
            </div>
          </div>
        </section>
      )}

      <section className="quick-actions">
        <Link to="/market" className="qa-card">
          <span className="qa-icon">📊</span>
          <span className="qa-title">全部行情</span>
          <span className="qa-arrow">→</span>
        </Link>
        <Link to="/screener" className="qa-card">
          <span className="qa-icon">🎯</span>
          <span className="qa-title">策略选股</span>
          <span className="qa-arrow">→</span>
        </Link>
        <Link to="/results" className="qa-card">
          <span className="qa-icon">📈</span>
          <span className="qa-title">历史结果</span>
          <span className="qa-arrow">→</span>
        </Link>
      </section>
    </div>
  )
}

function IndexChart({ data, indexData }) {
  try {
    if (!data || data.length < 2) throw null
    const close = data.map(d => d.close).filter(v => v != null)
    if (close.length < 2) throw null
    const dates = data.map(d => d.date)
    const max = Math.max(...close)
    const min = Math.min(...close)
    const range = max - min || 1
    const price = indexData?.price ?? close[close.length - 1]
    const chg = indexData?.change_pct
    const isUp = chg != null ? chg >= 0 : close[close.length - 1] >= close[0]
    const lineColor = isUp ? 'var(--up)' : 'var(--down)'
    const w = 1100, h = 280
    const pad = { t: 24, r: 16, b: 36, l: 60 }
    const cw = w - pad.l - pad.r
    const ch = h - pad.t - pad.b
    const stepX = cw / (close.length - 1)
    const points = close.map((v, i) => ({ x: pad.l + i * stepX, y: pad.t + ch - ((v - min) / range) * ch }))
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(pad.t + ch).toFixed(1)} L${points[0].x.toFixed(1)},${(pad.t + ch).toFixed(1)} Z`
    const yTicks = [0, 0.25, 0.5, 0.75, 1]
    const xTicks = [0, Math.floor(close.length / 4), Math.floor(close.length / 2), Math.floor(close.length * 3 / 4), close.length - 1]
    return (
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'18px 20px 0',display:'flex',alignItems:'baseline',gap:12}}>
          <span style={{fontSize:15,fontWeight:600,color:'#fff'}}>上证指数</span>
          <span style={{fontSize:22,fontWeight:700,fontFamily:'var(--font-num)',color:lineColor}}>{price.toFixed(2)}</span>
          {chg != null && <span style={{fontSize:13,color:'var(--text-tertiary)'}}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}% {isUp ? '↑' : '↓'}</span>}
          <span style={{fontSize:12,color:'var(--text-tertiary)',marginLeft:'auto'}}>{dates[0]} ~ {dates[dates.length-1]}</span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',display:'block'}}>
          <defs><linearGradient id="idx-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lineColor} stopOpacity="0.2" /><stop offset="100%" stopColor={lineColor} stopOpacity="0" /></linearGradient></defs>
          {yTicks.map(p => { const val = min + range * p; const y = pad.t + ch - p * ch; return (<g key={p}><text x={pad.l - 8} y={y + 4} textAnchor="end" fill="var(--text-tertiary)" fontSize="11" fontFamily="var(--font-num)">{val.toFixed(0)}</text><line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" /></g>) })}
          {xTicks.map((idx, i) => <text key={i} x={points[idx]?.x} y={pad.t + ch + 20} textAnchor="middle" fill="var(--text-tertiary)" fontSize="11">{dates[idx]?.slice(5) || ''}</text>)}
          <path d={areaPath} fill="url(#idx-grad)" />
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  } catch { return null }
}