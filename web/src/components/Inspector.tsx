import { useStore } from '@/store/useStore'
import { alignBox, type AlignDir } from '@/lib/snap'
import { num } from '@/lib/units'
import { FONT_OPTIONS, DEFAULT_FONT } from '@/lib/fonts'
import type { El } from '@/lib/types'

const COLORS = ['#1b1a18', '#807A72', '#7b1fa2', '#1F6FEB', '#1F8A5B', '#ffffff']
const BGS = ['#ffffff', '#FFF8E7', '#FFE8E2', '#E9F2FF', '#1b1a18']
const FORMATS = [
  ['CODE128', 'Code128'],
  ['EAN13', 'EAN-13'],
  ['CODE39', 'Code39'],
] as const
const BINDINGS: [string, string][] = [
  ['', '— ค่าคงที่ (ไม่ผูกข้อมูล) —'],
  ['name', 'ชื่อสินค้า (name)'],
  ['price', 'ราคา (price)'],
  ['barcode', 'บาร์โค้ด (barcode)'],
  ['sku', 'รหัส SKU (sku)'],
  ['unit', 'หน่วย (unit)'],
  ['shop.shopName', 'ร้าน: ชื่อร้าน'],
  ['shop.branchName', 'ร้าน: สาขา'],
  ['shop.shopAddress', 'ร้าน: ที่อยู่'],
]

const sectionStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--c-efedea)' }
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono'", marginBottom: 9 }
const fieldBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 8px' }
const numInput: React.CSSProperties = { flex: 1, width: '100%', border: 'none', background: 'transparent', fontFamily: "'IBM Plex Mono'", fontSize: 12.5, outline: 'none' }

function Swatches({ current, onPick, colors = COLORS }: { current: string; onPick: (c: string) => void; colors?: readonly string[] }) {
  return (
    <>
      {colors.map((c) => (
        <button key={c} onClick={() => onPick(c)} style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', background: c, border: current === c ? '2px solid #1B1A18' : '1px solid #d8d3cc', boxShadow: current === c ? '0 0 0 2px var(--surface) inset' : 'none' }} />
      ))}
    </>
  )
}

const TITLES: Record<El['type'], [string, string, string]> = {
  text: ['T', 'ข้อความ', 'TEXT'],
  price: ['฿', 'ราคา', 'PRICE'],
  barcode: ['|||', 'บาร์โค้ด', 'BARCODE'],
  qr: ['⊞', 'QR Code', 'QR'],
  image: ['▣', 'รูป/โลโก้', 'IMAGE'],
  frame: ['▢', 'กรอบ', 'FRAME'],
}

export function Inspector() {
  const s = useStore()
  const sel = s.elements.find((e) => e.id === s.selectedId) || null

  function pickImage(file?: File | null) {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      s.toast('ไฟล์ใหญ่เกิน 3MB')
      return
    }
    const rd = new FileReader()
    rd.onload = () => s.updateSel({ src: String(rd.result) })
    rd.onerror = () => s.toast('อ่านไฟล์รูปไม่สำเร็จ')
    rd.readAsDataURL(file)
  }

  // ---- no selection: label settings ----
  if (!sel) {
    return (
      <aside style={{ width: 288, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
        <div style={sectionStyle}>
          <div style={labelStyle}>การตั้งค่าป้าย · LABEL</div>
          <label style={{ display: 'block', marginBottom: 9 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>ชื่อแม่แบบ</span>
            <input className="ge-field" style={{ fontFamily: "'IBM Plex Sans Thai'" }} value={s.labelName} onChange={(e) => s.setLabelName(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>พื้นหลัง:</span>
            <Swatches current={s.bg} onPick={s.setBg} colors={BGS} />
          </div>
        </div>
        <div style={{ padding: '18px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            เลือกองค์ประกอบบนป้ายเพื่อแก้ไข
            <br />
            หรือเพิ่มจากแถบ <b style={{ color: 'var(--text-2)' }}>ELEMENTS</b> ด้านซ้าย
          </div>
        </div>
      </aside>
    )
  }

  const [icon, title, typeLabel] = TITLES[sel.type]
  const isTextual = sel.type === 'text' || sel.type === 'price'
  const canBind = sel.type === 'text' || sel.type === 'price' || sel.type === 'barcode' || sel.type === 'qr'
  const alignBtn = (dir: AlignDir, label: string) => (
    <button onClick={() => s.updateSel(alignBox(sel, dir, s.labelW, s.labelH))} title={label} style={{ flex: 1, height: 30, border: '1px solid var(--border-2)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-3)', fontSize: 11 }}>
      {label}
    </button>
  )
  const segBtn = (active: boolean, onClick: () => void, content: React.ReactNode, key?: string) => (
    <button key={key} onClick={onClick} style={{ minWidth: 34, height: 30, borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'var(--accent-soft)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--text-3)' }}>
      {content}
    </button>
  )

  return (
    <aside style={{ width: 288, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--c-efedea)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <div style={{ flex: 1, lineHeight: 1.15 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>{typeLabel}</div>
        </div>
        <button onClick={s.dupSel} title="ทำซ้ำ" style={{ width: 30, height: 30, border: '1px solid var(--border-2)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-3)' }}>
          ⧉
        </button>
        <button onClick={s.deleteSel} title="ลบ" style={{ width: 30, height: 30, border: '1px solid var(--border-2)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: '#C2410C' }}>
          🗑
        </button>
      </div>

      {/* transform */}
      <div style={sectionStyle}>
        <div style={labelStyle}>ตำแหน่ง & ขนาด · TRANSFORM</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['x', 'y', 'w', 'h'] as const).map((k) => (
            <div key={k} style={fieldBox}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'", width: 12, textTransform: 'uppercase' }}>{k}</span>
              <input type="number" step="0.5" value={sel[k]} onChange={(e) => s.updateSel({ [k]: num(e.target.value, sel[k] as number) } as Partial<El>)} style={numInput} />
            </div>
          ))}
        </div>
      </div>

      {/* align */}
      <div style={sectionStyle}>
        <div style={labelStyle}>จัดตำแหน่งบนป้าย · ALIGN</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {alignBtn('left', '⇤')}
          {alignBtn('hcenter', '⇆')}
          {alignBtn('right', '⇥')}
          <div style={{ width: 1, background: 'var(--c-efedea)', margin: '2px 1px' }} />
          {alignBtn('top', '⤒')}
          {alignBtn('vmiddle', '⇕')}
          {alignBtn('bottom', '⤓')}
        </div>
      </div>

      {/* content: text/price */}
      {isTextual && (
        <div style={sectionStyle}>
          <div style={labelStyle}>เนื้อหา · CONTENT</div>
          <input className="ge-field" style={{ fontFamily: "'IBM Plex Sans Thai'", marginBottom: 9 }} value={sel.text ?? ''} onChange={(e) => s.updateSel({ text: e.target.value })} placeholder="พิมพ์ข้อความ..." />
          <label style={{ display: 'block', marginBottom: 9 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'", display: 'block', marginBottom: 4 }}>ฟอนต์ · FONT</span>
            <select className="ge-field" value={sel.fontFamily || DEFAULT_FONT} onChange={(e) => s.updateSel({ fontFamily: e.target.value })} style={{ fontFamily: sel.fontFamily || DEFAULT_FONT }}>
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
            <div style={{ ...fieldBox, flex: 1 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>size</span>
              <input type="number" step="0.5" value={sel.fontSize ?? 3} onChange={(e) => s.updateSel({ fontSize: num(e.target.value, sel.fontSize ?? 3) })} style={numInput} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>mm</span>
            </div>
            {segBtn((sel.weight ?? 600) >= 700, () => s.updateSel({ weight: (sel.weight ?? 600) >= 700 ? 500 : 700 }), <b>B</b>)}
            {segBtn(!!sel.italic, () => s.updateSel({ italic: !sel.italic }), <i>I</i>)}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['left', 'center', 'right'] as const).map((a) => segBtn(sel.align === a, () => s.updateSel({ align: a }), a === 'left' ? '⇤' : a === 'center' ? '≡' : '⇥', a))}
            <div style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>สี:</span>
            <Swatches current={sel.color || '#1b1a18'} onPick={(c) => s.updateSel({ color: c })} />
          </div>
        </div>
      )}

      {/* barcode */}
      {sel.type === 'barcode' && (
        <div style={sectionStyle}>
          <div style={labelStyle}>บาร์โค้ด · BARCODE</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
            {FORMATS.map(([v, l]) => segBtn(sel.format === v, () => s.updateSel({ format: v }), l, v))}
          </div>
          <input className="ge-field" style={{ marginBottom: 9 }} value={sel.value ?? ''} onChange={(e) => s.updateSel({ value: e.target.value })} placeholder="ค่าบาร์โค้ด" />
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)' }}>
            <span>แสดงตัวเลขใต้บาร์โค้ด</span>
            <input type="checkbox" checked={!!sel.showText} onChange={(e) => s.updateSel({ showText: e.target.checked })} />
          </label>
        </div>
      )}

      {/* qr */}
      {sel.type === 'qr' && (
        <div style={sectionStyle}>
          <div style={labelStyle}>QR CODE</div>
          <input className="ge-field" value={sel.value ?? ''} onChange={(e) => s.updateSel({ value: e.target.value })} placeholder="URL หรือข้อความ" />
        </div>
      )}

      {/* frame */}
      {sel.type === 'frame' && (
        <div style={sectionStyle}>
          <div style={labelStyle}>กรอบ · FRAME</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ ...fieldBox, flex: 1 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>เส้น</span>
              <input type="number" step="0.1" value={sel.border ?? 0.5} onChange={(e) => s.updateSel({ border: num(e.target.value, sel.border ?? 0.5) })} style={numInput} />
            </div>
            <div style={{ ...fieldBox, flex: 1 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>มน</span>
              <input type="number" step="0.5" value={sel.radius ?? 0} onChange={(e) => s.updateSel({ radius: num(e.target.value, sel.radius ?? 0) })} style={numInput} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>สีเส้น:</span>
            <Swatches current={sel.color || '#1b1a18'} onPick={(c) => s.updateSel({ color: c })} />
          </div>
        </div>
      )}

      {/* image */}
      {sel.type === 'image' && (
        <div style={sectionStyle}>
          <div style={labelStyle}>รูป/โลโก้ · IMAGE</div>
          {sel.src ? (
            <>
              <div style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 9, padding: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 96 }}>
                <img src={sel.src} style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }} alt="" />
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)' }}>
                  เปลี่ยนรูป
                  <input type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0])} style={{ display: 'none' }} />
                </label>
                <button onClick={() => s.updateSel({ src: '' })} title="ลบรูป" style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-3)' }}>
                  🗑
                </button>
              </div>
            </>
          ) : (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, border: '1.5px dashed #cfcbc4', borderRadius: 10, background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>คลิกเพื่อเลือกรูป / โลโก้</span>
                <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'" }}>PNG · JPG · SVG · ≤ 3MB</span>
                <input type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0])} style={{ display: 'none' }} />
              </label>
              <input className="ge-field" style={{ fontFamily: "'IBM Plex Sans Thai'", marginTop: 9 }} value={sel.label ?? ''} onChange={(e) => s.updateSel({ label: e.target.value })} placeholder="ข้อความแทนเมื่อยังไม่มีรูป" />
            </>
          )}
        </div>
      )}

      {/* data binding */}
      {canBind && (
        <div style={{ padding: '14px 16px' }}>
          <div style={labelStyle}>เชื่อมข้อมูล · DATA BINDING</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 9 }}>ผูกกับฟิลด์ SKU เพื่อพิมพ์หลายดวงอัตโนมัติ</div>
          <select className="ge-field" value={sel.binding ?? ''} onChange={(e) => s.updateSel({ binding: e.target.value })}>
            {BINDINGS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {sel.binding && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#1F8A5B', background: '#F0F7F2', border: '1px solid #cde9d8', borderRadius: 7, padding: '6px 9px' }}>
              ✓ ผูกกับ <b style={{ fontFamily: "'IBM Plex Mono'" }}>{sel.binding}</b> · เปลี่ยนตาม SKU
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
