import { ACCENT_CHOICES, type Mood, type Stock } from '@/lib/theme'
import { useStore } from '@/store/useStore'

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

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #E6E3DF', borderRadius: 14, padding: 20, marginBottom: 16 }
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: '#9A938A', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono'", marginBottom: 12 }
const selectStyle: React.CSSProperties = { width: '100%', fontFamily: "'IBM Plex Sans Thai'", fontSize: 12.5, border: '1px solid #E6E3DF', borderRadius: 8, padding: '9px 11px', background: '#FBFAF9', cursor: 'pointer' }

// Phase 3: theme switcher only (proves store + CSS-var accent). The full
// connection (REST/SQL) + scope (biz/shop) settings arrive in Phase 4.
export function SettingsView() {
  const { accent, mood, stock, setAccent, setMood, setStock } = useStore()
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#F4F3F1', padding: '28px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>ตั้งค่า</div>

        <div style={cardStyle}>
          <div style={labelStyle}>ธีม · THEME</div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: '#78716c', display: 'block', marginBottom: 8 }}>สีหลักของแอป · Accent</span>
            <div style={{ display: 'flex', gap: 10 }}>
              {ACCENT_CHOICES.map((c) => {
                const on = accent.toLowerCase() === c.toLowerCase()
                return (
                  <button
                    key={c}
                    onClick={() => setAccent(c)}
                    title={c}
                    style={{ width: 30, height: 30, borderRadius: 8, cursor: 'pointer', background: c, border: on ? '2px solid #1B1A18' : '1px solid #d8d3cc', boxShadow: on ? '0 0 0 2px #fff inset' : 'none' }}
                  />
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: '#78716c', display: 'block', marginBottom: 5 }}>พื้นหลังพื้นที่ออกแบบ · Canvas</span>
              <select value={mood} onChange={(e) => setMood(e.target.value as Mood)} style={selectStyle}>
                {MOOD_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: '#78716c', display: 'block', marginBottom: 5 }}>เนื้อกระดาษป้าย · Stock</span>
              <select value={stock} onChange={(e) => setStock(e.target.value as Stock)} style={selectStyle}>
                {STOCK_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 12, fontSize: 10, color: '#9A938A' }}>บันทึกในเครื่องอัตโนมัติ (localStorage)</div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, color: '#9A938A', fontSize: 12.5 }}>
          การเชื่อมต่อข้อมูล (REST/SQL) และขอบเขต (ธุรกิจ/ร้าน) — ย้ายมาใน Phase 4
        </div>
      </div>
    </div>
  )
}
