import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dataUrl } from '../dataUrl.js'

const INDEX_NAMES = { '000001': '上证指数', '399001': '深证成指', '399006': '创业板指', '399300': '沪深300' }

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
                <div className="hist-market">
                  <span className="up">↑{h.up}</span>
                  <span style={{color:'var(--text-tertiary)',margin:'0 4px'}}>/</span>
                  <span className="down">↓{h.down}</span>
                </div>
                <div className="hist-detail">
                  {h.limitUp > 0 && <span className="up">涨停{h.limitUp}</span>}
                  {h.limitDown > 0 && <span className="down" style={{marginLeft:8}}>跌停{h.limitDown}</span>}
                </div>
                <div className="hist-strategy">{h.strategies} 个策略</div>
              </div>
            ))}
          </div>

          {detail && (
            <>
              {/* 大盘指数 */}
              <div className="index-row" style={{marginBottom:16}}>
                {detail.indices?.map(idx => (
                  <div key={idx.code} className="index-card">
                    <div className="index-name">{INDEX_NAMES[idx.code] || idx.code}</div>
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

              {/* 策略预测 */}
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
                      上涨 {detail.strategies[activeTab].up} / 下跌 {detail.strategies[activeTab].down}
                      <span className="up" style={{marginLeft:8,fontWeight:600}}>
                        预测概率 {detail.strategies[activeTab].accuracy}%
                      </span>
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
                          <th>当日涨跌幅</th>
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