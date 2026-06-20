// App store (Zustand). Phase 3 covers the shell: view switching, toast, theme,
// and header data (biz/shop/connection). Editor + print slices arrive in Phase 4.
import { create } from 'zustand'
import * as api from '@/lib/api'
import type { Row } from '@/lib/api'
import { loadTheme, saveAccent, saveMood, saveStock, type Mood, type Stock } from '@/lib/theme'
import { tplPriceTag } from '@/lib/elements'
import type { El, LabelDoc, PrintMedia, Sku, Shop } from '@/lib/types'

export type View = 'design' | 'print' | 'settings'
export type ConnStatus = 'connected' | 'offline' | 'checking'

interface UiSlice {
  view: View
  setView: (v: View) => void
  toastMsg: string
  toastOn: boolean
  toast: (msg: string) => void
}

interface ThemeSlice {
  accent: string
  mood: Mood
  stock: Stock
  setAccent: (hex: string) => void
  setMood: (m: Mood) => void
  setStock: (s: Stock) => void
  initTheme: () => void
}

interface HeaderSlice {
  connMode: 'api' | 'sql'
  setConnMode: (m: 'api' | 'sql') => void
  connStatus: ConnStatus
  bizList: Row[]
  bizId: string
  shopList: Row[]
  shopId: string
  shop: Shop
  loadHeader: () => Promise<void>
  selectBiz: (id: string) => Promise<void>
  selectShop: (id: string) => void
  loadShops: () => Promise<void>
}

interface EditorSlice {
  labelName: string
  labelW: number
  labelH: number
  bg: string
  elements: El[]
  printMedia: PrintMedia
  rollCols: number
  rollRows: number
  templateId: string
  setPrintMedia: (m: PrintMedia) => void
  bumpRoll: (which: 'cols' | 'rows', delta: number) => void
  bootTemplates: () => Promise<void>
  /** the slice the pure print/preview builders consume */
  doc: () => LabelDoc
}

interface DataSlice {
  skuRows: Sku[]
  activeSku: number
  skuSel: Record<number, boolean>
  copiesMap: Record<number, number>
  useQty: boolean
  printCopies: number
  skuFg: string
  scanCode: string
  scanResults: Sku[]
  scanResultsOpen: boolean
  setScanCode: (v: string) => void
  setSkuFg: (v: string) => void
  setUseQty: (v: boolean) => void
  toggleSel: (i: number) => void
  copiesFor: (i: number) => number
  setCopies: (i: number, n: number) => void
  addByCode: () => Promise<void>
  addAllResults: () => void
  closeScanResults: () => void
  appendSku: (p: Sku) => void
  removeRow: (i: number) => void
  clearGrid: () => void
  selectedIndices: () => number[]
  printCount: () => number
}

interface PoSlice {
  poOpen: boolean
  poList: Row[]
  poFg: string
  poSearch: string
  poBusy: boolean
  setPoFg: (v: string) => void
  setPoSearch: (v: string) => void
  openPo: () => void
  closePo: () => void
  loadPo: () => Promise<void>
  usePo: (doc: string) => Promise<void>
}

export type Store = UiSlice & ThemeSlice & HeaderSlice & EditorSlice & DataSlice & PoSlice

let toastTimer: ReturnType<typeof setTimeout> | undefined

// helpers to read id/name from case-varying API rows
const pick = (r: Row, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()]
    if (v != null && v !== '') return String(v)
  }
  return ''
}

export const useStore = create<Store>((set, get) => ({
  // ---- ui ----
  view: 'design',
  setView: (view) => set({ view }),
  toastMsg: '',
  toastOn: false,
  toast: (msg) => {
    set({ toastMsg: msg, toastOn: true })
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toastOn: false }), 2600)
  },

  // ---- theme ---- (default applied here; localStorage overrides via initTheme)
  accent: '#7b1fa2',
  mood: 'studio',
  stock: 'plain',
  setAccent: (hex) => {
    saveAccent(hex)
    set({ accent: hex })
  },
  setMood: (m) => {
    saveMood(m)
    set({ mood: m })
  },
  setStock: (s) => {
    saveStock(s)
    set({ stock: s })
  },
  initTheme: () => {
    const t = loadTheme()
    const patch: Partial<ThemeSlice> = {}
    if (t.accent) patch.accent = t.accent
    if (t.mood) patch.mood = t.mood
    if (t.stock) patch.stock = t.stock
    if (Object.keys(patch).length) set(patch)
  },

  // ---- header ----
  connMode: 'api',
  setConnMode: (m) => set({ connMode: m }),
  connStatus: 'checking',
  bizList: [],
  bizId: '',
  shopList: [],
  shopId: '',
  shop: null,
  loadHeader: async () => {
    try {
      const cfg = await api.getConfig()
      set({ connMode: cfg.config?.dataSource === 'sql' ? 'sql' : 'api' })
      const biz = await api.getBiz()
      set({ bizList: biz.rows || [], bizId: (biz.current || '') + '', connStatus: 'connected' })
      await get().loadShops()
    } catch {
      set({ connStatus: 'offline' })
    }
  },
  loadShops: async () => {
    try {
      const r = await api.getShops()
      const rows = r.rows || []
      const cur = rows[0] || null
      set({ shopList: rows, shop: cur, shopId: cur ? pick(cur, 'shopId') : '' })
    } catch {
      /* leave as-is */
    }
  },
  selectBiz: async (id) => {
    set({ bizId: id })
    if (!id) return
    try {
      await api.setBiz(id)
      set({ shopList: [], shop: null, shopId: '' })
      await get().loadShops()
      get().toast('ตั้งค่าธุรกิจ bizId=' + id + ' แล้ว')
    } catch {
      get().toast('บันทึก bizId ไม่สำเร็จ')
    }
  },
  selectShop: (id) => {
    const s = get().shopList.find((x) => pick(x, 'shopId') === id) || null
    set({ shopId: id, shop: s })
    if (s) get().toast('ใช้ข้อมูลร้าน "' + pick(s, 'shopName', 'shopId') + '"')
  },

  // ---- editor (shared with Design) ----
  labelName: 'ป้ายราคาสินค้า',
  labelW: 50,
  labelH: 30,
  bg: '#ffffff',
  elements: tplPriceTag(50, 30),
  printMedia: 'a4',
  rollCols: 3,
  rollRows: 1,
  templateId: '',
  setPrintMedia: (m) => set({ printMedia: m }),
  bumpRoll: (which, delta) => {
    const k = which === 'cols' ? 'rollCols' : 'rollRows'
    set({ [k]: Math.max(1, Math.min(12, get()[k] + delta)) } as Partial<Store>)
  },
  bootTemplates: async () => {
    try {
      const list = await api.listTemplates()
      const first = (list.rows || [])[0]
      if (!first) return
      const r = await api.getTemplate(String(first.id))
      const t = r.template as { id?: string; name?: string; design?: Record<string, unknown> }
      const d = t.design || {}
      set({
        templateId: String(t.id || ''),
        labelName: String(t.name || d.labelName || 'แม่แบบ'),
        labelW: Number(d.labelW) || 50,
        labelH: Number(d.labelH) || 30,
        bg: String(d.bg || '#ffffff'),
        elements: Array.isArray(d.elements) ? (d.elements as El[]) : get().elements,
        printMedia: d.printMedia === 'roll' ? 'roll' : 'a4',
        rollCols: Number(d.rollCols) || 3,
        rollRows: Number(d.rollRows) || 1,
      })
    } catch {
      /* keep default template */
    }
  },
  doc: () => {
    const s = get()
    return { labelName: s.labelName, labelW: s.labelW, labelH: s.labelH, bg: s.bg, elements: s.elements, printMedia: s.printMedia, rollCols: s.rollCols, rollRows: s.rollRows }
  },

  // ---- data / grid ----
  skuRows: [],
  activeSku: 0,
  skuSel: {},
  copiesMap: {},
  useQty: false,
  printCopies: 1,
  skuFg: '2',
  scanCode: '',
  scanResults: [],
  scanResultsOpen: false,
  setScanCode: (v) => set({ scanCode: v }),
  setSkuFg: (v) => set({ skuFg: v }),
  setUseQty: (v) => set({ useQty: v }),
  toggleSel: (i) => set((s) => ({ skuSel: { ...s.skuSel, [i]: s.skuSel[i] === false } })),
  copiesFor: (i) => {
    const s = get()
    const o = s.copiesMap[i]
    if (o != null) return Math.max(0, Math.round(Number(o) || 0))
    if (s.useQty) return Math.max(0, Math.round(Number(s.skuRows[i]?.qty) || 0))
    return Math.max(1, s.printCopies)
  },
  setCopies: (i, n) => set((s) => ({ copiesMap: { ...s.copiesMap, [i]: Math.max(0, Math.round(n)) } })),
  appendSku: (p) => {
    const s = get()
    const exist = s.skuRows.findIndex((r) => r.sku === p.sku && r.barcode === p.barcode)
    if (exist >= 0) {
      get().setCopies(exist, get().copiesFor(exist) + 1)
      set({ activeSku: exist })
      return
    }
    const skuRows = [...s.skuRows, p]
    const idx = skuRows.length - 1
    set({ skuRows, copiesMap: { ...s.copiesMap, [idx]: 1 }, activeSku: idx })
  },
  addByCode: async () => {
    const s = get()
    const code = s.scanCode.trim()
    if (!code) return
    set({ scanCode: '' })
    try {
      const j = await api.getSkus({ source: s.connMode, fg: s.skuFg, code })
      const rows = j.ok ? j.rows || [] : []
      if (!rows.length) {
        get().toast('ไม่พบสินค้า "' + code + '"')
        return
      }
      if (rows.length === 1) {
        get().appendSku(rows[0])
        get().toast('เพิ่ม ' + (rows[0].sku || rows[0].name))
        return
      }
      set({ scanResults: rows, scanResultsOpen: true })
    } catch (e) {
      get().toast('ค้นหาไม่สำเร็จ: ' + ((e as Error)?.message || e))
    }
  },
  addAllResults: () => {
    const s = get()
    const skuRows = [...s.skuRows]
    const cm = { ...s.copiesMap }
    for (const p of s.scanResults) {
      const exist = skuRows.findIndex((r) => r.sku === p.sku && r.barcode === p.barcode)
      if (exist >= 0) cm[exist] = (cm[exist] ?? 1) + 1
      else {
        skuRows.push(p)
        cm[skuRows.length - 1] = 1
      }
    }
    const n = s.scanResults.length
    set({ skuRows, copiesMap: cm, scanResults: [], scanResultsOpen: false, activeSku: skuRows.length - 1 })
    get().toast('เพิ่ม ' + n + ' รายการ')
  },
  closeScanResults: () => set({ scanResults: [], scanResultsOpen: false }),
  removeRow: (i) => {
    const s = get()
    const skuRows = s.skuRows.filter((_, k) => k !== i)
    const cm: Record<number, number> = {}
    let k = 0
    s.skuRows.forEach((_, old) => {
      if (old === i) return
      if (s.copiesMap[old] != null) cm[k] = s.copiesMap[old]
      k++
    })
    set({ skuRows, copiesMap: cm, activeSku: Math.max(0, Math.min(skuRows.length - 1, s.activeSku)) })
  },
  clearGrid: () => {
    set({ skuRows: [], copiesMap: {}, skuSel: {}, activeSku: 0 })
    get().toast('ล้างรายการแล้ว')
  },
  selectedIndices: () => get().skuRows.map((_, i) => i).filter((i) => get().skuSel[i] !== false),
  printCount: () => get().selectedIndices().reduce((a, i) => a + get().copiesFor(i), 0),

  // ---- PO ----
  poOpen: false,
  poList: [],
  poFg: '1',
  poSearch: '',
  poBusy: false,
  setPoFg: (v) => set({ poFg: v }),
  setPoSearch: (v) => set({ poSearch: v }),
  openPo: () => {
    set({ poOpen: true })
    void get().loadPo()
  },
  closePo: () => set({ poOpen: false }),
  loadPo: async () => {
    set({ poBusy: true })
    try {
      const j = await api.getPo({ fg: get().poFg, code: get().poSearch.trim() })
      set({ poList: j.rows || [], poBusy: false })
    } catch {
      set({ poBusy: false })
      get().toast('โหลดใบสั่งซื้อไม่สำเร็จ')
    }
  },
  usePo: async (docNo) => {
    try {
      const j = await api.getPoLines(docNo)
      const rows = (j.rows || []) as Sku[]
      if (!rows.length) {
        get().toast('ใบสั่งซื้อนี้ไม่มีรายการ')
        return
      }
      const cm: Record<number, number> = {}
      rows.forEach((r, i) => {
        cm[i] = Math.max(1, Math.round(Number(r.qty) || 1))
      })
      set({ skuRows: rows, copiesMap: cm, skuSel: {}, activeSku: 0, useQty: true, poOpen: false })
      get().toast('โหลด ' + rows.length + ' รายการจากใบสั่งซื้อ')
    } catch (e) {
      get().toast('โหลดรายการ PO ไม่สำเร็จ: ' + ((e as Error)?.message || e))
    }
  },
}))

export { pick }
