// Theme: accent colour derivation + canvas mood / label stock presets + the
// localStorage persistence used by the in-app theme switcher.
// Ported from LabelDesigner.dc.html (accentVars, _moods/_stocks, ge_* keys).

export interface AccentVars {
  base: string
  soft: string
  softBorder: string
  dark: string
  text: string
  shadow: string
}

/** Derive accent shades from a hex (#rgb or #rrggbb). */
export function accentVars(hex: string): AccentVars {
  let h = (hex || '#7b1fa2').replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`
  const dk = (f: number) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`
  return { base: '#' + h, soft: rgba(0.1), softBorder: rgba(0.3), dark: dk(0.84), text: dk(0.74), shadow: rgba(0.34) }
}

export const ACCENT_CHOICES = ['#7b1fa2', '#2563EB', '#0E9F6E', '#7C3AED', '#3F3F46'] as const

export type Mood = 'studio' | 'blueprint' | 'spotlight' | 'paper'
export type Stock = 'plain' | 'cream' | 'kraft' | 'thermal'

export interface MoodPreset {
  color: string
  img: string
  size: string
  shadow: string
}

export const MOODS: Record<Mood, MoodPreset> = {
  studio: { color: '#DEDBD6', img: 'radial-gradient(#cfcbc4 1px,transparent 1px)', size: '22px 22px', shadow: '0 8px 40px rgba(0,0,0,0.16)' },
  blueprint: { color: '#0e2a44', img: 'linear-gradient(rgba(120,200,255,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(120,200,255,.18) 1px,transparent 1px)', size: '24px 24px', shadow: '0 0 0 1px rgba(130,200,255,.55),0 14px 50px rgba(0,0,0,0.55)' },
  spotlight: { color: '#dddad5', img: 'radial-gradient(circle at 50% 36%,#fcfbfa,#d2cfca 76%)', size: '100% 100%', shadow: '0 26px 70px rgba(0,0,0,0.30),0 4px 14px rgba(0,0,0,0.12)' },
  paper: { color: '#e7e1d6', img: 'radial-gradient(rgba(120,105,80,.14) 1px,transparent 1px)', size: '20px 20px', shadow: '0 10px 38px rgba(60,45,20,0.20)' },
}

export const STOCKS: Record<Stock, string> = {
  plain: 'none',
  cream: 'radial-gradient(circle at 50% 28%,rgba(255,244,214,.55),rgba(255,244,214,0) 72%)',
  kraft: 'linear-gradient(rgba(150,110,60,.17),rgba(120,85,45,.17)),repeating-linear-gradient(45deg,rgba(120,85,45,.06) 0 3px,transparent 3px 6px)',
  thermal: 'linear-gradient(180deg,rgba(205,228,245,.55),rgba(255,255,255,0) 42%)',
}

export interface ThemePrefs {
  accent: string | null
  mood: Mood | null
  stock: Stock | null
  dark: boolean | null
}

const K = { accent: 'ge_accent', mood: 'ge_mood', stock: 'ge_stock', dark: 'ge_dark' } as const

function lsGet(k: string): string | null {
  try {
    return globalThis.localStorage?.getItem(k) ?? null
  } catch {
    return null
  }
}
function lsSet(k: string, v: string): void {
  try {
    globalThis.localStorage?.setItem(k, v)
  } catch {
    /* ignore (private mode / no storage) */
  }
}

/** Read saved overrides (null = not set → caller falls back to defaults). */
export function loadTheme(): ThemePrefs {
  const d = lsGet(K.dark)
  return {
    accent: lsGet(K.accent),
    mood: lsGet(K.mood) as Mood | null,
    stock: lsGet(K.stock) as Stock | null,
    dark: d == null ? null : d === '1',
  }
}

export const saveAccent = (hex: string) => lsSet(K.accent, hex)
export const saveMood = (m: Mood) => lsSet(K.mood, m)
export const saveStock = (s: Stock) => lsSet(K.stock, s)
export const saveDark = (on: boolean) => lsSet(K.dark, on ? '1' : '0')
