import { useState } from 'react'
import { useStrategyHistory } from '../hooks/useMarketData.js'

export default function Results() {
  const { history, loading } = useStrategyHistory()
  const [selectedDate, setSelectedDate] = useState(null)
  const [detail, setDetail] = useState(null)

  const loadDetail = async (date) => {
    setSelectedDate(date)
    setDetail(null)
    try {
      const res = await fetch(`/data/archive/${date}.json?t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="page results">
      <div className="page-header">
        <h2>历史回顾</h2>
      </div>

      {loading && <div className="loading">加载中...</div>}

      {!loading && history.length === 0 && (
        <div className="empty">
          <p>历史数据尚未生成</p>
          <p className="hint">GitHub Actions 将在每天收盘后自动归档策略结果</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="history-grid">
          {history.map(h => (
            <div key={h.date} className={'history-card' + (selectedDate === h.date ? ' active' : '')} onClick={() => loadDetail(h.date)}>
              <div className="hist-date">{h.date}</div>
              <div className="hist-count">{h.count} 只</div>
              <div className={'hist-return ' + (h.avg_return >= 0 ? 'up' : 'down')}>
                平均 {h.avg_return >= 0 ? '+' : ''}{h.avg_return?.toFixed(2)}%
              </div>
              <div className="hist-strategy">{h.strategy}</div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="card detail-card">
          <h3>{selectedDate} 策略结果</h3>
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
                </tr>
              </thead>
              <tbody>
                {detail.stocks?.map((s, i) => (
                  <tr key={s.code}>
                    <td>{i + 1}</td>
                    <td>{s.code}</td>
                    <td>{s.name}</td>
                    <td><span className="score-badge">{s.score}</span></td>
                    <td className={s.change_pct >= 0 ? 'up' : 'down'}>{s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%</td>
                    <td>{s.industry || '-'}</td>
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
