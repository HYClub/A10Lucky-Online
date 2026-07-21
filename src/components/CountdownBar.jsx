import { useState, useEffect, useRef } from 'react'
import { dataUrl } from '../dataUrl.js'

function parseMeta() {
  return fetch(dataUrl('/data/market/meta.json?t=') + Date.now())
    .then(r => r.ok ? r.json() : null)
}

export default function CountdownBar() {
  const [nextRefresh, setNextRefresh] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [polling, setPolling] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    parseMeta().then(d => {
      if (d?._updated_at) setNextRefresh(new Date(d._updated_at).getTime() + 5 * 60 * 1000)
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  /* poll for new meta when countdown expires */
  useEffect(() => {
    if (!nextRefresh || now < nextRefresh) return
    setPolling(true)
    const id = setInterval(() => {
      parseMeta().then(d => {
        if (d?._updated_at) {
          const t = new Date(d._updated_at).getTime() + 5 * 60 * 1000
          if (t !== nextRefresh) {
            setNextRefresh(t)
            setPolling(false)
          }
        }
      })
    }, 3000)
    return () => { clearInterval(id); setPolling(false) }
  }, [nextRefresh, now])

  if (!nextRefresh) return null

  const remaining = Math.max(0, nextRefresh - now)
  const secs = Math.floor(remaining / 1000)
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')

  return (
    <div className="countdown-bar">
      <span className="countdown-label">
        {polling ? '···' : `${m}:${s}`}
      </span>
    </div>
  )
}