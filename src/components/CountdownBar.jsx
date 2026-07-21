import { useState, useEffect, useRef } from 'react'
import { dataUrl } from '../dataUrl.js'

export default function CountdownBar() {
  const [nextRefresh, setNextRefresh] = useState(null)
  const [now, setNow] = useState(Date.now())
  const fetched = useRef(false)
  const pollId = useRef(null)

  const setFromMeta = () => {
    fetch(dataUrl('/data/market/meta.json?t=') + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?._updated_at) setNextRefresh(new Date(d._updated_at).getTime() + 5 * 60 * 1000)
      })
  }

  useEffect(() => {
    if (!fetched.current) { fetched.current = true; setFromMeta() }
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])

  /* poll for new data when countdown expires */
  useEffect(() => {
    if (nextRefresh && now >= nextRefresh) {
      if (!pollId.current) {
        pollId.current = setInterval(setFromMeta, 3000)
      }
    } else {
      if (pollId.current) { clearInterval(pollId.current); pollId.current = null }
    }
  }, [nextRefresh, now])

  if (!nextRefresh) return null

  const remaining = Math.max(0, nextRefresh - now)
  const secs = Math.floor(remaining / 1000)
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')

  return (
    <div className="countdown-bar">
      <span className="countdown-label">{m}:{s}</span>
    </div>
  )
}