// Coordinate / number helpers. State is in millimetres; px only for screen.
// Ported from LabelDesigner.dc.html (PX constant, _fmtPrice, num).

/** mm → px multiplier used for on-screen rendering (1mm ≈ 3.7795px @96dpi). */
export const PX = 3.7795

export const mmToPx = (mm: number) => mm * PX
export const pxToMm = (px: number) => px / PX

/** Snap a millimetre value to the 0.5mm grid (matches the editor's drag step). */
export const snapHalf = (v: number) => Math.round(v * 2) / 2

/** Always 2 decimals, th-TH grouping: 15 → "15.00", 1234.5 → "1,234.50". */
export function fmtPrice(x: unknown): string {
  const n = Number(x)
  if (Number.isNaN(n)) return String(x == null ? '' : x)
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** parseFloat with fallback (used by numeric inputs). */
export function num(v: unknown, fb: number): number {
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? fb : n
}
