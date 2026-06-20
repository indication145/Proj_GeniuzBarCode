// Domain types ported from LabelDesigner.dc.html (dc-runtime app).
// Kept intentionally loose where the original used dynamic objects.

export type ElType = 'text' | 'price' | 'barcode' | 'qr' | 'image' | 'frame'

export interface El {
  id: string
  type: ElType
  x: number
  y: number
  w: number
  h: number
  // text / price
  text?: string
  fontSize?: number
  weight?: number
  italic?: boolean
  align?: 'left' | 'center' | 'right'
  color?: string
  prefix?: string
  suffix?: string
  binding?: string
  // barcode
  value?: string
  format?: string
  showText?: boolean
  // image
  label?: string
  src?: string
  // frame
  border?: number
  radius?: number
}

/** A product row (REST/SQL or the built-in fallback). Extra columns allowed. */
export interface Sku {
  sku?: string
  name?: string
  price?: number | string
  barcode?: string
  unit?: string
  pluCode?: string
  catCode?: string
  catName?: string
  supplierId?: string
  supplierName?: string
  qty?: number
  [k: string]: unknown
}

export type Shop = Record<string, unknown> | null

export type PrintMedia = 'a4' | 'roll'

/** The slice of editor state the pure builders need (print / resolve). */
export interface LabelDoc {
  labelName: string
  labelW: number
  labelH: number
  bg: string
  elements: El[]
  printMedia: PrintMedia
  rollCols: number
  rollRows: number
}

/** Context for resolving a binding to its displayed value. */
export interface ResolveCtx {
  skuRows: Sku[]
  shop?: Shop
}

export interface Guide {
  axis: 'v' | 'h'
  pos: number
}
