import { useStore, pick, type ConnStatus } from '@/store/useStore'
import { useBreakpoint } from '@/lib/useMediaQuery'

const statusColor: Record<ConnStatus, string> = { connected: '#1F8A5B', offline: '#C2410C', checking: '#9A938A' }
const statusLabel: Record<ConnStatus, string> = { connected: 'connected', offline: 'offline', checking: 'checking…' }

export function Header() {
  const { bizList, bizId, shopList, shopId, connMode, connStatus, selectBiz, selectShop } = useStore()
  const { isMobile } = useBreakpoint()

  const selStyle: React.CSSProperties = {
    height: isMobile ? 34 : 38,
    border: '1px solid #E6E3DF',
    borderRadius: 9,
    background: '#FBFAF9',
    padding: isMobile ? '0 8px' : '0 11px',
    fontFamily: "'IBM Plex Sans Thai'",
    fontSize: isMobile ? 12.5 : 14.5,
    fontWeight: 500,
    color: '#1B1A18',
    cursor: 'pointer',
    minWidth: 0,
    maxWidth: isMobile ? undefined : 260,
    flex: isMobile ? 1 : undefined,
  }

  return (
    <header style={{ flexShrink: 0, display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'center', gap: isMobile ? '8px 10px' : 14, padding: isMobile ? '8px 12px' : '0 16px', minHeight: 54, background: '#fff', borderBottom: '1px solid #E6E3DF', zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono'", fontWeight: 700 }}>G</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>GeniuzBarCode</div>
          {!isMobile && <div style={{ fontSize: 9, color: '#9A938A', fontFamily: "'IBM Plex Mono'", letterSpacing: '0.08em' }}>LABEL DESIGNER</div>}
        </div>
      </div>

      {!isMobile && <div style={{ flex: 1 }} />}

      {/* biz/shop — on mobile these wrap to a full-width second row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flex: isMobile ? '1 1 100%' : undefined, order: isMobile ? 3 : undefined, minWidth: 0 }}>
        <label title="ธุรกิจ" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: isMobile ? 1 : undefined, minWidth: 0 }}>
          {!isMobile && <span style={{ fontSize: 13, color: '#9A938A' }}>ธุรกิจ</span>}
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
          {!isMobile && <span style={{ fontSize: 13, color: '#9A938A' }}>ร้าน</span>}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 30, padding: isMobile ? '0 9px' : '0 12px', borderRadius: 20, border: '1px solid #E6E3DF', background: '#FBFAF9', fontSize: 11.5, flexShrink: 0, marginLeft: isMobile ? 'auto' : undefined }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[connStatus], animation: 'gePulse 2.2s infinite' }} />
        {isMobile ? (connMode === 'sql' ? 'SQL' : 'REST') : `${connMode === 'sql' ? 'SQL Server' : 'REST API'} · ${statusLabel[connStatus]}`}
      </div>
    </header>
  )
}
