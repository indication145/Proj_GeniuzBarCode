import { useEffect, useState } from 'react'

// Phase 1 scaffold placeholder — proves React renders and the /api proxy reaches
// server.js. Replaced by the real shell (Header + NavRail + views) in Phase 3.
export default function App() {
  const [health, setHealth] = useState('checking…')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => setHealth(j.ok ? 'API OK ✓ (proxied to server.js)' : 'API responded, not ok'))
      .catch((e) => setHealth('API error: ' + e.message))
  }, [])

  return (
    <div style={{ fontFamily: "'IBM Plex Sans Thai', system-ui, sans-serif", padding: 32, color: '#1B1A18' }}>
      <h1 style={{ marginBottom: 4 }}>GeniuzBarCode — Vite shell</h1>
      <p style={{ color: '#78716c' }}>Phase 1 scaffold · React {/* version shown below */}</p>
      <p>
        Backend health: <b data-testid="health">{health}</b>
      </p>
    </div>
  )
}
