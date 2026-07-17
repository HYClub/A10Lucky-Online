import { useMarketData } from '../hooks/useMarketData.js'
import { Link } from 'react-router-dom'

const INDEX_NAMES = { '000001': '上证指数', '399001': '深证成指', '399006': '创业板指', '399300': '沪深300' }
const STATUS_ORDER = { bull: 0, neutral: 1, bear: 2 }

function calcMarketStats(marketData) {
  if (!marketData?.stocks?.length) return null
  const stocks = marketData.stocks
  const up = stocks.filter(s => (s.change_pct ?? 0) > 0).length
  const down = stocks.filter(s => (s.change_pct ?? 0) < 0).length
  const flat = stocks.length - up - down
  const limitUp = stocks.filter(s => (s.change_pct ?? 0) >= 9.8).length
  const limitDown = stocks.filter(s => (s.change_pct ?? 0) <= -9.8).length
  const totalVol = stocks.reduce((a, s) => a + (s.turnover_pct ?? 0), 0)
  return { up, down, flat, limitUp, limitDown, totalVol }
}

function getTopLosers(stocks, n = 5) {
  return [...stocks].sort((a, b) => (a.change_pct ?? 0) - (b.change_pct ?? 0)).slice(0, n)
}

function getTopGainers(stocks, n = 5) {
  return [...stocks].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0)).slice(0, n)
}

export default function Home() {
  const { marketData, loading, error } = useMarketData()
  const indices = marketData?.indices ?? []
  const stats = calcMarketStats(marketData)
  const stocks = marketData?.stocks ?? []

  if (loading) return <div className="page"><div className="loading">加载中...</div></div>
  if (error) return <div className="page"><div className="empty">行情数据加载中，请稍候</div></div>

  return (
    <div className="page home">
      {/* 大盘指数 */}
      <section className="index-hero">
        <div className="index-hero-header">
          <h2>A股市场</h2>
          <span className="market-date">{marketData?.date}</span>
        </div>
        <div className="index-hero-grid">
          {indices.map(idx => (
            <div key={idx.code} className="index-hero-card">
              <div className="idxh-name">{INDEX_NAMES[idx.code] || idx.code}</div>
              <div className="idxh-price">{idx.price?.toFixed(2)}</div>
              <div className={'idxh-change ' + (idx.change_pct >= 0 ? 'up' : 'down')}>
                <span className="idxh-arrow">{idx.change_pct >= 0 ? '▲' : '▼'}</span>
                {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 市场概况 */}
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
            <div className="overview-card flat">
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
              <div className="ov-value">{stats.totalVol.toFixed(0)}%</div>
            </div>
          </div>
        </section>
      )}

      {/* 快速入口 */}
      <section className="quick-actions">
        <Link to="/market" className="qa-card">
          <span className="qa-icon">📋</span>
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

      {/* 涨幅榜 / 跌幅榜 */}
      {stocks.length > 0 && (
        <div className="leaderboard-grid">
          <div className="card">
            <div className="card-header"><h3>涨幅榜</h3></div>
            <table className="leader-table">
              <thead>
                <tr><th>代码</th><th>名称</th><th>涨跌幅</th><th>价格</th></tr>
              </thead>
              <tbody>
                {getTopGainers(stocks).map(s => (
                  <tr key={s.code}>
                    <td><Link to={'/stock/' + s.code} className="stock-link">{s.code}</Link></td>
                    <td>{s.name}</td>
                    <td className="up">+{s.change_pct?.toFixed(2)}%</td>
                    <td>{s.price?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header"><h3>跌幅榜</h3></div>
            <table className="leader-table">
              <thead>
                <tr><th>代码</th><th>名称</th><th>涨跌幅</th><th>价格</th></tr>
              </thead>
              <tbody>
                {getTopLosers(stocks).map(s => (
                  <tr key={s.code}>
                    <td><Link to={'/stock/' + s.code} className="stock-link">{s.code}</Link></td>
                    <td>{s.name}</td>
                    <td className="down">{s.change_pct?.toFixed(2)}%</td>
                    <td>{s.price?.toFixed(2)}</td>
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
