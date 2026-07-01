import { useEffect, useState } from 'react'
import * as api from '@/lib/api'
import { ACCENT_CHOICES, type Mood, type Stock } from '@/lib/theme'
import { useStore, pick } from '@/store/useStore'
import { useBreakpoint } from '@/lib/useMediaQuery'
import * as paperang from '@/lib/paperang'

const MOOD_OPTS: { v: Mood; label: string }[] = [
  { v: 'studio', label: 'สตูดิโอ (จุดเทา)' },
  { v: 'blueprint', label: 'บลูพรินต์ (กริดน้ำเงิน)' },
  { v: 'spotlight', label: 'สปอตไลต์ (ไล่แสง)' },
  { v: 'paper', label: 'กระดาษ (โทนอุ่น)' },
]
const STOCK_OPTS: { v: Stock; label: string }[] = [
  { v: 'plain', label: 'เรียบ (ขาว)' },
  { v: 'cream', label: 'ครีม' },
  { v: 'kraft', label: 'คราฟท์' },
  { v: 'thermal', label: 'เทอร์มอล' },
]

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 }
const cardLabel: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono'", marginBottom: 12 }
const fieldLabel: React.CSSProperties = { fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }

interface Cfg {
  baseUrl: string
  apiKey: string
  hasApiKey: boolean
  sqlHost: string
  sqlPort: string
  sqlDatabase: string
  sqlUser: string
  sqlPassword: string
  sqlHasPassword: boolean
}
const EMPTY: Cfg = { baseUrl: '', apiKey: '', hasApiKey: false, sqlHost: '', sqlPort: '1433', sqlDatabase: '', sqlUser: '', sqlPassword: '', sqlHasPassword: false }

export function SettingsView() {
  const { accent, mood, stock, setAccent, setMood, setStock } = useStore()
  const { connMode, connStatus, setConnMode, loadHeader, toast } = useStore()
  const { bizList, bizId, shopList, shopId, selectBiz, selectShop } = useStore()
  const { paperangConnected, paperangDeviceName, connectPaperang, disconnectPaperang } = useStore()

  const [cfg, setCfg] = useState<Cfg>(EMPTY)
  const [busy, setBusy] = useState(false)
  const up = (p: Partial<Cfg>) => setCfg((c) => ({ ...c, ...p }))
  const { isMobile } = useBreakpoint()
  const pair: React.CSSProperties = { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 12 }

  useEffect(() => {
    api
      .getConfig()
      .then((j) => {
        if (!j.ok || !j.config) return
        const c = j.config
        const q = c.sql || {}
        setConnMode(c.dataSource === 'sql' ? 'sql' : 'api')
        setCfg({
          baseUrl: c.baseUrl || '',
          apiKey: '',
          hasApiKey: !!c.hasApiKey,
          sqlHost: q.host || '',
          sqlPort: q.port || '1433',
          sqlDatabase: q.database || '',
          sqlUser: q.user || '',
          sqlPassword: '',
          sqlHasPassword: !!q.hasPassword,
        })
      })
      .catch(() => {})
  }, [setConnMode])

  async function doConnect() {
    const body: Record<string, unknown> = { mode: connMode }
    if (connMode === 'sql') {
      const sql: Record<string, unknown> = { host: cfg.sqlHost.trim(), port: cfg.sqlPort || '1433', database: cfg.sqlDatabase.trim(), user: cfg.sqlUser.trim() }
      if (cfg.sqlPassword !== '') sql.password = cfg.sqlPassword
      body.sql = sql
    } else {
      body.baseUrl = cfg.baseUrl.trim()
      if (cfg.apiKey.trim()) body.apiKey = cfg.apiKey.trim()
    }
    setBusy(true)
    try {
      const j = await api.saveConfig(body)
      if (!j.ok) throw new Error('บันทึกไม่สำเร็จ')
      const q = j.config.sql || {}
      up({ apiKey: '', hasApiKey: !!j.config.hasApiKey, sqlPassword: '', sqlHasPassword: !!q.hasPassword })
      toast('บันทึก ' + ((j.changed || []).join(', ') || 'การตั้งค่า') + ' แล้ว')
      await loadHeader()
    } catch {
      toast('บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const tabStyle = (on: boolean): React.CSSProperties => ({
    flex: 1,
    height: 34,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans Thai'",
    fontSize: 12.5,
    fontWeight: 600,
    background: on ? 'var(--surface)' : 'transparent',
    color: on ? 'var(--accent)' : 'var(--text-3)',
    boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', padding: isMobile ? '16px 12px' : '28px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>ตั้งค่าการเชื่อมต่อข้อมูล</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Data Connection · SQL Server หรือ REST API</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 30, padding: '0 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: connStatus === 'connected' ? '#1F8A5B' : connStatus === 'offline' ? '#C2410C' : 'var(--text-muted)' }} />
            {connStatus}
          </div>
        </div>

        {/* connection */}
        <div style={card}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, background: 'var(--bg)', padding: 4, borderRadius: 10 }}>
            <button onClick={() => setConnMode('api')} style={tabStyle(connMode === 'api')}>
              REST API
            </button>
            <button onClick={() => setConnMode('sql')} style={tabStyle(connMode === 'sql')}>
              SQL Server
            </button>
          </div>

          {connMode === 'api' ? (
            <>
              <label style={{ display: 'block', marginBottom: 11 }}>
                <span style={fieldLabel}>Endpoint · CSITH_BASE_URL</span>
                <input className="ge-field" value={cfg.baseUrl} onChange={(e) => up({ baseUrl: e.target.value })} placeholder="http://cli.csith.com" />
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={fieldLabel}>API Key · CSITH_API_KEY</span>
                <input className="ge-field" type="password" value={cfg.apiKey} onChange={(e) => up({ apiKey: e.target.value })} placeholder={cfg.hasApiKey ? 'เว้นว่างไว้ถ้าไม่เปลี่ยน' : 'วาง API Key ที่นี่'} />
              </label>
            </>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <label>
                <span style={fieldLabel}>Server / Host</span>
                <input className="ge-field" value={cfg.sqlHost} onChange={(e) => up({ sqlHost: e.target.value })} placeholder="192.168.1.10\GENIUZ" />
              </label>
              <div style={pair}>
                <label style={{ flex: 2 }}>
                  <span style={fieldLabel}>Database</span>
                  <input className="ge-field" value={cfg.sqlDatabase} onChange={(e) => up({ sqlDatabase: e.target.value })} placeholder="GeniuzPOS" />
                </label>
                <label style={{ flex: 1 }}>
                  <span style={fieldLabel}>Port</span>
                  <input className="ge-field" value={cfg.sqlPort} onChange={(e) => up({ sqlPort: e.target.value })} placeholder="1433" />
                </label>
              </div>
              <div style={pair}>
                <label style={{ flex: 1 }}>
                  <span style={fieldLabel}>User</span>
                  <input className="ge-field" value={cfg.sqlUser} onChange={(e) => up({ sqlUser: e.target.value })} placeholder="sa" />
                </label>
                <label style={{ flex: 1 }}>
                  <span style={fieldLabel}>Password</span>
                  <input className="ge-field" type="password" value={cfg.sqlPassword} onChange={(e) => up({ sqlPassword: e.target.value })} placeholder={cfg.sqlHasPassword ? 'เว้นว่างไว้ถ้าไม่เปลี่ยน' : 'รหัสผ่าน'} />
                </label>
              </div>
            </div>
          )}

          <button
            onClick={() => void doConnect()}
            disabled={busy}
            style={{ width: '100%', height: 42, marginTop: 16, border: 'none', borderRadius: 10, background: 'var(--accent)', color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, boxShadow: '0 3px 12px var(--accent-shadow)' }}
          >
            {busy ? 'กำลังบันทึก…' : 'บันทึก & ทดสอบเชื่อมต่อ'}
          </button>
        </div>

        {/* scope */}
        <div style={card}>
          <div style={cardLabel}>ขอบเขตข้อมูล · SCOPE</div>
          <div style={pair}>
            <label style={{ flex: 1 }}>
              <span style={fieldLabel}>ธุรกิจ · Business</span>
              <select className="ge-field" value={bizId} onChange={(e) => void selectBiz(e.target.value)}>
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
            <label style={{ flex: 1 }}>
              <span style={fieldLabel}>ร้าน/สาขา · Shop</span>
              <select className="ge-field" value={shopId} onChange={(e) => selectShop(e.target.value)}>
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
        </div>

        {/* PAPERANG bluetooth printer */}
        {paperang.isSupported() && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={cardLabel}>เครื่องพิมพ์ Bluetooth · PAPERANG</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: paperangConnected ? '#1F8A5B' : 'var(--text-muted)' }} />
                  {paperangConnected ? `เชื่อมต่อ ${paperangDeviceName} แล้ว` : 'ยังไม่ได้เชื่อมต่อ'}
                </div>
              </div>
              {paperangConnected ? (
                <button onClick={disconnectPaperang} style={{ height: 36, padding: '0 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", color: 'var(--text-2)' }}>
                  ตัดการเชื่อมต่อ
                </button>
              ) : (
                <button onClick={() => void connectPaperang()} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 8, background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 600 }}>
                  เชื่อมต่อเครื่องพิมพ์
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>รองรับ PAPERANG รุ่น P1/P2/P2S · พิมพ์กว้างสูงสุด 48mm · ต้องใช้ Chrome หรือ Edge</div>
          </div>
        )}

        {/* theme */}
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={cardLabel}>ธีม · THEME</div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...fieldLabel, marginBottom: 8 }}>สีหลักของแอป · Accent</span>
            <div style={{ display: 'flex', gap: 10 }}>
              {ACCENT_CHOICES.map((c) => {
                const on = accent.toLowerCase() === c.toLowerCase()
                return <button key={c} onClick={() => setAccent(c)} title={c} style={{ width: 30, height: 30, borderRadius: 8, cursor: 'pointer', background: c, border: on ? '2px solid var(--text)' : '1px solid var(--border)', boxShadow: on ? '0 0 0 2px var(--surface) inset' : 'none' }} />
              })}
            </div>
          </div>
          <div style={pair}>
            <label style={{ flex: 1 }}>
              <span style={fieldLabel}>พื้นหลังพื้นที่ออกแบบ · Canvas</span>
              <select className="ge-field" value={mood} onChange={(e) => setMood(e.target.value as Mood)}>
                {MOOD_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <span style={fieldLabel}>เนื้อกระดาษป้าย · Stock</span>
              <select className="ge-field" value={stock} onChange={(e) => setStock(e.target.value as Stock)}>
                {STOCK_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
