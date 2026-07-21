import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSharedMarketData } from '../hooks/MarketDataContext.jsx'

export default function Screener() {
  const { strategies, marketData } = useSharedMarketData()
  const [activeTab, setActiveTab] = useState(0)

  const results = strategies ?? []
  const active = results[activeTab]

  return (
    <div className="page screener">
      <div className="page-header">
        <h2>策略选股</h2>
        {marketData?.date && <span style={{fontSize:13,color:'var(--text-tertiary)'}}>{marketData.date}</span>}
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <p>策略计算中...</p>
          <p className="hint">实时行情数据到达后自动计算</p>
        </div>
      ) : (
        <>
          <div className="strategy-tabs-wrap">
            <div className="strategy-tabs">
              {results.map((r, i) => (
                <button key={r.name} className={'strategy-tab' + (activeTab === i ? ' active' : '')} onClick={() => setActiveTab(i)}>
                  <span className="st-name">{r.displayName}</span>
                  <span className="st-count">{r.stocks.length}</span>
                </button>
              ))}
            </div>
          </div>

          {active && (
            <div className="card" style={{marginTop:16}}>
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
                    {active.stocks.map((item, i) => (
                      <tr key={item.stock.code}>
                        <td className="rank">{i + 1}</td>
                        <td><Link to={'/stock/' + item.stock.code} className="stock-link">{item.stock.code}</Link></td>
                        <td>{item.stock.name}</td>
                        <td><span className="score-badge">{item.totalScore}</span></td>
                        <td className={item.stock.change_pct >= 0 ? 'up' : 'down'}>{item.stock.price?.toFixed(2)}</td>
                        <td className={item.stock.change_pct >= 0 ? 'up' : 'down'}>
                          {item.stock.change_pct >= 0 ? '+' : ''}{item.stock.change_pct?.toFixed(2)}%
                        </td>
                        <td style={{color:'var(--text-tertiary)'}}>{item.stock.industry || '-'}</td>
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
        </>
      )}
    </div>
  )
}