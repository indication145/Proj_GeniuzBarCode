// App store (Zustand). Phase 3 covers the shell: view switching, toast, theme,
// and header data (biz/shop/connection). Editor + print slices arrive in Phase 4.
import { create } from 'zustand'
import * as api from '@/lib/api'
import type { Row } from '@/lib/api'
import { loadTheme, saveAccent, saveMood, saveStock, type Mood, type Stock } from '@/lib/theme'
import type { Shop } from '@/lib/types'

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

export type Store = UiSlice & ThemeSlice & HeaderSlice

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
}))

export { pick }
