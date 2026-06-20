import { describe, it, expect } from 'vitest'
import { PX, mmToPx, pxToMm, snapHalf, fmtPrice, num } from './units'
import { accentVars, MOODS, STOCKS, ACCENT_CHOICES } from './theme'
import { mkEl, tplPriceTag, tplSticker, tplQr, resolveValue, defaultSku } from './elements'
import { snapMove, alignBox } from './snap'
import { buildPrintHTML, esc } from './print'
import type { El, LabelDoc, ResolveCtx } from './types'

describe('units', () => {
  it('mm <-> px round trips via PX', () => {
    expect(mmToPx(10)).toBeCloseTo(10 * PX)
    expect(pxToMm(mmToPx(7.5))).toBeCloseTo(7.5)
  })
  it('snapHalf rounds to 0.5mm', () => {
    expect(snapHalf(3.24)).toBe(3)
    expect(snapHalf(3.26)).toBe(3.5)
  })
  it('fmtPrice always 2 decimals with grouping', () => {
    expect(fmtPrice(15)).toBe('15.00')
    expect(fmtPrice(1234.5)).toBe('1,234.50')
    expect(fmtPrice('abc')).toBe('abc') // non-numeric passthrough
  })
  it('num parses with fallback', () => {
    expect(num('12.5', 0)).toBe(12.5)
    expect(num('', 4)).toBe(4)
    expect(num('x', 9)).toBe(9)
  })
})

describe('theme', () => {
  it('accentVars derives shades from hex', () => {
    const a = accentVars('#7b1fa2')
    expect(a.base).toBe('#7b1fa2')
    expect(a.soft).toBe('rgba(123,31,162,0.1)')
    expect(a.dark).toMatch(/^rgb\(/)
  })
  it('expands 3-digit hex', () => {
    expect(accentVars('#abc').base).toBe('#aabbcc')
  })
  it('has presets for every choice/mood/stock key', () => {
    expect(ACCENT_CHOICES.length).toBe(5)
    expect(Object.keys(MOODS)).toEqual(['studio', 'blueprint', 'spotlight', 'paper'])
    expect(Object.keys(STOCKS)).toEqual(['plain', 'cream', 'kraft', 'thermal'])
  })
})

describe('elements', () => {
  it('mkEl centers when x/y omitted', () => {
    const el = mkEl('text', 50, 30)
    expect(el.x).toBeGreaterThanOrEqual(0)
    expect(el.y).toBeGreaterThanOrEqual(0)
    expect(el.type).toBe('text')
    expect(el.id).toMatch(/^el\d+_/)
  })
  it('mkEl honors overrides', () => {
    const el = mkEl('barcode', 50, 30, { x: 4, y: 20, format: 'EAN13' })
    expect(el.x).toBe(4)
    expect(el.format).toBe('EAN13')
  })
  it('templates produce expected element counts', () => {
    expect(tplPriceTag(50, 30)).toHaveLength(4)
    expect(tplSticker(100, 50)).toHaveLength(6)
    expect(tplQr(40, 30)).toHaveLength(5)
  })
  it('resolveValue: price binding is formatted', () => {
    const ctx: ResolveCtx = { skuRows: defaultSku() }
    const price = mkEl('price', 50, 30, { binding: 'price' })
    expect(resolveValue(price, ctx, 0)).toBe('15.00') // SKU-1001 price 15
  })
  it('resolveValue: text binding reads the row field', () => {
    const ctx: ResolveCtx = { skuRows: defaultSku() }
    const t = mkEl('text', 50, 30, { binding: 'name' })
    expect(resolveValue(t, ctx, 1)).toBe('น้ำดื่ม 600ml')
  })
  it('resolveValue: price prefix/suffix applied', () => {
    const ctx: ResolveCtx = { skuRows: [{ price: 9 }] }
    const p = mkEl('price', 50, 30, { binding: 'price', prefix: '฿', suffix: '-' })
    expect(resolveValue(p, ctx, 0)).toBe('฿9.00-')
  })
  it('resolveValue: shop.* binding', () => {
    const ctx: ResolveCtx = { skuRows: [{}], shop: { shopName: 'LOFT SD' } }
    const t = mkEl('text', 50, 30, { binding: 'shop.shopName' })
    expect(resolveValue(t, ctx, 0)).toBe('LOFT SD')
  })
})

describe('snap', () => {
  const mk = (over: Partial<El>): El => mkEl('text', 50, 30, over)
  it('snaps element centre to label centre (both axes)', () => {
    const el = mk({ w: 10, h: 6 })
    // label 50x30 → centres 25,15 → element x=20,y=12 puts its centre on label centre
    const r = snapMove(el, 20.1, 12.1, 50, 30, [])
    expect(r.x).toBe(20)
    expect(r.y).toBe(12)
    expect(r.guides).toEqual([
      { axis: 'v', pos: 25 },
      { axis: 'h', pos: 15 },
    ])
  })
  it('snaps left edge to sibling left edge', () => {
    const el = mk({ id: 'a', w: 10, h: 6 })
    const sib = mk({ id: 'b', x: 8, y: 2, w: 12, h: 6 })
    const r = snapMove(el, 8.2, 25, 50, 30, [el, sib])
    expect(r.x).toBe(8) // snapped to sibling left
    expect(r.guides.some((g) => g.axis === 'v' && g.pos === 8)).toBe(true)
  })
  it('falls back to 0.5mm grid when no snap', () => {
    const el = mk({ w: 4, h: 4 })
    const r = snapMove(el, 7.24, 9.26, 50, 30, [])
    expect(r.x).toBe(7)
    expect(r.y).toBe(9.5)
    expect(r.guides).toHaveLength(0)
  })
  it('alignBox computes label-relative positions', () => {
    const el = mk({ w: 10, h: 6 })
    expect(alignBox(el, 'left', 50, 30)).toEqual({ x: 0 })
    expect(alignBox(el, 'right', 50, 30)).toEqual({ x: 40 })
    expect(alignBox(el, 'hcenter', 50, 30)).toEqual({ x: 20 })
    expect(alignBox(el, 'bottom', 50, 30)).toEqual({ y: 24 })
    expect(alignBox(el, 'vmiddle', 50, 30)).toEqual({ y: 12 })
  })
})

describe('print', () => {
  const doc: LabelDoc = {
    labelName: 'M&M2*1',
    labelW: 40,
    labelH: 30,
    bg: '#ffffff',
    elements: [
      mkEl('price', 40, 30, { x: 3, y: 8, binding: 'price' }),
      mkEl('barcode', 40, 30, { x: 4, y: 20, binding: 'barcode' }),
    ],
    printMedia: 'a4',
    rollCols: 3,
    rollRows: 1,
  }
  const ctx: ResolveCtx = { skuRows: defaultSku() }

  it('esc escapes html-sensitive chars', () => {
    expect(esc('a&b<c>"d')).toBe('a&amp;b&lt;c&gt;&quot;d')
  })
  it('A4 build contains @page A4 + assetBase + values, escaped title', () => {
    const html = buildPrintHTML(doc, [0], ctx, { assetBase: 'http://localhost:8080' })
    expect(html).toContain('@page{size:A4;margin:8mm;}')
    expect(html).toContain('http://localhost:8080/vendor/JsBarcode.all.min.js')
    expect(html).toContain('M&amp;M2*1') // title escaped
    expect(html).toContain('15.00') // price binding resolved
    expect(html).toContain('class="bc"')
  })
  it('roll mode emits a sized @page and grid', () => {
    const html = buildPrintHTML({ ...doc, printMedia: 'roll' }, [0, 0], ctx)
    expect(html).toMatch(/@page\{size:\d+\.\d+mm \d+\.\d+mm;margin:0;\}/)
    expect(html).toContain('grid-template-columns:repeat(3,40mm)')
  })
  it('one label div per item', () => {
    const html = buildPrintHTML(doc, [0, 1, 2], ctx)
    expect((html.match(/class="label"/g) || []).length).toBe(3)
  })
})
