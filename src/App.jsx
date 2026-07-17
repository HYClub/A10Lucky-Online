import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import Market from './pages/Market.jsx'
import Favorites from './pages/Favorites.jsx'
import Screener from './pages/Screener.jsx'
import Results from './pages/Results.jsx'
import StockDetail from './pages/StockDetail.jsx'

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/market" element={<Market />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/results" element={<Results />} />
          <Route path="/stock/:code" element={<StockDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
