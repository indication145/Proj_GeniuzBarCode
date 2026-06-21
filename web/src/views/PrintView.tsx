import { useStore } from '@/store/useStore'
import { fmtPrice } from '@/lib/units'
import { openPrint } from '@/lib/printDoc'
import { LabelPreview } from '@/components/LabelPreview'
import { PoModal } from '@/components/PoModal'
import { ScanResultsModal } from '@/components/ScanResultsModal'
import type { Sku } from '@/lib/types'

const FG_OPTS = [
  ['1', 'รหัสสินค้า'],
  ['2', 'บาร์โค้ด'],
  ['3', 'ชื่อสินค้า'],
  ['4', 'ราคา'],
  ['5', 'หน่วย'],
  ['6', 'หมวด'],
  ['11', 'แบรนด์'],
] as const

const th: React.CSSProperties = { padding: '7px 9px', borderRight: '1px solid #E0DCD6', borderBottom: '1px solid #E6E3DF', textAlign: 'left', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '6px 9px', borderRight: '1px solid #EFEDEA', borderBottom: '1px solid #F1EFEC', fontSize: 12, whiteSpace: 'nowrap' }

export function PrintView() {
  const s = useStore()
  const { skuRows, shop, printMedia, labelW, labelH, bg, elements, rollCols, rollRows } = s
  const ctx = { skuRows, shop }

  // ----- preview layout (mirrors the dc app) -----
  const selected = s.selectedIndices()
  let pcols: number
  let prows: number
  if (printMedia === 'a4') {
    const M = 8
    const G = 2
    pcols = Math.max(1, Math.floor((210 - 2 * M + G) / (labelW + G)))
    prows = Math.max(1, Math.floor((297 - 2 * M + G) / (labelH + G)))
  } else {
    pcols = Math.max(1, rollCols)
    prows = Math.max(1, rollRows)
  }
  const perPage = Math.max(1, pcols * prows)
  const allItems: number[] = []
  selected.forEach((i) => {
    const n = s.copiesFor(i)
    for (let c = 0; c < n; c++) allItems.push(i)
  })
  const printCount = allItems.length
  const totalPages = Math.max(1, Math.ceil((printCount || 1) / perPage))
  const pageItems = allItems.slice(0, perPage)

  const isA4 = printMedia === 'a4'
  const ps = isA4 ? 432 / 210 : Math.max(3.0, Math.min(9, 440 / (pcols * labelW + 2 * (pcols + 1))))
  const gapPx = 2 * ps
  const sheetStyle: React.CSSProperties = isA4
    ? { boxSizing: 'border-box', width: 210 * ps, height: 297 * ps, padding: 8 * ps, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: gapPx, background: '#fff', borderRadius: 2, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }
    : { display: 'flex', flexWrap: 'wrap', gap: gapPx, alignContent: 'flex-start', width: pcols * labelW * ps + (pcols - 1) * gapPx + 2 * gapPx, padding: gapPx, background: '#fff', borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }

  async function doPrint() {
    const sel = s.selectedIndices()
    if (!sel.length) {
      s.toast('ยังไม่ได้เลือก SKU สำหรับพิมพ์')
      return
    }
    const items: number[] = []
    sel.forEach((i) => {
      const n = s.copiesFor(i)
      for (let c = 0; c < n; c++) items.push(i)
    })
    if (!items.length) {
      s.toast('จำนวนพิมพ์เป็น 0 — ตรวจ qty หรือปิดโหมดพิมพ์ตาม PO')
      return
    }
    const ok = await openPrint(s.doc(), items, ctx)
    s.toast(ok ? 'เตรียม ' + items.length + ' ดวง — เลือกเครื่องพิมพ์ หรือ Save as PDF' : 'เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — โปรดอนุญาต popup')
  }

  const stepBtn: React.CSSProperties = { width: 22, height: 22, border: '1px solid #E6E3DF', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#44403B', lineHeight: 1 }
  const rollBtn: React.CSSProperties = { width: 24, height: 24, border: '1px solid #E6E3DF', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#44403B' }
  const mediaBtn = (on: boolean): React.CSSProperties => ({ flex: 1, height: 32, border: '1px solid ' + (on ? 'var(--accent)' : '#E6E3DF'), borderRadius: 8, background: on ? 'var(--accent-soft)' : '#fff', color: on ? 'var(--accent)' : '#78716c', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 12, fontWeight: 600 })

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
      {/* left: grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* media row */}
        <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #E6E3DF', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>พิมพ์ป้ายราคา</div>
            <div style={{ fontSize: 11, color: '#9A938A' }}>ใส่รหัสสินค้าเพื่อพิมพ์บาร์โค้ด</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6, width: 230, flexShrink: 0 }}>
            <button style={mediaBtn(isA4)} onClick={() => s.setPrintMedia('a4')}>
              A4 หลายดวง
            </button>
            <button style={mediaBtn(!isA4)} onClick={() => s.setPrintMedia('roll')}>
              ม้วนสติกเกอร์
            </button>
          </div>
          {!isA4 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, background: '#FBFAF9', border: '1px solid #E6E3DF', borderRadius: 8, padding: '3px 6px' }}>
              <span style={{ fontSize: 10, color: '#9A938A', fontFamily: "'IBM Plex Mono'" }}>คอลัมน์</span>
              <button style={rollBtn} onClick={() => s.bumpRoll('cols', -1)}>
                −
              </button>
              <span style={{ width: 18, textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontWeight: 600 }}>{rollCols}</span>
              <button style={rollBtn} onClick={() => s.bumpRoll('cols', 1)}>
                +
              </button>
              <span style={{ fontSize: 10, color: '#9A938A', fontFamily: "'IBM Plex Mono'", marginLeft: 4 }}>แถว</span>
              <button style={rollBtn} onClick={() => s.bumpRoll('rows', -1)}>
                −
              </button>
              <span style={{ width: 18, textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontWeight: 600 }}>{rollRows}</span>
              <button style={rollBtn} onClick={() => s.bumpRoll('rows', 1)}>
                +
              </button>
            </div>
          )}
        </div>

        {/* scan bar */}
        <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #EFEDEA', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <select className="ge-field" style={{ width: 'auto', flexShrink: 0, height: 38 }} value={s.skuFg} onChange={(e) => s.setSkuFg(e.target.value)}>
            {FG_OPTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input className="ge-field" style={{ flex: 1, minWidth: 0, height: 38, fontFamily: "'IBM Plex Mono'" }} value={s.scanCode} onChange={(e) => s.setScanCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void s.addByCode()} placeholder="สแกน หรือพิมพ์คำค้น แล้วกด Enter…" />
          <button onClick={() => void s.addByCode()} style={{ height: 38, padding: '0 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 600, flexShrink: 0 }}>
            + เพิ่ม
          </button>
          <button onClick={s.clearGrid} style={{ height: 38, padding: '0 14px', border: '1px solid #E6E3DF', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", color: '#44403B', flexShrink: 0 }}>
            ล้างรายการ
          </button>
          <button
            onClick={() => void doPrint()}
            disabled={printCount === 0}
            title={printCount === 0 ? 'ยังไม่มีรายการที่จะพิมพ์' : undefined}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              fontFamily: "'IBM Plex Sans Thai'",
              fontWeight: 600,
              flexShrink: 0,
              ...(printCount === 0
                ? { background: '#EDEBE8', color: '#B4ADA4', cursor: 'not-allowed' }
                : { background: 'var(--accent)', color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px var(--accent-shadow)' }),
            }}
          >
            พิมพ์เลย
          </button>
          <span style={{ fontSize: 10.5, background: '#F0F7F2', color: '#1F8A5B', border: '1px solid #cde9d8', padding: '5px 10px', borderRadius: 20, fontFamily: "'IBM Plex Mono'", flexShrink: 0 }}>{skuRows.length} รายการ</span>
        </div>

        {/* grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', minHeight: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #E6E3DF', borderRadius: 8, tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: '#EFEDEA', fontSize: 10.5, fontWeight: 600, color: '#57534e', fontFamily: "'IBM Plex Mono'" }}>
                <th style={{ ...th, textAlign: 'center' }}>#</th>
                <th style={th}>SkuCode</th>
                <th style={th}>PluCode</th>
                <th style={th}>CatCode</th>
                <th style={th}>CatName</th>
                <th style={th}>SkuDesc</th>
                <th style={th}>SupplierID</th>
                <th style={th}>SupplierName</th>
                <th style={{ ...th, textAlign: 'right' }}>Price</th>
                <th style={{ ...th, textAlign: 'center' }}>Qty</th>
                <th style={{ ...th, borderRight: 'none' }}></th>
              </tr>
            </thead>
            <tbody>
              {skuRows.map((r: Sku, i) => {
                const active = s.activeSku === i
                return (
                  <tr key={i} style={{ background: active ? 'var(--accent-soft)' : '#fff' }}>
                    <td style={{ ...td, textAlign: 'center', cursor: 'pointer', fontFamily: "'IBM Plex Mono'", color: active ? 'var(--accent)' : '#9A938A' }} onClick={() => useStore.setState({ activeSku: i })}>
                      {i + 1}
                    </td>
                    <td style={{ ...td, fontFamily: "'IBM Plex Mono'" }}>{r.sku}</td>
                    <td style={{ ...td, fontFamily: "'IBM Plex Mono'" }}>{r.pluCode}</td>
                    <td style={td}>{r.catCode}</td>
                    <td style={td}>{r.catName}</td>
                    <td style={td}>{r.name}</td>
                    <td style={td}>{r.supplierId}</td>
                    <td style={td}>{r.supplierName}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: "'IBM Plex Mono'" }}>{fmtPrice(r.price)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <button style={stepBtn} onClick={() => s.setCopies(i, s.copiesFor(i) - 1)}>
                          −
                        </button>
                        <input value={s.copiesFor(i)} onChange={(e) => s.setCopies(i, Number(e.target.value) || 0)} style={{ width: 34, textAlign: 'center', border: '1px solid #E6E3DF', borderRadius: 5, padding: '3px 0', fontFamily: "'IBM Plex Mono'" }} />
                        <button style={stepBtn} onClick={() => s.setCopies(i, s.copiesFor(i) + 1)}>
                          +
                        </button>
                      </span>
                    </td>
                    <td style={{ ...td, borderRight: 'none', textAlign: 'center' }}>
                      <button onClick={() => s.removeRow(i)} title="ลบแถว" style={{ width: 26, height: 26, border: '1px solid #EBE8E3', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#C2410C' }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {skuRows.length === 0 && <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9A938A', fontSize: 13, lineHeight: 1.6 }}>ยังไม่มีรายการสินค้า<br />สแกน/พิมพ์รหัสด้านบน หรือกด "ใบสั่งซื้อ" เพื่อดึงทั้งใบ</div>}
        </div>

        {/* footer */}
        <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #E6E3DF', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={s.openPo} style={{ height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid #E6E3DF', background: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 600, color: '#44403B' }}>
            ใบสั่งซื้อ
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={s.useQty} onChange={(e) => s.setUseQty(e.target.checked)} />
            <span style={{ fontSize: 12, color: '#44403B' }}>พิมพ์ตามจำนวนใน PO (qty)</span>
          </label>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, color: '#9A938A' }}>รวมที่จะพิมพ์</div>
            <div>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{printCount}</span> <span style={{ fontSize: 12, color: '#9A938A' }}>ดวง · {isA4 ? `A4 · ${pcols}×${prows}/แผ่น` : `ม้วน ${pcols}×${prows}/หน้า`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* right: preview */}
      <div style={{ width: 480, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E6E3DF', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flexShrink: 0, padding: '13px 16px', borderBottom: '1px solid #E6E3DF', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#44403B' }}>ตัวอย่าง</span>
          <span style={{ fontSize: 10.5, color: 'var(--accent)', fontFamily: "'IBM Plex Mono'", background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-border)', padding: '2px 8px', borderRadius: 20 }}>หน้า 1 / {totalPages}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => useStore.setState({ view: 'design' })} style={{ height: 30, padding: '0 11px', border: '1px solid #E6E3DF', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 11.5, color: '#44403B' }}>
            แก้ไขแม่แบบ
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 0 }}>
          {printCount > 0 ? (
            <div style={sheetStyle}>
              {pageItems.map((idx, k) => (
                <LabelPreview key={k} elements={elements} labelW={labelW} labelH={labelH} bg={bg} ctx={ctx} idx={idx} ps={ps} />
              ))}
            </div>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#9A938A', fontSize: 12.5, lineHeight: 1.5 }}>ยังไม่มีรายการที่จะพิมพ์<br />เพิ่มสินค้าทางซ้ายก่อน</div>
          )}
        </div>
      </div>

      <PoModal />
      <ScanResultsModal />
    </div>
  )
}
