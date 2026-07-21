import { useState, useEffect, useRef } from 'react'
import { dataUrl } from '../dataUrl.js'

export default function CountdownBar() {
  const [updatedAt, setUpdatedAt] = useState(null)
  const [nextRefresh, setNextRefresh] = useState(null)
  const [now, setNow] = useState(Date.now())
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch(dataUrl('/data/market/meta.json?t=') + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?._updated_at) {
          setUpdatedAt(new Date(d._updated_at).getTime())
          setNextRefresh(new Date(d._updated_at).getTime() + 5 * 60 * 1000)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!nextRefresh) return null

  const remaining = Math.max(0, nextRefresh - now)
  const secs = Math.floor(remaining / 1000)
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  const expired = secs <= 0

  return (
    <div className="countdown-bar">
      <span className="countdown-label">
        {expired ? '刷新中...' : `下次刷新 ${m}:${s}`}
      </span>
    </div>
  )
}