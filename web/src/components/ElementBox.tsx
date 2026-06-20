import { PX } from '@/lib/units'
import { resolveValue } from '@/lib/elements'
import type { El, ResolveCtx } from '@/lib/types'
import { BarcodeCanvas } from './BarcodeCanvas'
import { QrBox } from './QrBox'

// On-screen render of one element (mm coords → px). Mirrors the dc app's elView.
export function ElementBox({ el, ctx, idx }: { el: El; ctx: ResolveCtx; idx: number }) {
  const wrap: React.CSSProperties = {
    position: 'absolute',
    left: el.x * PX,
    top: el.y * PX,
    width: el.w * PX,
    height: el.h * PX,
    boxSizing: 'border-box',
    userSelect: 'none',
  }

  if (el.type === 'text' || el.type === 'price') {
    const inner: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: el.align === 'left' ? 'flex-start' : el.align === 'right' ? 'flex-end' : 'center',
      fontFamily: "'IBM Plex Sans Thai', sans-serif",
      fontSize: (el.fontSize ?? 3) * PX,
      fontWeight: el.weight || 600,
      fontStyle: el.italic ? 'italic' : 'normal',
      color: el.color || '#1b1a18',
      lineHeight: 1.04,
      textAlign: el.align || 'center',
      overflow: 'hidden',
      whiteSpace: el.type === 'price' ? 'nowrap' : 'normal',
    }
    return (
      <div style={wrap}>
        <div style={inner}>{resolveValue(el, ctx, idx)}</div>
      </div>
    )
  }

  if (el.type === 'frame') {
    return <div style={{ ...wrap, border: `${(el.border ?? 0.5) * PX}px solid ${el.color || '#1b1a18'}`, borderRadius: (el.radius ?? 0) * PX, background: 'transparent' }} />
  }

  if (el.type === 'barcode') {
    return (
      <div style={wrap}>
        <BarcodeCanvas text={resolveValue(el, ctx, idx)} format={el.format} showText={el.showText} />
      </div>
    )
  }

  if (el.type === 'qr') {
    return (
      <div style={wrap}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QrBox text={resolveValue(el, ctx, idx)} />
        </div>
      </div>
    )
  }

  if (el.type === 'image') {
    if (el.src) {
      return (
        <div style={wrap}>
          <img src={el.src} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} alt="" />
        </div>
      )
    }
    return (
      <div style={wrap}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #b9b3a9',
            borderRadius: 2,
            background: 'repeating-linear-gradient(45deg,#f4f3f1,#f4f3f1 4px,#eceae6 4px,#eceae6 8px)',
            color: '#9a938a',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: Math.max(6, el.w * 0.9),
            letterSpacing: '0.05em',
          }}
        >
          {el.label || 'LOGO'}
        </div>
      </div>
    )
  }

  return null
}
