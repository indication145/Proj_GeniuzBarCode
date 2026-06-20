import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { snapHalf } from '@/lib/units'
import { DesignSidebar } from '@/components/DesignSidebar'
import { Canvas } from '@/components/Canvas'
import { Inspector } from '@/components/Inspector'

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
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toUpperCase()
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const st = useStore.getState()
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

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <DesignSidebar />
      <Canvas />
      <Inspector />
      <ConfirmDupModal />
    </div>
  )
}
