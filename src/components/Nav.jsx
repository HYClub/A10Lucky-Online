import { NavLink } from 'react-router-dom'
import CountdownBar from './CountdownBar.jsx'

const LINKS = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/market', label: '行情', icon: '📊' },
  { to: '/favorites', label: '自选', icon: '⭐' },
  { to: '/screener', label: '选股', icon: '🎯' },
  { to: '/results', label: '回顾', icon: '📋' },
]

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="nav-brand">A10Lucky</NavLink>
        <div className="nav-links">
          {LINKS.map(link => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end={link.to === '/'}>
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="nav-right">
          <CountdownBar />
        </div>
      </div>
    </nav>
  )
}
