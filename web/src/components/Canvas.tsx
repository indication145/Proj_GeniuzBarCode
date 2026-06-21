import { useEffect, useRef, useState } from 'react'
import { PX, snapHalf } from '@/lib/units'
import { snapMove } from '@/lib/snap'
import { defaultSku } from '@/lib/elements'
import { MOODS, STOCKS } from '@/lib/theme'
import { useStore } from '@/store/useStore'
import { ElementBox } from './ElementBox'
import type { El } from '@/lib/types'

type Drag =
  | { mode: 'pan'; mx: number; my: number; panX: number; panY: number }
  | { mode: 'move'; id: string; mx: number; my: number; sx: number; sy: number }
  | { mode: 'resize'; dir: string; mx: number; my: number; sx: number; sy: number; sw: number; sh: number }

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

export function Canvas() {
  const s = useStore()
  const { elements, labelW, labelH, bg, zoom, panX, panY, selectedId, guides, mood, stock } = s
  const vpRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const spaceRef = useRef(false)
  const sel = elements.find((e) => e.id === selectedId) || null

  // fit on mount + when label size changes
  function fitView() {
    const vp = vpRef.current
    if (!vp) return
    const w = vp.clientWidth
    const h = vp.clientHeight
    const lw = labelW * PX
    const lh = labelH * PX
    const z = Math.max(0.4, Math.min(14, Math.min((w - 90) / lw, (h - 90) / lh)))
    useStore.getState().setView3({ zoom: z, panX: (w - lw * z) / 2, panY: (h - lh * z) / 2 })
  }
  useEffect(() => {
    const t = setTimeout(fitView, 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelW, labelH])

  // wheel: ctrl/meta = zoom, else pan (non-passive to preventDefault)
  useEffect(() => {
    const vp = vpRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const st = useStore.getState()
      if (e.ctrlKey || e.metaKey) {
        const nz = Math.max(0.4, Math.min(20, st.zoom * (e.deltaY < 0 ? 1.08 : 0.93)))
        const r = vp.getBoundingClientRect()
        const px = e.clientX - r.left
        const py = e.clientY - r.top
        st.setView3({ zoom: nz, panX: px - (px - st.panX) * (nz / st.zoom), panY: py - (py - st.panY) * (nz / st.zoom) })
      } else {
        st.setView3({ panX: st.panX - e.deltaX, panY: st.panY - e.deltaY })
      }
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [])

  // space-to-pan + drag move/up listeners
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toUpperCase()
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        if (!spaceRef.current) {
          spaceRef.current = true
          setSpaceHeld(true)
        }
        e.preventDefault()
      }
    }
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false
        setSpaceHeld(false)
      }
    }
    const mv = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      const st = useStore.getState()
      const z = st.zoom
      if (d.mode === 'pan') {
        st.setView3({ panX: d.panX + (e.clientX - d.mx), panY: d.panY + (e.clientY - d.my) })
        return
      }
      const dxmm = (e.clientX - d.mx) / (PX * z)
      const dymm = (e.clientY - d.my) / (PX * z)
      if (d.mode === 'move') {
        const el = st.elements.find((o) => o.id === d.id)
        if (!el) return
        const r = e.altKey ? { x: snapHalf(d.sx + dxmm), y: snapHalf(d.sy + dymm), guides: [] } : snapMove(el, d.sx + dxmm, d.sy + dymm, st.labelW, st.labelH, st.elements)
        st.patchEl(d.id, { x: r.x, y: r.y })
        st.setGuides(r.guides)
      } else {
        const dir = d.dir
        let x = d.sx
        let y = d.sy
        let w = d.sw
        let h = d.sh
        if (dir.includes('e')) w = d.sw + dxmm
        if (dir.includes('s')) h = d.sh + dymm
        if (dir.includes('w')) {
          w = d.sw - dxmm
          x = d.sx + dxmm
        }
        if (dir.includes('n')) {
          h = d.sh - dymm
          y = d.sy + dymm
        }
        w = Math.max(2, w)
        h = Math.max(2, h)
        if (st.selectedId) st.patchEl(st.selectedId, { x: snapHalf(x), y: snapHalf(y), w: snapHalf(w), h: snapHalf(h) })
      }
    }
    const up = () => {
      if (drag.current) {
        drag.current = null
        if (useStore.getState().guides.length) useStore.getState().setGuides([])
      }
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  function onDown(e: React.MouseEvent) {
    const st = useStore.getState()
    if (spaceRef.current || e.button === 1) {
      drag.current = { mode: 'pan', mx: e.clientX, my: e.clientY, panX: st.panX, panY: st.panY }
      e.preventDefault()
      return
    }
    const target = e.target as HTMLElement
    const handle = target.closest?.('[data-handle]')
    if (handle && st.selectedId) {
      const cur = st.elements.find((o) => o.id === st.selectedId)
      if (cur) {
        st.pushHistory() // snapshot before resize (dedupe makes click-no-move safe)
        drag.current = { mode: 'resize', dir: handle.getAttribute('data-handle') || 'se', mx: e.clientX, my: e.clientY, sx: cur.x, sy: cur.y, sw: cur.w, sh: cur.h }
        e.preventDefault()
        return
      }
    }
    const node = target.closest?.('[data-id]')
    if (node) {
      const id = node.getAttribute('data-id')!
      const el = st.elements.find((o) => o.id === id)
      st.setSelected(id)
      if (el) {
        st.pushHistory() // snapshot before move
        drag.current = { mode: 'move', id, mx: e.clientX, my: e.clientY, sx: el.x, sy: el.y }
      }
      e.preventDefault()
      return
    }
    st.setSelected(null)
  }

  const M = MOODS[mood]
  // preview falls back to a sample SKU when no real rows loaded yet, so the
  // designer always shows data without going to the print page first
  const ctx = { skuRows: s.skuRows.length ? s.skuRows : defaultSku(), shop: s.shop }
  const z = zoom

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
      <div
        ref={vpRef}
        onMouseDown={onDown}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: spaceHeld ? 'grab' : 'default', backgroundColor: M.color, backgroundImage: M.img, backgroundSize: M.size }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: labelW * PX, height: labelH * PX, transform: `translate(${panX}px,${panY}px) scale(${z})`, transformOrigin: '0 0', backgroundColor: bg, backgroundImage: STOCKS[stock], boxShadow: M.shadow, borderRadius: 1 }}>
          {elements.map((el: El) => (
            <ElementBox key={el.id} el={el} ctx={ctx} idx={s.activeSku} interactive />
          ))}
          {guides.map((g, i) => (
            <div
              key={i}
              style={
                g.axis === 'v'
                  ? { position: 'absolute', left: g.pos * PX, top: -6, width: 1, height: labelH * PX + 12, background: 'var(--accent)', opacity: 0.9, pointerEvents: 'none', zIndex: 850 }
                  : { position: 'absolute', top: g.pos * PX, left: -6, height: 1, width: labelW * PX + 12, background: 'var(--accent)', opacity: 0.9, pointerEvents: 'none', zIndex: 850 }
              }
            />
          ))}
          {sel && (
            <div style={{ position: 'absolute', left: sel.x * PX, top: sel.y * PX, width: sel.w * PX, height: sel.h * PX, border: `${1.4 / z}px solid var(--accent)`, boxSizing: 'border-box', pointerEvents: 'none', zIndex: 900 }}>
              {HANDLES.map((dir) => {
                const hs = 9 / z
                const half = hs / 2
                const pos: React.CSSProperties = { position: 'absolute', width: hs, height: hs, background: '#fff', border: `${Math.max(0.5, 1.2 / z)}px solid var(--accent)`, borderRadius: 2 / z, pointerEvents: 'auto', zIndex: 901 }
                if (dir.includes('n')) pos.top = -half
                if (dir.includes('s')) pos.bottom = -half
                if (dir.includes('w')) pos.left = -half
                if (dir.includes('e')) pos.right = -half
                if (dir === 'n' || dir === 's') {
                  pos.left = '50%'
                  pos.transform = 'translateX(-50%)'
                }
                if (dir === 'e' || dir === 'w') {
                  pos.top = '50%'
                  pos.transform = 'translateY(-50%)'
                }
                const cursor = dir === 'n' || dir === 's' ? 'ns-resize' : dir === 'e' || dir === 'w' ? 'ew-resize' : dir === 'ne' || dir === 'sw' ? 'nesw-resize' : 'nwse-resize'
                return <div key={dir} data-handle={dir} style={{ ...pos, cursor }} />
              })}
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', background: 'rgba(27,26,24,0.82)', color: '#fff', fontFamily: "'IBM Plex Mono'", fontSize: 11, padding: '5px 12px', borderRadius: 20, pointerEvents: 'none' }}>
          {labelW} × {labelH} mm
        </div>
        <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 2, background: '#fff', border: '1px solid #E6E3DF', borderRadius: 10, padding: 3, boxShadow: '0 3px 12px rgba(0,0,0,0.08)' }}>
          <button onClick={() => useStore.getState().undo()} disabled={!s.past.length} title="ย้อนกลับ (Ctrl+Z)" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, cursor: s.past.length ? 'pointer' : 'default', opacity: s.past.length ? 1 : 0.3, fontSize: 16 }}>
            ↶
          </button>
          <button onClick={() => useStore.getState().redo()} disabled={!s.future.length} title="ทำซ้ำ (Ctrl+Shift+Z)" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, cursor: s.future.length ? 'pointer' : 'default', opacity: s.future.length ? 1 : 0.3, fontSize: 16 }}>
            ↷
          </button>
        </div>
        <div style={{ position: 'absolute', right: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 2, background: '#fff', border: '1px solid #E6E3DF', borderRadius: 10, padding: 3, boxShadow: '0 3px 12px rgba(0,0,0,0.08)' }}>
          <button onClick={() => useStore.getState().setView3({ zoom: Math.max(0.4, z * 0.85) })} style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, cursor: 'pointer' }}>
            −
          </button>
          <button onClick={fitView} style={{ minWidth: 52, height: 30, border: 'none', background: 'transparent', borderRadius: 7, cursor: 'pointer', fontFamily: "'IBM Plex Mono'", fontSize: 11.5 }}>
            {Math.round(z * 100)}%
          </button>
          <button onClick={() => useStore.getState().setView3({ zoom: Math.min(20, z * 1.15) })} style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, cursor: 'pointer' }}>
            +
          </button>
        </div>
      </div>
    </main>
  )
}
