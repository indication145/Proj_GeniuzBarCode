import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { fmtPrice } from '@/lib/units'
import { openPrint, openPrintFrame } from '@/lib/printDoc'
import { LabelPreview } from '@/components/LabelPreview'
import { PoModal } from '@/components/PoModal'
import { ScanResultsModal } from '@/components/ScanResultsModal'
import { useBreakpoint } from '@/lib/useMediaQuery'
import { parseSkuFile, downloadTemplate } from '@/lib/sheet'
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

const th: React.CSSProperties = { padding: '7px 9px', borderRight: '1px solid var(--th-border)', borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis' }
const td: React.CSSProperties = { padding: '6px 9px', borderRight: '1px solid var(--c-efedea)', borderBottom: '1px solid var(--td-border)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

// default column widths (px) — order matches the <th> cells below
const COL_W = [62, 110, 120, 78, 150, 196, 90, 160, 92, 116, 48]
const COL_KEY = 'ge.print.colw2'

export function PrintView() {
  const s = useStore()
  const { skuRows, shop, printMedia, labelW, labelH, bg, elements, rollCols, rollRows } = s
  const ctx = { skuRows, shop }
  const { isTablet, isMobile } = useBreakpoint()
  const narrow = isTablet
  const [tab, setTab] = useState<'list' | 'preview'>('list')
  const [bulkQty, setBulkQty] = useState('1')

  // --- typeahead search (scan bar) ---
  const [sugActive, setSugActive] = useState(-1)
  const [scanFocus, setScanFocus] = useState(false)
  // debounce: fetch suggestions ~220ms after the user stops typing
  useEffect(() => {
    const code = s.scanCode.trim()
    if (code.length < 2) {
      s.closeSuggest()
      return
    }
    const t = setTimeout(() => void s.fetchSuggest(), 220)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.scanCode])
  // reset highlight whenever the result set changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setSugActive(-1), [s.suggest])
  const pickSuggest = (p: Sku) => {
    s.appendSku(p)
    s.toast('เพิ่ม ' + (p.sku || p.name))
    s.setScanCode('')
    s.closeSuggest()
    setSugActive(-1)
  }
  const onScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (s.suggestOpen && s.suggest.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSugActive((i) => Math.min(i + 1, s.suggest.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSugActive((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Escape') {
        s.closeSuggest()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (sugActive >= 0) pickSuggest(s.suggest[sugActive])
        else void s.addByCode()
        return
      }
    } else if (e.key === 'Enter') {
      void s.addByCode()
    }
  }

  // row selection (checkbox) — also drives which rows print
  const selCount = skuRows.reduce((a, _r, i) => a + (s.skuSel[i] !== false ? 1 : 0), 0)
  const allSel = skuRows.length > 0 && selCount === skuRows.length
  const someSel = selCount > 0 && selCount < skuRows.length
  const applyBulkQty = () => s.setCopiesForSelected(Number(bulkQty) || 0)

  // resizable grid columns (desktop table only) — persisted in localStorage
  const [colW, setColW] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(COL_KEY)
      if (raw) {
        const a = JSON.parse(raw)
        if (Array.isArray(a) && a.length === COL_W.length) return a
      }
    } catch {
      /* ignore */
    }
    return COL_W
  })
  const resizing = useRef<{ i: number; startX: number; startW: number } | null>(null)
  useEffect(() => {
    try {
      localStorage.setItem(COL_KEY, JSON.stringify(colW))
    } catch {
      /* ignore */
    }
  }, [colW])
  function colDown(i: number, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    resizing.current = { i, startX: e.clientX, startW: colW[i] }
  }
  function colMove(e: React.PointerEvent) {
    const r = resizing.current
    if (!r) return
    const w = Math.max(40, r.startW + (e.clientX - r.startX))
    setColW((prev) => {
      const n = [...prev]
      n[r.i] = w
      return n
    })
  }
  function colUp(e: React.PointerEvent) {
    if (!resizing.current) return
    resizing.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }
  const grip = (i: number) => <span onPointerDown={(e) => colDown(i, e)} onPointerMove={colMove} onPointerUp={colUp} title="ลากเพื่อปรับความกว้าง" style={{ position: 'absolute', top: 0, right: -1, width: 9, height: '100%', cursor: 'col-resize', touchAction: 'none', zIndex: 2 }} />
  const totalW = colW.reduce((a, b) => a + b, 0)

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
    ? { boxSizing: 'border-box', width: 210 * ps, height: 297 * ps, padding: 8 * ps, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: gapPx, background: 'var(--surface)', borderRadius: 2, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }
    : { display: 'flex', flexWrap: 'wrap', gap: gapPx, alignContent: 'flex-start', width: pcols * labelW * ps + (pcols - 1) * gapPx + 2 * gapPx, padding: gapPx, background: 'var(--surface)', borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }

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
    // Mobile: popups are routinely blocked → print via hidden iframe (native
    // sheet still offers "Save as PDF"). Desktop: popup, fall back to iframe.
    const ok = isMobile ? await openPrintFrame(s.doc(), items, ctx) : (await openPrint(s.doc(), items, ctx)) || (await openPrintFrame(s.doc(), items, ctx))
    s.toast(ok ? 'เตรียม ' + items.length + ' ดวง — เลือกเครื่องพิมพ์ หรือ Save as PDF' : 'พิมพ์ไม่สำเร็จ — ลองอีกครั้ง')
  }

  async function onImportFile(file?: File | null) {
    if (!file) return
    try {
      const rows = await parseSkuFile(file)
      if (!rows.length) {
        s.toast('ไม่พบข้อมูลในไฟล์ — ตรวจหัวคอลัมน์ หรือใช้ปุ่ม "เทมเพลต Excel"')
        return
      }
      s.importSkus(rows)
    } catch (e) {
      s.toast('อ่านไฟล์ไม่สำเร็จ: ' + ((e as Error)?.message || e))
    }
  }

  const stepBtn: React.CSSProperties = { width: 22, height: 22, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-2)', lineHeight: 1 }
  const footBtn: React.CSSProperties = { height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 600, color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }
  // Excel offline import gets an Excel-green accent so it reads as "load data from a file"
  const excelBtn: React.CSSProperties = { height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid #bfe3cd', background: '#EEF7F1', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 700, color: '#15795A', display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }
  const icoUp = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
  const icoDown = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
  const icoPrint = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
  const rollBtn: React.CSSProperties = { width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-2)' }
  const mediaBtn = (on: boolean): React.CSSProperties => ({ flex: 1, height: 32, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), borderRadius: 8, background: on ? 'var(--accent-soft)' : 'var(--surface)', color: on ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 12, fontWeight: 600 })

  const showList = !narrow || tab === 'list'
  const showPreview = !narrow || tab === 'preview'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: narrow ? 'column' : 'row', minWidth: 0, minHeight: 0 }}>
      {/* narrow: tab switcher between list / preview */}
      {narrow && (
        <div style={{ flexShrink: 0, display: 'flex', gap: 6, padding: '8px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          {(['list', 'preview'] as const).map((t) => {
            const on = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent-soft)' : 'var(--surface)', color: on ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 12.5, fontWeight: 600 }}>
                {t === 'list' ? `รายการ (${skuRows.length})` : `ตัวอย่าง · ${printCount} ดวง`}
              </button>
            )
          })}
        </div>
      )}

      {/* left: grid */}
      <div style={{ flex: 1, display: showList ? 'flex' : 'none', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {/* media row */}
        <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: narrow ? '10px 12px' : '12px 16px', display: 'flex', flexWrap: narrow ? 'wrap' : 'nowrap', alignItems: 'center', gap: 12 }}>
          {!isMobile && (
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>พิมพ์ป้ายราคา</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ใส่รหัสสินค้าเพื่อพิมพ์บาร์โค้ด</div>
            </div>
          )}
          {!isMobile && <div style={{ flex: 1 }} />}
          <div style={{ display: 'flex', gap: 6, width: isMobile ? '100%' : 230, flexShrink: 0 }}>
            <button style={mediaBtn(isA4)} onClick={() => s.setPrintMedia('a4')}>
              A4 หลายดวง
            </button>
            <button style={mediaBtn(!isA4)} onClick={() => s.setPrintMedia('roll')}>
              ม้วนสติกเกอร์
            </button>
          </div>
          {!isA4 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'" }}>คอลัมน์</span>
              <button style={rollBtn} onClick={() => s.bumpRoll('cols', -1)}>
                −
              </button>
              <span style={{ width: 18, textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontWeight: 600 }}>{rollCols}</span>
              <button style={rollBtn} onClick={() => s.bumpRoll('cols', 1)}>
                +
              </button>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'", marginLeft: 4 }}>แถว</span>
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
        <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--c-efedea)', padding: narrow ? '10px 12px' : '10px 16px', display: 'flex', flexWrap: narrow ? 'wrap' : 'nowrap', alignItems: 'center', gap: 8 }}>
          <select className="ge-field" style={{ width: 'auto', flexShrink: 0, height: 38 }} value={s.skuFg} onChange={(e) => s.setSkuFg(e.target.value)}>
            {FG_OPTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            {/* pill search field — magnifier + input + gradient add button, glows on focus */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 40,
                padding: '0 5px 0 13px',
                borderRadius: 999,
                background: 'var(--surface)',
                border: '1px solid ' + (scanFocus ? 'transparent' : 'var(--border)'),
                boxShadow: scanFocus ? '0 0 0 3px var(--accent-soft), 0 10px 28px var(--accent-shadow)' : 'none',
                transition: 'box-shadow .2s ease, border-color .2s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={scanFocus ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={scanFocus ? 2.5 : 2} strokeLinecap="round" style={{ flexShrink: 0, transition: 'stroke .2s ease' }}>
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
              </svg>
              <input
                style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: "'IBM Plex Mono'", fontSize: 12.5, color: 'var(--text)' }}
                value={s.scanCode}
                onChange={(e) => s.setScanCode(e.target.value)}
                onKeyDown={onScanKey}
                onFocus={() => { setScanFocus(true); if (s.suggest.length) useStore.setState({ suggestOpen: true }) }}
                onBlur={() => { setScanFocus(false); setTimeout(() => s.closeSuggest(), 150) }}
                placeholder="สแกน หรือพิมพ์เพื่อค้นหา…"
                role="combobox"
                aria-expanded={s.suggestOpen}
                autoComplete="off"
              />
              {s.scanCode.trim() && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void s.addByCode()}
                  style={{ height: 30, padding: '0 17px', borderRadius: 999, border: 'none', background: 'linear-gradient(45deg, var(--accent) 0%, #ec4899 100%)', color: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', boxShadow: '0 4px 14px var(--accent-shadow)', flexShrink: 0, fontFamily: "'IBM Plex Sans Thai'" }}
                >
                  เพิ่ม
                </button>
              )}
            </div>
            {s.suggestOpen && (s.suggestBusy || s.suggest.length > 0) && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
                {s.suggestBusy && s.suggest.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>กำลังค้นหา…</div>
                )}
                {s.suggest.map((p, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggest(p)}
                    onMouseEnter={() => setSugActive(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderBottom: i < s.suggest.length - 1 ? '1px solid var(--c-efedea)' : 'none', background: i === sugActive ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || p.sku}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono'", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[p.sku, p.barcode, p.unit].filter(Boolean).join(' · ')}</div>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'IBM Plex Mono'", color: 'var(--accent)', flexShrink: 0 }}>{fmtPrice(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={s.clearGrid} style={{ height: 38, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", color: 'var(--text-2)', flexShrink: 0 }}>
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              ...(printCount === 0
                ? { background: 'var(--surface-3)', color: '#B4ADA4', cursor: 'not-allowed' }
                : { background: 'var(--accent)', color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px var(--accent-shadow)' }),
            }}
          >
            {icoPrint} พิมพ์เลย
          </button>
          <span style={{ fontSize: 10.5, background: '#F0F7F2', color: '#1F8A5B', border: '1px solid #cde9d8', padding: '5px 10px', borderRadius: 20, fontFamily: "'IBM Plex Mono'", flexShrink: 0 }}>{skuRows.length} รายการ</span>
        </div>

        {/* bulk select + set-qty bar */}
        {skuRows.length > 0 && (
          <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: narrow ? '8px 12px' : '8px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--c-efedea)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, flexShrink: 0 }}>
              <input type="checkbox" checked={allSel} ref={(el) => { if (el) el.indeterminate = someSel }} onChange={(e) => s.setAllSel(e.target.checked)} />
              เลือกทั้งหมด
            </label>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono'", flexShrink: 0 }}>เลือก {selCount}/{skuRows.length}</span>
            <div style={{ flex: 1, minWidth: 8 }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>ตั้งจำนวนที่เลือก</span>
            <input type="number" min={0} value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyBulkQty()} style={{ width: 64, height: 32, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 7, fontFamily: "'IBM Plex Mono'", flexShrink: 0 }} />
            <button onClick={applyBulkQty} disabled={selCount === 0} title="ตั้งจำนวนของทุกแถวที่เลือกให้เท่ากัน" style={{ height: 32, padding: '0 16px', borderRadius: 7, border: 'none', cursor: selCount === 0 ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 600, flexShrink: 0, ...(selCount === 0 ? { background: 'var(--surface-3)', color: '#B4ADA4' } : { background: 'var(--accent)', color: '#fff' }) }}>
              ใช้
            </button>
          </div>
        )}

        {/* grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: narrow ? '12px' : '14px 16px', minHeight: 0 }}>
          {narrow ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {skuRows.map((r: Sku, i) => {
                const active = s.activeSku === i
                return (
                  <div key={i} onClick={() => useStore.setState({ activeSku: i })} style={{ background: active ? 'var(--accent-soft)' : 'var(--surface)', border: '1px solid ' + (active ? 'var(--accent-soft-border)' : 'var(--border)'), borderRadius: 10, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <input type="checkbox" checked={s.skuSel[i] !== false} onChange={() => s.toggleSel(i)} onClick={(e) => e.stopPropagation()} style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono'" }}>
                        {r.sku}
                        {r.pluCode ? ` · ${r.pluCode}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {[r.catName, r.supplierName].filter(Boolean).join(' · ')}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginTop: 5 }}>{fmtPrice(r.price)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); s.removeRow(i) }} title="ลบ" style={{ width: 30, height: 30, border: '1px solid var(--border-2)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: '#C2410C' }}>
                        ✕
                      </button>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button style={{ ...stepBtn, width: 30, height: 30 }} onClick={() => s.setCopies(i, s.copiesFor(i) - 1)}>
                          −
                        </button>
                        <input value={s.copiesFor(i)} onChange={(e) => s.setCopies(i, Number(e.target.value) || 0)} style={{ width: 40, height: 30, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 6, fontFamily: "'IBM Plex Mono'" }} />
                        <button style={{ ...stepBtn, width: 30, height: 30 }} onClick={() => s.setCopies(i, s.copiesFor(i) + 1)}>
                          +
                        </button>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
          <table style={{ width: totalW, borderCollapse: 'collapse', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, tableLayout: 'fixed' }}>
            <colgroup>
              {colW.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--c-efedea)', fontSize: 10.5, fontWeight: 600, color: 'var(--text-2)', fontFamily: "'IBM Plex Mono'" }}>
                <th style={{ ...th, textAlign: 'center' }}>#{grip(0)}</th>
                <th style={th}>SkuCode{grip(1)}</th>
                <th style={th}>PluCode{grip(2)}</th>
                <th style={th}>CatCode{grip(3)}</th>
                <th style={th}>CatName{grip(4)}</th>
                <th style={th}>SkuDesc{grip(5)}</th>
                <th style={th}>SupplierID{grip(6)}</th>
                <th style={th}>SupplierName{grip(7)}</th>
                <th style={{ ...th, textAlign: 'right' }}>Price{grip(8)}</th>
                <th style={{ ...th, textAlign: 'center' }}>Qty{grip(9)}</th>
                <th style={{ ...th, borderRight: 'none' }}></th>
              </tr>
            </thead>
            <tbody>
              {skuRows.map((r: Sku, i) => {
                const active = s.activeSku === i
                return (
                  <tr key={i} onClick={() => useStore.setState({ activeSku: i })} style={{ background: active ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer', boxShadow: active ? 'inset 3px 0 0 var(--accent)' : undefined }}>
                    <td style={{ ...td, textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={s.skuSel[i] !== false} onChange={() => s.toggleSel(i)} onClick={(e) => e.stopPropagation()} />
                        {i + 1}
                      </span>
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={(e) => e.stopPropagation()}>
                        <button style={stepBtn} onClick={() => s.setCopies(i, s.copiesFor(i) - 1)}>
                          −
                        </button>
                        <input value={s.copiesFor(i)} onChange={(e) => s.setCopies(i, Number(e.target.value) || 0)} style={{ width: 34, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 0', fontFamily: "'IBM Plex Mono'" }} />
                        <button style={stepBtn} onClick={() => s.setCopies(i, s.copiesFor(i) + 1)}>
                          +
                        </button>
                      </span>
                    </td>
                    <td style={{ ...td, borderRight: 'none', textAlign: 'center' }}>
                      <button onClick={(e) => { e.stopPropagation(); s.removeRow(i) }} title="ลบแถว" style={{ width: 26, height: 26, border: '1px solid var(--border-2)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer', color: '#C2410C' }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          )}
          {skuRows.length === 0 && <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>ยังไม่มีรายการสินค้า<br />สแกน/พิมพ์รหัสด้านบน หรือกด "ใบสั่งซื้อ" เพื่อดึงทั้งใบ<br />ไม่ได้เชื่อมต่อฐานข้อมูล? กด "เทมเพลต" เพื่อโหลดไฟล์ Excel ไปกรอก แล้ว "นำเข้า Excel"</div>}
        </div>

        {/* footer */}
        <div style={{ flexShrink: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: narrow ? '10px 12px' : '12px 16px', display: 'flex', flexWrap: narrow ? 'wrap' : 'nowrap', alignItems: 'center', gap: narrow ? 10 : 14 }}>
          <button onClick={s.openPo} style={footBtn}>ใบสั่งซื้อ</button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={s.useQty} onChange={(e) => s.setUseQty(e.target.checked)} />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>พิมพ์ตามจำนวนใน PO (qty)</span>
          </label>

          {!narrow && <div style={{ width: 1, height: 26, background: 'var(--border)', flexShrink: 0 }} />}

          {/* offline Excel data — import a filled sheet, or grab the blank template */}
          <label style={excelBtn} title="นำเข้ารายการสินค้าจากไฟล์ Excel (.xlsx / .csv) — พิมพ์ได้แม้ไม่ได้เชื่อมต่อฐานข้อมูล">
            {icoUp} นำเข้าจาก Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => void onImportFile(e.target.files?.[0])} onClick={(e) => ((e.target as HTMLInputElement).value = '')} style={{ display: 'none' }} />
          </label>
          <button onClick={() => void downloadTemplate()} style={{ ...footBtn, color: 'var(--text-2)', fontWeight: 600 }} title="ดาวน์โหลดไฟล์ Excel ตัวอย่าง (มีหัวคอลัมน์พร้อมตัวอย่าง) ไว้กรอกข้อมูลแล้วนำเข้า">
            {icoDown} ดาวน์โหลดเทมเพลต
          </button>

          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>รวมที่จะพิมพ์</div>
            <div>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{printCount}</span> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ดวง · {isA4 ? `A4 · ${pcols}×${prows}/แผ่น` : `ม้วน ${pcols}×${prows}/หน้า`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* right: preview */}
      <div style={{ width: narrow ? '100%' : 480, flex: narrow ? 1 : undefined, flexShrink: 0, background: 'var(--surface)', borderLeft: narrow ? 'none' : '1px solid var(--border)', display: showPreview ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
        <div style={{ flexShrink: 0, padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>ตัวอย่าง</span>
          <span style={{ fontSize: 10.5, color: 'var(--accent)', fontFamily: "'IBM Plex Mono'", background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-border)', padding: '2px 8px', borderRadius: 20 }}>หน้า 1 / {totalPages}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => useStore.setState({ view: 'design' })} style={{ height: 30, padding: '0 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 11.5, color: 'var(--text-2)' }}>
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
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>ยังไม่มีรายการที่จะพิมพ์<br />เพิ่มสินค้าทางซ้ายก่อน</div>
          )}
        </div>
      </div>

      <PoModal />
      <ScanResultsModal />
    </div>
  )
}
