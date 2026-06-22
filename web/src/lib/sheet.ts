// Offline data path: download an Excel template, fill it in, import it back into
// the print grid — so labels can be printed without a REST/SQL connection.
// SheetJS is dynamically imported so it never bloats the main bundle.
import type { Sku } from './types'

/** Columns of the import/export sheet: field key, Thai header, accepted aliases. */
const COLS: { key: keyof Sku; header: string; aliases: string[] }[] = [
  { key: 'sku', header: 'รหัสสินค้า', aliases: ['sku', 'skucode', 'รหัส', 'รหัสสินค้า', 'code'] },
  { key: 'barcode', header: 'บาร์โค้ด', aliases: ['barcode', 'plucode', 'บาร์โค้ด'] },
  { key: 'name', header: 'ชื่อสินค้า', aliases: ['name', 'skudesc', 'ชื่อ', 'ชื่อสินค้า', 'description', 'desc'] },
  { key: 'price', header: 'ราคา', aliases: ['price', 'ราคา', 'sellprice', 'unitprice'] },
  { key: 'unit', header: 'หน่วย', aliases: ['unit', 'หน่วย'] },
  { key: 'catCode', header: 'รหัสหมวด', aliases: ['catcode', 'รหัสหมวด'] },
  { key: 'catName', header: 'หมวด', aliases: ['catname', 'หมวด', 'category'] },
  { key: 'supplierId', header: 'รหัสผู้ขาย', aliases: ['supplierid', 'รหัสผู้ขาย'] },
  { key: 'supplierName', header: 'ผู้ขาย', aliases: ['suppliername', 'ผู้ขาย', 'supplier'] },
  { key: 'qty', header: 'จำนวน', aliases: ['qty', 'จำนวน', 'quantity', 'amount'] },
]

const norm = (s: unknown) => String(s).trim().toLowerCase().replace(/\s+/g, '')

const aliasToKey = (() => {
  const m = new Map<string, keyof Sku>()
  for (const c of COLS) {
    m.set(norm(c.header), c.key)
    for (const a of c.aliases) m.set(norm(a), c.key)
  }
  return m
})()

/** Generate + download an .xlsx template with headers and two sample rows. */
export async function downloadTemplate(): Promise<void> {
  const XLSX = await import('xlsx')
  const header = COLS.map((c) => c.header)
  const sample = [
    ['1001', '8850000010014', 'นมสด UHT 200ml', 15, 'กล่อง', '10100', 'นม & ผลิตภัณฑ์นม', 'S001', 'บจก. เดลี่ แดรี่', 2],
    ['1002', '8850000010021', 'น้ำดื่ม 600ml', 7, 'ขวด', '10200', 'เครื่องดื่ม', 'S002', 'บจก. น้ำใส', 1],
  ]
  const ws = XLSX.utils.aoa_to_sheet([header, ...sample])
  ws['!cols'] = COLS.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'สินค้า')
  XLSX.writeFile(wb, 'geniuz-template.xlsx')
}

/** Parse an .xlsx/.xls/.csv file (first sheet) into Sku rows by header matching. */
export async function parseSkuFile(file: File): Promise<Sku[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return []
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  const out: Sku[] = []
  for (const row of raw) {
    const sku: Sku = {}
    for (const [k, v] of Object.entries(row)) {
      const field = aliasToKey.get(norm(k))
      if (!field || v === '' || v == null) continue
      if (field === 'price') {
        const n = Number(String(v).replace(/[, ]/g, ''))
        sku.price = Number.isFinite(n) ? n : String(v)
      } else if (field === 'qty') {
        sku.qty = Math.max(0, Math.round(Number(v) || 0))
      } else {
        sku[field] = String(v).trim()
      }
    }
    if (!sku.pluCode && sku.barcode) sku.pluCode = sku.barcode
    if (sku.sku || sku.name || sku.barcode) out.push(sku)
  }
  return out
}
