import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dataUrl } from '../dataUrl.js'

export default function Results() {
  const [history, setHistory] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [detail, setDetail] = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    fetch(dataUrl('/data/archive/index.json?t=') + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setHistory(d))
      .catch(() => {})
  }, [])

  const loadDetail = async (date) => {
    setSelectedDate(date)
    setDetail(null)
    setActiveTab(0)
    try {
      const res = await fetch(dataUrl(`/data/archive/${date}.json?t=${Date.now()}`))
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="page results">
      <div className="page-header"><h2>历史回顾</h2></div>

      {history.length === 0 ? (
        <div className="empty">
          <p>历史数据尚未生成</p>
          <p className="hint">GitHub Actions 将在每天收盘后自动归档策略结果</p>
        </div>
      ) : (
        <>
          <div className="history-grid">
            {history.map(h => (
              <div key={h.date} className={'history-card' + (selectedDate === h.date ? ' active' : '')} onClick={() => loadDetail(h.date)}>
                <div className="hist-date">{h.date}</div>
                <div className="hist-index-row">
                  <span style={{color:'var(--text-tertiary)',fontSize:11}}>沪</span>
                  <span className={h.sh_index_pct >= 0 ? 'up' : 'down'}>{h.sh_index_pct >= 0 ? '+' : ''}{h.sh_index_pct?.toFixed(2)}%</span>
                  <span style={{color:'var(--text-tertiary)',fontSize:11,marginLeft:6}}>深</span>
                  <span className={h.sz_index_pct >= 0 ? 'up' : 'down'}>{h.sz_index_pct >= 0 ? '+' : ''}{h.sz_index_pct?.toFixed(2)}%</span>
                </div>
                <div className="hist-accuracy">
                  预测: <span className={h.accuracy >= 50 ? 'up' : 'down'}>{h.accuracy}%</span>
                </div>
                <div className="hist-strategy">{h.strategies} 策略</div>
              </div>
            ))}
          </div>

          {detail && (
            <>
              {/* 大盘指数 */}
              <div className="index-row" style={{marginBottom:16}}>
                {detail.indices?.map(idx => (
                  <div key={idx.code} className="index-card">
                    <div className="index-name">{idx.code === '000001' ? '上证' : idx.code === '399001' ? '深证' : idx.code === '399006' ? '创业板' : '沪深300'}</div>
                    <div className="index-price">{idx.price?.toFixed(2)}</div>
                    <div className={'index-pct ' + (idx.change_pct >= 0 ? 'up' : 'down')}>
                      {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* 深沪涨跌 */}
              <div className="overview-grid" style={{marginBottom:20}}>
                <div className="overview-card">
                  <div className="ov-label">沪市上涨</div>
                  <div className="ov-value up">{detail.sh?.up ?? '-'}</div>
                </div>
                <div className="overview-card">
                  <div className="ov-label">沪市下跌</div>
                  <div className="ov-value down">{detail.sh?.down ?? '-'}</div>
                </div>
                <div className="overview-card">
                  <div className="ov-label">深市上涨</div>
                  <div className="ov-value up">{detail.sz?.up ?? '-'}</div>
                </div>
                <div className="overview-card">
                  <div className="ov-label">深市下跌</div>
                  <div className="ov-value down">{detail.sz?.down ?? '-'}</div>
                </div>
                <div className="overview-card">
                  <div className="ov-label">涨停</div>
                  <div className="ov-value" style={{color:'#ff6b35'}}>{detail.market?.limitUp ?? '-'}</div>
                </div>
                <div className="overview-card">
                  <div className="ov-label">跌停</div>
                  <div className="ov-value" style={{color:'#a855f7'}}>{detail.market?.limitDown ?? '-'}</div>
                </div>
              </div>

              {/* 策略标签 */}
              <div className="strategy-tabs-wrap">
                <div className="strategy-tabs">
                  {detail.strategies?.map((r, i) => (
                    <button key={r.name} className={'strategy-tab' + (activeTab === i ? ' active' : '')} onClick={() => setActiveTab(i)}>
                      <span className="st-name">{r.displayName}</span>
                      <span className="st-count">{r.stocks.length}</span>
                    </button>
                  ))}
                </div>
              </div>

              {detail.strategies?.[activeTab] && (
                <div className="card" style={{marginTop:16}}>
                  <div className="card-header">
                    <h3>{detail.strategies[activeTab].displayName}</h3>
                    <span style={{fontSize:13,color:'var(--text-tertiary)'}}>
                      命中 {detail.strategies[activeTab].up}/{detail.strategies[activeTab].stocks.length}
                      <span className="up" style={{marginLeft:8,fontWeight:600}}>命中率 {detail.strategies[activeTab].accuracy}%</span>
                    </span>
                  </div>
                  <div className="table-wrap">
                    <table className="stock-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>代码</th>
                          <th>名称</th>
                          <th>评分</th>
                          <th>命中</th>
                          <th>涨跌幅</th>
                          <th>行业</th>
                          <th>价格</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.strategies[activeTab].stocks.map((s, i) => (
                          <tr key={s.code}>
                            <td className="rank">{i + 1}</td>
                            <td><Link to={'/stock/' + s.code} className="stock-link">{s.code}</Link></td>
                            <td>{s.name}</td>
                            <td><span className="score-badge">{s.score}</span></td>
                            <td className={s.change_pct >= 0 ? 'up' : 'down'}>{s.change_pct >= 0 ? '✔' : '✘'}</td>
                            <td className={s.change_pct >= 0 ? 'up' : 'down'}>{s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%</td>
                            <td style={{color:'var(--text-tertiary)'}}>{s.industry || '-'}</td>
                            <td className={s.change_pct >= 0 ? 'up' : 'down'}>{s.price?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}