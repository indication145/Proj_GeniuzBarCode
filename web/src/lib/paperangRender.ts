// Rasterize one label instance to a 1-bit packed bitmap for the PAPERANG print
// head (fixed 384 dots / 48 bytes wide). Draws straight to a <canvas> — no
// DOM/html2canvas — reusing the same barcode/QR renderers as the design canvas.
import { drawBarcode, drawQRCanvas } from './barcode'
import { resolveValue } from './elements'
import type { El, LabelDoc, ResolveCtx } from './types'
import { PRINT_WIDTH_DOTS, DOTS_PER_MM } from './paperang'

// Sum of R+G+B per pixel; matches the paperang-web reverse-engineered binarization.
const BLACK_THRESHOLD = 420

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

async function drawEl(c2d: CanvasRenderingContext2D, el: El, ctx: ResolveCtx, idx: number, scale: number): Promise<void> {
  const x = el.x * scale
  const y = el.y * scale
  const w = el.w * scale
  const h = el.h * scale

  if (el.type === 'text' || el.type === 'price') {
    const val = resolveValue(el, ctx, idx)
    if (!val) return
    const style = el.italic ? 'italic' : 'normal'
    const fontSize = (el.fontSize || 4) * scale
    c2d.font = `${style} ${el.weight || 600} ${fontSize}px ${el.fontFamily || "'IBM Plex Sans Thai'"}`
    c2d.fillStyle = '#000'
    c2d.textBaseline = 'middle'
    c2d.textAlign = el.align === 'left' ? 'left' : el.align === 'right' ? 'right' : 'center'
    const tx = el.align === 'left' ? x : el.align === 'right' ? x + w : x + w / 2
    c2d.fillText(val, tx, y + h / 2, w)
    return
  }
  if (el.type === 'frame') {
    const border = Math.max(1, (el.border || 0.5) * scale)
    c2d.lineWidth = border
    c2d.strokeStyle = '#000'
    c2d.beginPath()
    c2d.roundRect(x + border / 2, y + border / 2, Math.max(0, w - border), Math.max(0, h - border), (el.radius || 0) * scale)
    c2d.stroke()
    return
  }
  if (el.type === 'barcode' || el.type === 'qr') {
    const val = resolveValue(el, ctx, idx)
    if (!val) return
    const tmp = document.createElement('canvas')
    tmp.width = Math.max(1, Math.round(w))
    tmp.height = Math.max(1, Math.round(h))
    if (el.type === 'barcode') drawBarcode(tmp, val, { format: el.format, showText: el.showText, lineColor: '#000' })
    else await drawQRCanvas(tmp, val, Math.max(tmp.width, tmp.height))
    c2d.drawImage(tmp, x, y, w, h)
    return
  }
  if (el.type === 'image' && el.src) {
    try {
      const img = await loadImage(el.src)
      c2d.drawImage(img, x, y, w, h)
    } catch {
      /* skip unreadable image */
    }
  }
}

/** Renders label `idx` and packs it MSB-first into PRINT_WIDTH_DOTS-wide rows. */
export async function rasterizeLabel(doc: LabelDoc, ctx: ResolveCtx, idx: number): Promise<Uint8Array> {
  if (document.fonts?.ready) await document.fonts.ready

  // 384-dot head is ~48mm; labels wider than that are scaled down to fit, narrower ones are centered.
  const fit = Math.min(1, PRINT_WIDTH_DOTS / (doc.labelW * DOTS_PER_MM))
  const scale = DOTS_PER_MM * fit
  const canvasW = PRINT_WIDTH_DOTS
  const canvasH = Math.max(1, Math.round(doc.labelH * scale))
  const offsetX = Math.max(0, Math.round((canvasW - doc.labelW * scale) / 2))

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const c2d = canvas.getContext('2d')!
  c2d.fillStyle = '#fff'
  c2d.fillRect(0, 0, canvasW, canvasH)
  c2d.translate(offsetX, 0)

  for (const el of doc.elements) await drawEl(c2d, el, ctx, idx, scale)

  const { data } = c2d.getImageData(0, 0, canvasW, canvasH)
  const bytes = new Uint8Array((canvasW * canvasH) / 8)
  let bitIdx = 0
  for (let p = 0; p < data.length; p += 4) {
    if (data[p] + data[p + 1] + data[p + 2] < BLACK_THRESHOLD) {
      bytes[bitIdx >> 3] |= 1 << (7 - (bitIdx & 7))
    }
    bitIdx++
  }
  return bytes
}
