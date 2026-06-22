import { useEffect, useRef, useState } from 'react'
import { PX, snapHalf } from '@/lib/units'
import { snapMove } from '@/lib/snap'
import { defaultSku } from '@/lib/elements'
import { MOODS, STOCKS } from '@/lib/theme'
import { useStore } from '@/store/useStore'
import { useBreakpoint, useMediaQuery } from '@/lib/useMediaQuery'
import { ElementBox } from './ElementBox'
import type { El } from '@/lib/types'

type Drag =
  | { mode: 'pan'; mx: number; my: number; panX: number; panY: number }
  | { mode: 'move'; id: string; mx: number; my: number; sx: number; sy: number; pushed: boolean }
  | { mode: 'resize'; dir: string; mx: number; my: number; sx: number; sy: number; sw: number; sh: number; pushed: boolean }

type Pinch = { dist: number; midX: number; midY: number; zoom: number; panX: number; panY: number }

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

const clampZoom = (z: number) => Math.max(0.4, Math.min(20, z))

export function Canvas({ onToggleLeft, onToggleRight }: { onToggleLeft?: () => void; onToggleRight?: () => void } = {}) {
  const s = useStore()
  const { elements, labelW, labelH, bg, zoom, panX, panY, selectedId, guides, mood, stock } = s
  const { isTablet } = useBreakpoint()
  const coarse = useMediaQuery('(pointer: coarse)')
  const vpRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinch = useRef<Pinch | null>(null)
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
        const nz = clampZoom(st.zoom * (e.deltaY < 0 ? 1.08 : 0.93))
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

  // space-to-pan (desktop)
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
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  // ----- one drag step (shared by pointer move) -----
  function applyDrag(clientX: number, clientY: number, altKey: boolean) {
    const d = drag.current
    if (!d) return
    const st = useStore.getState()
    const z = st.zoom
    if (d.mode === 'pan') {
      st.setView3({ panX: d.panX + (clientX - d.mx), panY: d.panY + (clientY - d.my) })
      return
    }
    const dxmm = (clientX - d.mx) / (PX * z)
    const dymm = (clientY - d.my) / (PX * z)
    if (d.mode === 'move') {
      const el = st.elements.find((o) => o.id === d.id)
      if (!el) return
      if (!d.pushed) {
        st.pushHistory() // snapshot pre-move state on first actual movement
        d.pushed = true
      }
      const r = altKey ? { x: snapHalf(d.sx + dxmm), y: snapHalf(d.sy + dymm), guides: [] } : snapMove(el, d.sx + dxmm, d.sy + dymm, st.labelW, st.labelH, st.elements)
      st.patchEl(d.id, { x: r.x, y: r.y })
      st.setGuides(r.guides)
    } else {
      if (!d.pushed) {
        st.pushHistory() // snapshot pre-resize state on first actual resize
        d.pushed = true
      }
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

  function endDrag() {
    if (drag.current) {
      drag.current = null
      if (useStore.getState().guides.length) useStore.getState().setGuides([])
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    const vp = vpRef.current
    // overlay controls (toolbar undo/redo/zoom, drawer toggles) live inside the
    // viewport — don't capture their pointer or their click won't fire
    if ((e.target as HTMLElement).closest?.('button')) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // second finger → start pinch-zoom, abandon any single drag
    if (pointers.current.size === 2) {
      drag.current = null
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const st = useStore.getState()
      pinch.current = { dist, midX: (pts[0].x + pts[1].x) / 2, midY: (pts[0].y + pts[1].y) / 2, zoom: st.zoom, panX: st.panX, panY: st.panY }
      return
    }
    if (pointers.current.size > 2) return

    vp?.setPointerCapture?.(e.pointerId)
    const st = useStore.getState()
    const isTouch = e.pointerType === 'touch'
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
        // history is pushed lazily on the first move so a plain click adds nothing
        drag.current = { mode: 'resize', dir: handle.getAttribute('data-handle') || 'se', mx: e.clientX, my: e.clientY, sx: cur.x, sy: cur.y, sw: cur.w, sh: cur.h, pushed: false }
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
        // history pushed lazily on first move (selecting is not an edit)
        drag.current = { mode: 'move', id, mx: e.clientX, my: e.clientY, sx: el.x, sy: el.y, pushed: false }
      }
      e.preventDefault()
      return
    }
    // empty area: touch → one-finger pan (and deselect); mouse → deselect
    st.setSelected(null)
    if (isTouch) {
      drag.current = { mode: 'pan', mx: e.clientX, my: e.clientY, panX: st.panX, panY: st.panY }
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size >= 2 && pinch.current) {
      const vp = vpRef.current
      if (!vp) return
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const p0 = pinch.current
      const nz = clampZoom(p0.zoom * (dist / (p0.dist || 1)))
      const r = vp.getBoundingClientRect()
      const startMidLocalX = p0.midX - r.left
      const startMidLocalY = p0.midY - r.top
      const curMidLocalX = (pts[0].x + pts[1].x) / 2 - r.left
      const curMidLocalY = (pts[0].y + pts[1].y) / 2 - r.top
      const contentX = (startMidLocalX - p0.panX) / p0.zoom
      const contentY = (startMidLocalY - p0.panY) / p0.zoom
      useStore.getState().setView3({ zoom: nz, panX: curMidLocalX - contentX * nz, panY: curMidLocalY - contentY * nz })
      return
    }
    applyDrag(e.clientX, e.clientY, e.altKey)
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    vpRef.current?.releasePointerCapture?.(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) endDrag()
  }

  const M = MOODS[mood]
  // preview falls back to a sample SKU when no real rows loaded yet, so the
  // designer always shows data without going to the print page first
  const ctx = { skuRows: s.skuRows.length ? s.skuRows : defaultSku(), shop: s.shop }
  const z = zoom
  // larger hit targets on touch/coarse pointers
  const handleBase = coarse ? 17 : 9
  const toolBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', border: '1px solid #E6E3DF', borderRadius: 9, background: '#fff', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 12.5, fontWeight: 600, color: '#44403B', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
      <div
        ref={vpRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none', cursor: spaceHeld ? 'grab' : 'default', backgroundColor: M.color, backgroundImage: M.img, backgroundSize: M.size }}
      >
        {/* tablet: open panel drawers */}
        {isTablet && (onToggleLeft || onToggleRight) && (
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', zIndex: 40, pointerEvents: 'none' }}>
            {onToggleLeft ? (
              <button onClick={onToggleLeft} style={{ ...toolBtn, pointerEvents: 'auto' }}>
                ☰ องค์ประกอบ
              </button>
            ) : (
              <span />
            )}
            {onToggleRight ? (
              <button onClick={onToggleRight} style={{ ...toolBtn, pointerEvents: 'auto' }}>
                ปรับแต่ง ⚙
              </button>
            ) : (
              <span />
            )}
          </div>
        )}

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
                const hs = handleBase / z
                const half = hs / 2
                const pos: React.CSSProperties = { position: 'absolute', width: hs, height: hs, background: '#fff', border: `${Math.max(0.5, 1.2 / z)}px solid var(--accent)`, borderRadius: 2 / z, pointerEvents: 'auto', zIndex: 901, touchAction: 'none' }
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
