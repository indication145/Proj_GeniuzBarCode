import { useStore, pick } from '@/store/useStore'

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(27,26,24,0.45)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }
const sheet: React.CSSProperties = { width: 580, maxWidth: '94vw', maxHeight: '84vh', background: '#fff', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }

export function PoModal() {
  const { poOpen, poList, poFg, poSearch, poBusy, setPoFg, setPoSearch, loadPo, usePo, closePo } = useStore()
  if (!poOpen) return null
  return (
    <div style={overlay} onClick={closePo}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #EFEDEA', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>พิมพ์จากใบสั่งซื้อ · Purchase Order</div>
            <div style={{ fontSize: 11, color: '#9A938A' }}>เลือกใบสั่งซื้อเพื่อโหลดรายการสินค้ามาพิมพ์</div>
          </div>
          <button onClick={closePo} style={{ width: 30, height: 30, border: '1px solid #E6E3DF', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #EFEDEA', display: 'flex', gap: 8 }}>
          <select className="ge-field" style={{ width: 'auto', flexShrink: 0 }} value={poFg} onChange={(e) => setPoFg(e.target.value)}>
            <option value="1">เลขเอกสาร</option>
            <option value="2">ผู้ขาย</option>
            <option value="3">วันที่ (YYYY-MM-DD)</option>
          </select>
          <input className="ge-field" value={poSearch} onChange={(e) => setPoSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loadPo()} placeholder="ค้นหาใบสั่งซื้อ…" />
          <button onClick={() => void loadPo()} style={{ flexShrink: 0, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 600 }}>
            ค้นหา
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          {poBusy && <div style={{ textAlign: 'center', color: '#9A938A', padding: 24 }}>กำลังโหลด…</div>}
          {!poBusy && poList.length === 0 && <div style={{ textAlign: 'center', color: '#9A938A', padding: 24, fontSize: 13 }}>ไม่พบใบสั่งซื้อ</div>}
          {poList.map((r, i) => {
            const docNo = pick(r, 'sysDocNo', 'docNo', 'doc', 'no', 'docId')
            const sub = [pick(r, 'supplierName', 'vendorName', 'supplierId'), pick(r, 'docDate', 'date'), pick(r, 'purIvNo')].filter(Boolean).join(' · ')
            return (
              <button
                key={i}
                onClick={() => void usePo(docNo)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', marginBottom: 6, border: '1px solid #EBE8E3', borderRadius: 9, background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: "'IBM Plex Sans Thai'" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono'" }}>{docNo || '(no doc)'}</div>
                  <div style={{ fontSize: 11.5, color: '#78716c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub || '—'}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}>เลือก →</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
