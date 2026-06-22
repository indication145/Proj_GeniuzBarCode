import { useStore, pick, type ConnStatus } from '@/store/useStore'
import { useBreakpoint } from '@/lib/useMediaQuery'

const statusColor: Record<ConnStatus, string> = { connected: '#1F8A5B', offline: '#C2410C', checking: 'var(--text-muted)' }
const statusLabel: Record<ConnStatus, string> = { connected: 'connected', offline: 'offline', checking: 'checking…' }

const moonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const sunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

export function Header() {
  const { bizList, bizId, shopList, shopId, connMode, connStatus, selectBiz, selectShop } = useStore()
  const dark = useStore((s) => s.dark)
  const toggleDark = useStore((s) => s.toggleDark)
  const { isMobile } = useBreakpoint()

  const selStyle: React.CSSProperties = {
    height: isMobile ? 34 : 38,
    border: '1px solid var(--border)',
    borderRadius: 9,
    background: 'var(--surface-2)',
    padding: isMobile ? '0 8px' : '0 11px',
    fontFamily: "'IBM Plex Sans Thai'",
    fontSize: isMobile ? 12.5 : 14.5,
    fontWeight: 500,
    color: 'var(--text)',
    cursor: 'pointer',
    minWidth: 0,
    maxWidth: isMobile ? undefined : 260,
    flex: isMobile ? 1 : undefined,
  }

  return (
    <header style={{ flexShrink: 0, display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'center', gap: isMobile ? '8px 10px' : 14, padding: isMobile ? '8px 12px' : '0 16px', minHeight: 54, background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono'", fontWeight: 700 }}>G</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>GeniuzBarCode</div>
          {!isMobile && <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'", letterSpacing: '0.08em' }}>LABEL DESIGNER</div>}
        </div>
      </div>

      {!isMobile && <div style={{ flex: 1 }} />}

      {/* biz/shop — on mobile these wrap to a full-width second row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flex: isMobile ? '1 1 100%' : undefined, order: isMobile ? 3 : undefined, minWidth: 0 }}>
        <label title="ธุรกิจ" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: isMobile ? 1 : undefined, minWidth: 0 }}>
          {!isMobile && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ธุรกิจ</span>}
          <select value={bizId} onChange={(e) => void selectBiz(e.target.value)} style={selStyle}>
            <option value="">— เลือกธุรกิจ —</option>
            {bizList.map((b, i) => {
              const v = pick(b, 'bizId')
              return (
                <option key={i} value={v}>
                  {v} · {pick(b, 'bizName', 'name') || v}
                </option>
              )
            })}
          </select>
        </label>

        <label title="ร้าน/สาขา" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: isMobile ? 1 : undefined, minWidth: 0 }}>
          {!isMobile && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ร้าน</span>}
          <select value={shopId} onChange={(e) => selectShop(e.target.value)} style={selStyle}>
            <option value="">— เลือกร้าน —</option>
            {shopList.map((s, i) => {
              const v = pick(s, 'shopId')
              return (
                <option key={i} value={v}>
                  {v} · {pick(s, 'shopName', 'name') || v}
                </option>
              )
            })}
          </select>
        </label>
      </div>

      <button onClick={toggleDark} title={dark ? 'โหมดสว่าง (Light)' : 'โหมดมืด (Dark)'} aria-label="สลับโหมดสว่าง/มืด" style={{ width: 34, height: 34, flexShrink: 0, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: isMobile ? 'auto' : undefined }}>
        {dark ? sunIcon : moonIcon}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 30, padding: isMobile ? '0 9px' : '0 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11.5, flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[connStatus], animation: 'gePulse 2.2s infinite' }} />
        {isMobile ? (connMode === 'sql' ? 'SQL' : 'REST') : `${connMode === 'sql' ? 'SQL Server' : 'REST API'} · ${statusLabel[connStatus]}`}
      </div>
    </header>
  )
}
