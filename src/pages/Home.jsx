import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page home">
      <section className="hero-section">
        <h1 className="hero-title">A10Lucky <span className="hero-sub">智能选股系统</span></h1>
        <p className="hero-desc">多因子量化选股引擎 · 实时市场监控 · 交互式策略筛选</p>
        <div className="hero-actions">
          <Link to="/screener" className="btn btn-primary">开始选股</Link>
          <Link to="/market" className="btn btn-secondary">查看行情</Link>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>多策略选股</h3>
          <p>11 种策略覆盖价值、动量、反转、资金流等维度，适合不同市场环境</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>实时行情</h3>
          <p>全市场快照，板块轮动追踪，个股深度 K 线分析</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>即时计算</h3>
          <p>策略引擎在浏览器端运行，调整参数即时出结果，无需等待</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h3>历史回顾</h3>
          <p>每日策略结果归档，对比大盘表现，追踪选股胜率</p>
        </div>
      </section>

      <section className="download-section">
        <h2>桌面版 A10Lucky</h2>
        <p>更全功能：本地回测、ML 模型训练、离线使用</p>
        <a href="https://github.com/HYClub/A10Lucky-release/releases/latest" target="_blank" rel="noreferrer" className="btn btn-primary">
          下载 A10Lucky.exe
        </a>
      </section>
    </div>
  )
}
