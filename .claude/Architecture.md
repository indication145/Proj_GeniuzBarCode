# Architecture — Print Labels & Barcodes

ระบบ **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย / บาร์โค้ด) เป็น **React SPA (Vite + TypeScript)**
หน้าบ้านอยู่ใน `web/` + backend Node ล้วน (`server.js`) เป็น static server + API proxy
แพ็กเป็น `.exe` เดียวด้วย pkg (bundle `web/dist` เข้าไป) ทำงานออฟไลน์ได้

> ก่อนหน้านี้เป็น Claude Design `.dc.html` + dc-runtime — ย้ายมา Vite แล้ว ดู [Migration-Vite.md](Migration-Vite.md) · [Decisions.md](Decisions.md) D9

## ไฟล์ในโปรเจกต์

| ไฟล์ / โฟลเดอร์ | หน้าที่ |
|------|---------|
| `web/` | React app (Vite + TS) — source ใน `web/src`, build ออก `web/dist` |
| `server.js` | Node ล้วน: เสิร์ฟ `web/dist` (static) + `/api/*` proxy; พอร์ต 8080 |
| `dataSource.js` | data layer REST(csith)/SQL(mssql) + `.env` loader |
| `templates.js` | เก็บ/อ่านแม่แบบลง `templates.json` |
| `scripts/build-exe.js` | `vite build` → ฝัง icon → pkg → `dist/Geniuz_Barcode.exe` |
| `run.bat` | เปิดจาก source (build web ครั้งแรก แล้ว `node server.js`) |

## โครงสร้าง `web/src`

```
main.tsx            entry — import @fontsource (offline) + render <App/>
App.tsx             shell: Header + NavRail + สลับ view + Toast
store/useStore.ts   Zustand store ก้อนเดียว: ui · theme · header · editor · data · po
theme/useApplyAccent.ts   ดัน accent → CSS var --accent* ที่ :root
lib/                framework-agnostic (มี vitest):
  units · elements · snap · theme · print · printDoc · barcode · api · types
views/              SettingsView · PrintView · DesignView
components/          Header NavRail Toast · Canvas ElementBox BarcodeCanvas QrBox
                    LabelPreview Inspector DesignSidebar PoModal ScanResultsModal
```

## Runtime flow (dev / prod)

```
DEV:  node server.js (API :8080)  +  cd web && npm run dev (Vite :5173, proxy /api → 8080)
PROD: npm run build:exe → dist/Geniuz_Barcode.exe → รัน → server.js เสิร์ฟ web/dist ที่ :8080
```

- ไลบรารี (React/jsbarcode/qrcode) + ฟอนต์ IBM Plex ถูก **bundle โดย Vite** ไม่พึ่ง CDN → ออฟไลน์
- บาร์โค้ด/QR วาดผ่าน `barcode.ts` (`jsbarcode`/`qrcode` npm) ลง `<canvas>` ใน component

## State (Zustand — `store/useStore.ts`)

| slice | ฟิลด์หลัก |
|---|---|
| ui | `view`, `toast*` |
| theme | `accent/mood/stock` (+ localStorage `ge_*`) |
| header | `bizList/bizId/shopList/shop/connMode/connStatus` |
| editor | `labelName/W/H/bg/elements/printMedia/roll* · selectedId/zoom/pan/guides · savedTemplates` |
| data | `skuRows/skuSel/copiesMap/useQty/scan*` |
| po | `poOpen/poList/poFg/poSearch` |

## ระบบพิกัด
- ตำแหน่ง/ขนาด element เก็บเป็น **มิลลิเมตร (mm)**; แปลงเป็น px ด้วย `PX = 3.7795` (`lib/units.ts`)
- canvas ใช้ CSS transform `translate(panX,panY) scale(zoom)`

### Element types
`text` · `price` · `barcode` · `qr` · `image` · `frame` — แต่ละชนิดมี `x,y,w,h` (mm) + props เฉพาะ (ดู `lib/elements.ts` `defaultsFor`)

### Data binding
ผูกฟิลด์ SKU: `name` · `price` · `barcode` · `sku` · `unit` · `shop.*` → `resolveValue()` แทนค่าตามแถว SKU

## Theme
- accent 5 สี + canvas mood (studio/blueprint/spotlight/paper) + label stock (plain/cream/kraft/thermal)
- ตั้งจากหน้า Settings → เก็บ localStorage → ใช้ผ่าน CSS var `--accent*` (ไม่ hardcode สีแล้ว)

## พิมพ์ (offline, ไม่มี vendor)
`lib/printDoc.ts` pre-render บาร์โค้ด/QR เป็น **PNG data-URL** + ฝัง `@font-face` จากแอป → เปิด popup เป็น HTML ล้วน → `window.print()` (รองรับ A4 หลายดวง / ม้วน / Save-as-PDF)
