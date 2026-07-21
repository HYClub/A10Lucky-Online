import { useState, useEffect } from 'react'

const INTERVAL = 65

export default function CountdownBar({ onRefresh, refreshing }) {
  const [count, setCount] = useState(INTERVAL)

  useEffect(() => {
    if (refreshing) {
      setCount(0)
      return
    }
    const tick = setInterval(() => {
      setCount(c => Math.max(c - 1, 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [refreshing])

  useEffect(() => {
    if (count <= 0 && !refreshing) {
      onRefresh?.()
      setCount(INTERVAL)
    }
  }, [count, refreshing, onRefresh])

  const m = String(Math.floor(count / 60)).padStart(2, '0')
  const s = String(count % 60).padStart(2, '0')

  return (
    <div className="countdown-bar">
      <span className="countdown-label">{m}:{s}</span>
      {refreshing && <span className="countdown-spinner"> ⟳</span>}
    </div>
  )
}
