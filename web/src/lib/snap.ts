// Drag snapping + box alignment. Pure: take the moving element + label/siblings,
// return the snapped position and any guide lines. Ported from LabelDesigner.dc.html.
import { snapHalf } from './units'
import type { El, Guide } from './types'

const T = 0.8 // snap threshold in mm

export interface SnapResult {
  x: number
  y: number
  guides: Guide[]
}

/**
 * Snap a dragged element's raw (rawX,rawY) to label edges/centre AND to sibling
 * elements' left/centre/right & top/middle/bottom. Axes without a snap fall back
 * to the 0.5mm grid. (Caller passes Alt-held → bypass and grid-snap both axes.)
 */
export function snapMove(el: El, rawX: number, rawY: number, labelW: number, labelH: number, siblings: El[]): SnapResult {
  const guides: Guide[] = []
  const sibs = siblings.filter((o) => o.id !== el.id)
  const vlines = [0, labelW / 2, labelW]
  const hlines = [0, labelH / 2, labelH]
  sibs.forEach((s) => {
    vlines.push(s.x, s.x + s.w / 2, s.x + s.w)
    hlines.push(s.y, s.y + s.h / 2, s.y + s.h)
  })

  const pick = (raw: number, size: number, lines: number[]) => {
    const anchors = [0, size / 2, size] // element left/centre/right (or top/mid/bottom)
    let best: { coord: number; line: number; dist: number } | null = null
    for (const line of lines) {
      for (const a of anchors) {
        const dist = Math.abs(raw + a - line)
        if (dist < T && (!best || dist < best.dist)) best = { coord: line - a, line, dist }
      }
    }
    return best
  }

  const bv = pick(rawX, el.w, vlines)
  const bh = pick(rawY, el.h, hlines)
  if (bv) guides.push({ axis: 'v', pos: bv.line })
  if (bh) guides.push({ axis: 'h', pos: bh.line })
  return { x: bv ? bv.coord : snapHalf(rawX), y: bh ? bh.coord : snapHalf(rawY), guides }
}

export type AlignDir = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom'

/** Position patch to align an element's box within the label bounds. */
export function alignBox(el: El, dir: AlignDir, labelW: number, labelH: number): Partial<Pick<El, 'x' | 'y'>> {
  switch (dir) {
    case 'left':
      return { x: 0 }
    case 'hcenter':
      return { x: snapHalf((labelW - el.w) / 2) }
    case 'right':
      return { x: snapHalf(labelW - el.w) }
    case 'top':
      return { y: 0 }
    case 'vmiddle':
      return { y: snapHalf((labelH - el.h) / 2) }
    case 'bottom':
      return { y: snapHalf(labelH - el.h) }
  }
}
