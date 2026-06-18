# Architecture — Print Labels & Barcodes

ระบบ **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย / บาร์โค้ด) เป็นเว็บแอปหน้าเดียว (SPA)
ที่ build จาก Claude Design component format (`.dc.html`) ทำงานแบบ self-contained ในเบราว์เซอร์

## ไฟล์ในโปรเจกต์

| ไฟล์ | หน้าที่ |
|------|---------|
| `LabelDesigner.dc.html` | ตัวแอปทั้งหมด — template (`<x-dc>`) + logic (`<script data-dc-script>`) |
| `support.js` | dc-runtime (GENERATED จาก dc-runtime/src/*.ts) — parser + React renderer |
| `index.html` | จุดเข้า redirect ไป `LabelDesigner.dc.html` (เลี่ยงชื่อไฟล์มีเว้นวรรค) |
| `server.js` | static file server เขียนด้วย Node ล้วน ไม่มี dependency |
| `run.bat` | ตัวเปิดแบบดับเบิลคลิก (Node → fallback Python) |

## Runtime flow

```
เปิด LabelDesigner.dc.html
  └─ <script src="./support.js">  (dc-runtime)
       1. โหลด React 18.3.1 + ReactDOM + Babel standalone จาก unpkg (CDN)
       2. parse <x-dc> template + data-dc-script
       3. mount บน DOMContentLoaded → render React tree เข้า rootRef
  └─ <helmet> โหลด JsBarcode 3.11.6 (jsdelivr) + qrcodejs 1.0.0 (cloudflare)
                + ฟอนต์ IBM Plex Sans Thai / IBM Plex Mono (Google Fonts)
```

> ดู [Gotchas.md](Gotchas.md) — ทุกอย่างพึ่ง CDN จึงต้องต่อเน็ต

## โครงสร้างโค้ดในตัวแอป

### Template (`<x-dc>`)
HTML + binding syntax ของ dc-runtime:
- `{{ expr }}` — ผูกค่า/สไตล์/อีเวนต์จาก `renderVals()`
- `<sc-for list="{{ }}" as="x">` — loop
- `<sc-if value="{{ }}">` — conditional

Layout 3 คอลัมน์ + header + print modal — ดู [Design.md](Design.md)

### Logic (`class Component extends DCLogic`)
- **`state`** — single source of truth (ดู State ด้านล่าง)
- **`renderVals()`** — แปลง state → props/styles ทั้งหมดที่ template ใช้ (เรียกทุก render)
- **`elView(el, idx)`** — แปลง element 1 ตัว → style + ค่าที่ resolve แล้ว
- **`resolve(el, idx)`** / **`skuVal(field, idx)`** — data binding กับแถว SKU
- **`renderBarcodes()`** — วาด JsBarcode/QR ลง canvas หลัง mount (มี draw-cache ด้วย `dataset.drawn`)
- **`accentVars(hex)`** — derive เฉดสี (base / soft / dark / text / shadow) จากสี accent

### ระบบพิกัด
- ทุกตำแหน่ง/ขนาด element เก็บเป็น **มิลลิเมตร (mm)**
- แปลงเป็น pixel ด้วยค่าคงที่ `PX = 3.7795` (px ต่อ mm ที่ 96dpi)
- canvas ใช้ CSS transform `translate(panX,panY) scale(zoom)`

## State (โครงสร้างหลัก)

```
labelName, labelW, labelH, bg          // ป้าย
elements[]                              // องค์ประกอบบนป้าย
selectedId, tool, guides[]             // การเลือก/แก้ไข
zoom, panX, panY, spaceHeld            // viewport
skuRows[], activeSku                   // ข้อมูล SKU (mock)
printOpen, printMedia, printCopies, skuSel, printing   // การพิมพ์
connOpen, connMode(api|sql), connStatus                // การเชื่อมต่อ (mock)
toast
```

### Element types
`text` · `price` · `barcode` · `qr` · `image` · `frame`
แต่ละชนิดมี `x,y,w,h` (mm) + props เฉพาะ (เช่น `fontSize/weight/align/color/binding`,
`value/format/showText`, `border/radius`) — ดูเต็มใน `defaultsFor()`

### Data binding
element ผูกกับฟิลด์ SKU ได้: `name` · `price` · `barcode` · `sku` · `unit`
→ `resolve()` แทนค่าตามแถว SKU ที่ active (ราคาฟอร์แมต locale `th-TH`)

## Theme (ผ่าน data-props ของ dc component)
- `accentColor` (default `#7b1fa2` ม่วงเข้ม)
- `canvasMood`: studio | blueprint | spotlight | paper
- `labelStock`: plain | cream | kraft | thermal

> standalone (รันเอง) ไม่มี UI สลับ theme — ใช้ค่า fallback ใน `renderVals()`
> ดู [Decisions.md](Decisions.md)
