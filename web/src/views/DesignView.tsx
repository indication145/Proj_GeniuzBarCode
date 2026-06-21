import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { snapHalf } from '@/lib/units'
import { defaultSku } from '@/lib/elements'
import { useBreakpoint } from '@/lib/useMediaQuery'
import { DesignSidebar } from '@/components/DesignSidebar'
import { Canvas } from '@/components/Canvas'
import { Inspector } from '@/components/Inspector'
import { LabelPreview } from '@/components/LabelPreview'

/** Slide-over drawer used to hold the sidebar / inspector on tablet & smaller. */
function Drawer({ side, onClose, children }: { side: 'left' | 'right'; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(27,26,24,0.4)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: side === 'left' ? 'flex-start' : 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ height: '100%', maxWidth: '88%', display: 'flex', boxShadow: side === 'left' ? '6px 0 28px rgba(0,0,0,0.22)' : '-6px 0 28px rgba(0,0,0,0.22)' }}>
        {children}
      </div>
    </div>
  )
}

/** Phones (<640): editing fine elements by finger on a tiny canvas is painful,
 *  so Design becomes a read-only preview. Pick a preset / size / saved template
 *  via the drawer, then head to the Print page. */
function MobileDesignView() {
  const s = useStore()
  const { elements, labelW, labelH, bg } = s
  const setView = useStore((st) => st.setView)
  const [drawer, setDrawer] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const [ps, setPs] = useState(4)
  const ctx = { skuRows: s.skuRows.length ? s.skuRows : defaultSku(), shop: s.shop }

  useEffect(() => {
    const fit = () => {
      const el = boxRef.current
      if (!el) return
      const p = Math.max(1.5, Math.min((el.clientWidth - 28) / labelW, (el.clientHeight - 28) / labelH))
      setPs(p)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [labelW, labelH])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative', background: '#F4F3F1' }}>
      {/* top strip */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', borderBottom: '1px solid #E6E3DF' }}>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.labelName || '(ไม่มีชื่อ)'}</div>
          <div style={{ fontSize: 11, color: '#9A938A', fontFamily: "'IBM Plex Mono'" }}>{labelW} × {labelH} มม. · {elements.length} ชิ้น</div>
        </div>
        <button onClick={() => setDrawer(true)} style={{ flexShrink: 0, height: 36, padding: '0 14px', border: '1px solid #E6E3DF', borderRadius: 9, background: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 12.5, fontWeight: 600, color: '#44403B' }}>
          ☰ แม่แบบ / ขนาด
        </button>
      </div>

      {/* preview */}
      <div ref={boxRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
        <LabelPreview elements={elements} labelW={labelW} labelH={labelH} bg={bg} ctx={ctx} idx={s.activeSku} ps={ps} />
      </div>

      {/* hint + go to print */}
      <div style={{ flexShrink: 0, padding: '10px 12px 12px', background: '#fff', borderTop: '1px solid #E6E3DF' }}>
        <div style={{ fontSize: 11, color: '#9A938A', textAlign: 'center', marginBottom: 9, lineHeight: 1.5 }}>โหมดดูบนมือถือ — แก้ไของค์ประกอบแบบละเอียดได้บนแท็บเล็ต/คอมพิวเตอร์</div>
        <button onClick={() => setView('print')} style={{ width: '100%', height: 46, border: 'none', borderRadius: 11, background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 700, boxShadow: '0 3px 12px var(--accent-shadow)' }}>
          ไปหน้าพิมพ์ป้ายราคา →
        </button>
      </div>

      {drawer && (
        <Drawer side="left" onClose={() => setDrawer(false)}>
          <DesignSidebar />
        </Drawer>
      )}
      <ConfirmDupModal />
    </div>
  )
}

function ConfirmDupModal() {
  const dup = useStore((s) => s.confirmDup)
  const cancel = useStore((s) => s.cancelDup)
  const doSave = useStore((s) => s.doSave)
  if (!dup) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,26,24,0.45)', backdropFilter: 'blur(3px)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={cancel}>
      <div style={{ width: 420, maxWidth: '92vw', background: '#fff', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px 22px 6px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>มีแม่แบบชื่อนี้อยู่แล้ว</div>
          <div style={{ fontSize: 12.5, color: '#78716c' }}>
            มีแม่แบบชื่อ <b style={{ color: '#1B1A18' }}>"{dup.name}"</b> อยู่แล้ว — ถ้าเขียนทับ ดีไซน์เดิมจะถูกแทนที่ทั้งหมด
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '6px 22px 22px' }}>
          <button onClick={cancel} style={{ flex: 1, height: 40, border: '1px solid #E6E3DF', borderRadius: 9, background: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13, color: '#44403B' }}>
            ยกเลิก (เปลี่ยนชื่อ)
          </button>
          <button onClick={() => void doSave(dup.id, 'overwrite')} style={{ flex: 1, height: 40, border: 'none', borderRadius: 9, background: '#C2410C', color: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13, fontWeight: 600 }}>
            เขียนทับ
          </button>
        </div>
      </div>
    </div>
  )
}

export function DesignView() {
  const { isMobile, isTablet } = useBreakpoint()
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toUpperCase()
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const st = useStore.getState()
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) st.redo()
        else st.undo()
        e.preventDefault()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        st.redo()
        e.preventDefault()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId) {
        st.deleteSel()
        e.preventDefault()
        return
      }
      if (e.key === 'Escape' && st.selectedId) {
        st.setSelected(null)
        e.preventDefault()
        return
      }
      const sel = st.selEl()
      if (sel && e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? 2 : 0.5
        const p: Partial<typeof sel> = {}
        if (e.key === 'ArrowLeft') p.x = snapHalf(sel.x - step)
        if (e.key === 'ArrowRight') p.x = snapHalf(sel.x + step)
        if (e.key === 'ArrowUp') p.y = snapHalf(sel.y - step)
        if (e.key === 'ArrowDown') p.y = snapHalf(sel.y + step)
        st.updateSel(p)
        e.preventDefault()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && sel) {
        st.dupSel()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [])

  if (isMobile) return <MobileDesignView />

  if (isTablet) {
    return (
      <div style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0, position: 'relative' }}>
        <Canvas onToggleLeft={() => setLeftOpen(true)} onToggleRight={() => setRightOpen(true)} />
        {leftOpen && (
          <Drawer side="left" onClose={() => setLeftOpen(false)}>
            <DesignSidebar />
          </Drawer>
        )}
        {rightOpen && (
          <Drawer side="right" onClose={() => setRightOpen(false)}>
            <Inspector />
          </Drawer>
        )}
        <ConfirmDupModal />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <DesignSidebar />
      <Canvas />
      <Inspector />
      <ConfirmDupModal />
    </div>
  )
}
