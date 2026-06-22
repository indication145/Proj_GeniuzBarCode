import { useStore, pick } from '@/store/useStore'
import { tplPriceTag, tplSticker, tplQr } from '@/lib/elements'
import type { El } from '@/lib/types'

const ELEMENTS: [El['type'], string][] = [
  ['text', 'ข้อความ'],
  ['price', 'ราคา'],
  ['barcode', 'บาร์โค้ด'],
  ['qr', 'QR Code'],
  ['image', 'รูป/โลโก้'],
  ['frame', 'กรอบ'],
]

const PRESETS: { name: string; sub: string; w: number; h: number; fn: (w: number, h: number) => El[] }[] = [
  { name: 'ป้ายราคา', sub: 'Price Tag · 50×30', w: 50, h: 30, fn: tplPriceTag },
  { name: 'สติกเกอร์สินค้า', sub: 'Product · 100×50', w: 100, h: 50, fn: tplSticker },
  { name: 'ป้าย QR', sub: 'QR Label · 40×30', w: 40, h: 30, fn: tplQr },
]

const SIZES: [string, string, number, number][] = [
  ['50 × 30', 'ป้ายราคา', 50, 30],
  ['40 × 30', 'เล็ก', 40, 30],
  ['100 × 50', 'สติกเกอร์', 100, 50],
  ['A4', '210 × 297', 210, 297],
  ['80 × 40', 'กลาง', 80, 40],
  ['30 × 20', 'จิ๋ว', 30, 20],
]

const head: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'IBM Plex Mono'", marginBottom: 10 }
const divider: React.CSSProperties = { height: 1, background: 'var(--c-efedea)', margin: '8px 16px' }

export function DesignSidebar() {
  const s = useStore()
  return (
    <aside style={{ width: 252, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* elements */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={head}>ELEMENTS · เพิ่มองค์ประกอบ</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {ELEMENTS.map(([type, label]) => (
            <button key={type} onClick={() => s.addElement(type)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px', border: '1px solid var(--border-2)', borderRadius: 10, background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-2)', fontFamily: "'IBM Plex Sans Thai'" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{type === 'text' ? 'T' : type === 'price' ? '฿' : type === 'barcode' ? '|||' : type === 'qr' ? '⊞' : type === 'image' ? '▣' : '▢'}</span>
              <span style={{ fontSize: 10.5, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={divider} />

      {/* templates */}
      <div style={{ padding: '8px 16px' }}>
        <div style={head}>TEMPLATES · แม่แบบสำเร็จรูป</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => s.applyPreset(p.fn(p.w, p.h), p.w, p.h)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 9, border: '1px solid var(--border-2)', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: "'IBM Plex Sans Thai'" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>▣</div>
              <div style={{ lineHeight: 1.25, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>{p.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={divider} />

      {/* saved */}
      <div style={{ padding: '8px 16px' }}>
        <div style={head}>SAVED · แม่แบบที่บันทึก</div>
        <label style={{ display: 'block', marginBottom: 5, fontSize: 11, color: 'var(--text-3)' }}>ชื่อแม่แบบ</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input className="ge-field" style={{ fontFamily: "'IBM Plex Sans Thai'", fontWeight: 500 }} value={s.labelName} onChange={(e) => s.setLabelName(e.target.value)} placeholder="ตั้งชื่อแม่แบบ…" />
          <button onClick={s.saveTemplate} style={{ flexShrink: 0, height: 'auto', padding: '0 12px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 12, fontWeight: 500 }}>
            บันทึก
          </button>
        </div>
        {s.savedTemplates.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 6 }}>ยังไม่มีแม่แบบที่บันทึก — กด "บันทึก"</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s.savedTemplates.map((t, i) => {
              const id = String(t.id)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', border: '1px solid var(--border-2)', borderRadius: 10, background: 'var(--surface)' }}>
                  <button onClick={() => void s.openTemplate(id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Sans Thai'" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick(t, 'name') || '(ไม่มีชื่อ)'}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>
                      {pick(t, 'labelW')}×{pick(t, 'labelH')} มม. · {pick(t, 'count')} ชิ้น
                    </div>
                  </button>
                  <button onClick={() => void s.removeTemplate(id)} title="ลบแม่แบบ" style={{ width: 26, height: 26, flexShrink: 0, border: '1px solid var(--border-2)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    🗑
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={divider} />

      {/* label size */}
      <div style={{ padding: '8px 16px 20px' }}>
        <div style={head}>LABEL SIZE · ขนาดป้าย</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {SIZES.map(([label, sub, w, h]) => {
            const on = s.labelW === w && s.labelH === h
            return (
              <button key={label} onClick={() => s.setLabelSize(w, h)} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-2)'), background: on ? 'var(--accent-soft)' : 'var(--surface)', color: on ? 'var(--accent)' : 'var(--text-2)', fontFamily: "'IBM Plex Sans Thai'" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", opacity: 0.65 }}>{sub}</div>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>กว้าง W (มม.)</span>
            <input className="ge-field" type="number" value={s.labelW} onChange={(e) => s.setLabelSize(Number(e.target.value) || s.labelW, s.labelH)} />
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>สูง H (มม.)</span>
            <input className="ge-field" type="number" value={s.labelH} onChange={(e) => s.setLabelSize(s.labelW, Number(e.target.value) || s.labelH)} />
          </label>
        </div>
      </div>
    </aside>
  )
}
