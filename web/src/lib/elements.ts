// Element model: factory defaults, element creation, the 3 starter templates,
// and binding resolution. Ported from LabelDesigner.dc.html.
import { fmtPrice } from './units'
import type { El, ElType, ResolveCtx, Sku } from './types'

let _n = 0
/** Unique-ish id per session (matches the original 'elN_xxxx' scheme). */
export function genId(): string {
  _n += 1
  return 'el' + _n + '_' + Math.random().toString(36).slice(2, 6)
}

export function defaultsFor(type: ElType, lw: number, lh: number): Partial<El> {
  switch (type) {
    case 'text':
      return { w: Math.min(lw * 0.8, lw - 4), h: 6, text: 'ข้อความ', fontSize: 3.4, weight: 600, italic: false, align: 'center', color: '#1b1a18', binding: '' }
    case 'price':
      return { w: Math.min(lw * 0.7, lw - 4), h: 10, text: '0', fontSize: 8, weight: 700, italic: false, align: 'center', color: '#1b1a18', prefix: '', binding: 'price' }
    case 'barcode':
      return { w: Math.min(lw * 0.85, lw - 4), h: 12, value: '885000010014', format: 'CODE128', showText: true, binding: 'barcode' }
    case 'qr':
      return { w: 16, h: 16, value: 'https://csith.com', binding: '' }
    case 'image':
      return { w: 16, h: 16, label: 'LOGO', src: '' }
    case 'frame':
      return { w: lw - 3, h: lh - 3, border: 0.5, radius: 1.5, color: '#1b1a18' }
    default:
      return {}
  }
}

export function mkEl(type: ElType, lw: number, lh: number, over?: Partial<El>): El {
  const base = defaultsFor(type, lw, lh)
  const el = { id: genId(), type, ...base, ...over } as El
  if (el.x == null) el.x = Math.max(0, (lw - (el.w ?? 0)) / 2)
  if (el.y == null) el.y = Math.max(0, (lh - (el.h ?? 0)) / 2)
  return el
}

export function tplPriceTag(lw: number, lh: number): El[] {
  return [
    mkEl('frame', lw, lh, { x: 1.5, y: 1.5, w: lw - 3, h: lh - 3, border: 0.4, radius: 2 }),
    mkEl('text', lw, lh, { x: 3, y: 2.5, w: lw - 6, h: 5, fontSize: 3, weight: 600, binding: 'name' }),
    mkEl('price', lw, lh, { x: 3, y: 8, w: lw - 6, h: 11, fontSize: 9, binding: 'price' }),
    mkEl('barcode', lw, lh, { x: 4, y: 20, w: lw - 8, h: 8, format: 'CODE128', binding: 'barcode' }),
  ]
}

export function tplSticker(lw: number, lh: number): El[] {
  return [
    mkEl('frame', lw, lh, { x: 1.5, y: 1.5, w: lw - 3, h: lh - 3, border: 0.4, radius: 2.5 }),
    mkEl('image', lw, lh, { x: 4, y: 4, w: 16, h: 16, label: 'LOGO' }),
    mkEl('text', lw, lh, { x: 24, y: 5, w: lw - 30, h: 7, fontSize: 4.4, weight: 700, align: 'left', binding: 'name' }),
    mkEl('price', lw, lh, { x: 24, y: 14, w: 34, h: 10, fontSize: 8, align: 'left', binding: 'price' }),
    mkEl('barcode', lw, lh, { x: 4, y: 26, w: 60, h: 18, format: 'EAN13', binding: 'barcode' }),
    mkEl('qr', lw, lh, { x: 80, y: 26, w: 16, h: 16, binding: 'barcode' }),
  ]
}

export function tplQr(lw: number, lh: number): El[] {
  return [
    mkEl('frame', lw, lh, { x: 1.5, y: 1.5, w: lw - 3, h: lh - 3, border: 0.4, radius: 2 }),
    mkEl('text', lw, lh, { x: 3, y: 2.5, w: lw - 6, h: 4.5, fontSize: 2.8, weight: 600, binding: 'name' }),
    mkEl('qr', lw, lh, { x: 3, y: 8, w: 14, h: 14, binding: 'barcode' }),
    mkEl('price', lw, lh, { x: 19, y: 9, w: lw - 22, h: 9, fontSize: 7, align: 'left', binding: 'price' }),
    mkEl('text', lw, lh, { x: 19, y: 18, w: lw - 22, h: 4, fontSize: 2.6, weight: 500, align: 'left', color: '#807a72', binding: 'unit' }),
  ]
}

// ---- binding resolution ----

function skuVal(field: string, ctx: ResolveCtx, idx: number): string {
  const r = ctx.skuRows[idx] || ctx.skuRows[0] || {}
  const x = (r as Sku)[field]
  if (x == null) return ''
  if (field === 'price') return fmtPrice(x)
  return String(x)
}

function shopVal(field: string, ctx: ResolveCtx): string {
  const s = ctx.shop
  if (!s) return ''
  const v = s[field]
  return v == null ? '' : String(v)
}

function bindVal(binding: string, ctx: ResolveCtx, idx: number): string {
  if (binding && binding.indexOf('shop.') === 0) return shopVal(binding.slice(5), ctx)
  return skuVal(binding, ctx, idx)
}

/** Resolve an element to its displayed string for row `idx`. */
export function resolveValue(el: El, ctx: ResolveCtx, idx: number): string {
  if (el.type === 'text' || el.type === 'price') {
    let raw: string
    if (el.binding) raw = bindVal(el.binding, ctx, idx)
    else if (el.type === 'price') raw = el.text != null && el.text !== '' ? fmtPrice(el.text) : ''
    else raw = el.text != null ? String(el.text) : ''
    if (el.type === 'price') raw = (el.prefix || '') + raw + (el.suffix || '')
    return raw
  }
  if (el.type === 'barcode' || el.type === 'qr') {
    const v = el.binding ? bindVal(el.binding, ctx, idx) : el.value
    return v || ''
  }
  return ''
}

/** Built-in fallback rows (used until a real data source connects). */
export function defaultSku(): Sku[] {
  return [
    { sku: 'SKU-1001', name: 'นมสด UHT 200ml', price: 15, barcode: '885000010014', unit: 'กล่อง', pluCode: '0885000010014', catCode: '10100', catName: 'นม & ผลิตภัณฑ์นม', supplierId: 'S001', supplierName: 'บจก. เดลี่ แดรี่' },
    { sku: 'SKU-1002', name: 'น้ำดื่ม 600ml', price: 7, barcode: '885000010021', unit: 'ขวด', pluCode: '0885000010021', catCode: '10200', catName: 'เครื่องดื่ม', supplierId: 'S002', supplierName: 'บจก. น้ำใส' },
    { sku: 'SKU-1003', name: 'บะหมี่กึ่งสำเร็จรูป', price: 6, barcode: '885000010038', unit: 'ซอง', pluCode: '0885000010038', catCode: '10300', catName: 'อาหารแห้ง', supplierId: 'S003', supplierName: 'บจก. มาม่า ฟู้ด' },
  ]
}
