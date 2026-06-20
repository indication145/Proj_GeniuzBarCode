// Typed wrappers over the server.js JSON API. Same contract as the dc app —
// server.js + dataSource.js are untouched by the migration.
import type { Sku } from './types'

export interface ApiOk {
  ok: boolean
  error?: string
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  return (await r.json()) as T
}
async function send<T>(url: string, method: 'POST' | 'DELETE', body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return (await r.json()) as T
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? '?' + s : ''
}

// ---- shapes (loose where dataSource maps dynamically) ----
export type Row = Record<string, unknown>
export interface SqlConfig {
  host?: string
  port?: string
  database?: string
  user?: string
  hasPassword?: boolean
  driverReady?: boolean
}
export interface AppConfig {
  baseUrl?: string
  apiKeyMask?: string
  hasApiKey?: boolean
  dataSource?: 'api' | 'sql'
  bizId?: string
  sql?: SqlConfig
}

// ---- endpoints ----
export const health = () => getJson<ApiOk>('/api/health')

export const getConfig = () => getJson<{ ok: boolean; config: AppConfig }>('/api/config')
export const saveConfig = (body: unknown) => send<{ ok: boolean; changed: string[]; config: AppConfig }>('/api/config', 'POST', body)

export const getBiz = () => getJson<{ ok: boolean; rows: Row[]; current: string }>('/api/biz')
export const setBiz = (bizId: string | number) => send<{ ok: boolean; bizId: string }>('/api/biz', 'POST', { bizId })

export const getShops = (bizId?: string) => getJson<{ ok: boolean; rows: Row[]; count: number; bizId: string }>('/api/shops' + qs({ bizId }))

export const getSkus = (opts: { source?: 'api' | 'sql'; fg?: string; code?: string } = {}) =>
  getJson<{ ok: boolean; source: string; count: number; rows: Sku[]; error?: string }>('/api/skus' + qs(opts))

export const getPo = (opts: { fg?: string; code?: string } = {}) => getJson<{ ok: boolean; rows: Row[]; count: number }>('/api/po' + qs(opts))
export const getPoLines = (doc: string) => getJson<{ ok: boolean; rows: Row[]; count: number; doc: string }>('/api/po/lines' + qs({ doc }))

export const listTemplates = () => getJson<{ ok: boolean; rows: Row[] }>('/api/templates')
export const getTemplate = (id: string) => getJson<{ ok: boolean; template: Row }>('/api/templates' + qs({ id }))
export const saveTemplate = (t: { id?: string; name: string; design: unknown }) => send<{ ok: boolean; id: string; name: string }>('/api/templates', 'POST', t)
export const deleteTemplate = (id: string) => send<ApiOk>('/api/templates' + qs({ id }), 'DELETE')
