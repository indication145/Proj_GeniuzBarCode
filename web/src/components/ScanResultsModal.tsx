import { useStore } from '@/store/useStore'
import { fmtPrice } from '@/lib/units'

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(27,26,24,0.45)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }
const sheet: React.CSSProperties = { width: 520, maxWidth: '94vw', maxHeight: '80vh', background: '#fff', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }

export function ScanResultsModal() {
  const { scanResultsOpen, scanResults, appendSku, addAllResults, closeScanResults, toast } = useStore()
  if (!scanResultsOpen) return null
  return (
    <div style={overlay} onClick={closeScanResults}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EFEDEA', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>พบหลายรายการ ({scanResults.length})</div>
            <div style={{ fontSize: 11, color: '#9A938A' }}>เลือกเพิ่มทีละรายการ หรือเพิ่มทั้งหมด</div>
          </div>
          <button onClick={addAllResults} style={{ height: 34, padding: '0 13px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 600 }}>
            เพิ่มทั้งหมด
          </button>
          <button onClick={closeScanResults} style={{ width: 30, height: 30, border: '1px solid #E6E3DF', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          {scanResults.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                appendSku(p)
                toast('เพิ่ม ' + (p.sku || p.name))
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', marginBottom: 6, border: '1px solid #EBE8E3', borderRadius: 9, background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: "'IBM Plex Sans Thai'" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name || p.sku}</div>
                <div style={{ fontSize: 11, color: '#78716c', fontFamily: "'IBM Plex Mono'" }}>
                  {p.sku} · {p.barcode} {p.unit && '· ' + p.unit}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono'" }}>{fmtPrice(p.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
