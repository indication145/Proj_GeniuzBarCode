# Gotchas — Print Labels & Barcodes

จุดที่พลาดง่าย / สิ่งที่ยังเป็น mock ของ **GeniuzBarCode Label Designer**

## ⚠️ Encoding ภาษาไทย — ต้อง UTF-8 (no BOM)
- UI เป็นภาษาไทยทั้งหมด **ห้ามแก้ไฟล์ด้วยเครื่องมือที่อ่าน/เขียนเป็น ANSI**
- PowerShell 5.1 `Get-Content -Raw` ดีฟอลต์ = ANSI codepage → ภาษาไทยพังเป็น mojibake (เคยเกิดจริง)
- เวลาแก้ผ่านสคริปต์ ให้ระบุ encoding ชัดเจน:
  ```powershell
  $utf8 = New-Object System.Text.UTF8Encoding($false)   # no BOM
  [System.IO.File]::WriteAllText($path, $content, $utf8)
  [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  ```
- ตรวจเร็ว ๆ: หา byte แปลก `C2 9x` = สัญญาณ mojibake; ไทยที่ถูกต้องคือ `E0 B8 xx` / `E0 B9 xx`

## ✅ ออฟไลน์ได้แล้ว — ไลบรารี/ฟอนต์ self-host ใน `vendor/`
- React/ReactDOM, JsBarcode, qrcodejs และฟอนต์ IBM Plex (woff2) อยู่ใน `vendor/` ไม่พึ่ง CDN
- รีเฟรช/อัปเวอร์ชัน: แก้เวอร์ชันใน `scripts/fetch-vendor.js` แล้ว `npm run fetch:vendor` (ดึง JS + ดึง CSS Google Fonts → download woff2 + rewrite `url()` เป็นเครื่อง)
- ถ้าเปลี่ยน path/เวอร์ชัน ต้องแก้ให้ตรงกัน **3 จุด**: `support.js` (REACT_URL/REACT_DOM_URL), head `LabelDesigner.dc.html`, และ `buildPrintHTML` (หน้าต่างพิมพ์ ใช้ `window.location.origin + '/vendor/...'` เพราะเปิดเป็น about:blank — relative path ใช้ไม่ได้)
- `vendor/**/*` ถูก commit ลง repo และอยู่ใน `pkg.assets` → `.exe` ออฟไลน์เต็มรูปแบบ
- **Babel standalone ไม่ถูกโหลด** (ไม่ใช่ dependency ออฟไลน์): logic เป็น ES class รันผ่าน `new Function` ไม่ใช่ JSX; `BABEL_URL` ใน `support.js` ยิงเฉพาะ x-import jsx ซึ่งแอปไม่มี (มี comment กำกับไว้)

## สถานะฟีเจอร์ (อัปเดต — เดิมเคยเป็น mock ตอนนี้ทำงานจริงแล้ว)
- ✅ **พิมพ์** `doPrint()` → เปิดหน้าต่างพิมพ์จริง (`buildPrintHTML` + `window.print()`), รองรับ A4 หลายดวง/ม้วนสติกเกอร์, Save-as-PDF ผ่าน dialog เบราว์เซอร์
- ✅ **บันทึกแม่แบบ** → `/api/templates` เก็บลง `templates.json` จริง (โหลด/ลบ/อัปเดต/บันทึกเป็นชื่อใหม่ + เตือนชื่อซ้ำ); เก็บรูปแบบกระดาษ (`printMedia/rollCols/rollRows`) ไปกับแม่แบบด้วย
- ✅ **ข้อมูล SKU** → `/api/skus` ดึงจริงผ่าน `dataSource.js` (REST/SQL); `defaultSku()` เหลือเป็น fallback ตอนยังไม่เชื่อมต่อ
- ✅ **เชื่อมต่อข้อมูล** → REST จริง (`/api/biz`, `/api/shops`, token cache); **PO** จริง (`/api/po`, `/api/po/lines`)

### ⚠️ ยังเป็น mock / ยังไม่ทำ (gap ปัจจุบัน — ดู [Roadmap.md](Roadmap.md))
- **ไม่มี Undo/Redo**
- **SQL Server** ใช้ได้เต็มระบบ (biz/shop/สินค้า/PO ผ่านสวิตช์ `DATA_SOURCE=sql`) — ตั้งค่าที่หน้า "ตั้งค่าเชื่อมต่อ" แท็บ SQL; **ใช้ใน `.exe` ได้ด้วย** เพราะ mssql ใช้ `tedious` (pure JS ไม่มี native `.node`) แพ็กด้วย pkg ได้ (ทดสอบแล้ว) — แค่วาง `.env` ข้าง exe ให้มี `DATA_SOURCE=sql` + `SQL_*`
- ยังต้องต่อเน็ต (CDN) — งาน self-host อยู่ใน Roadmap P2

## Babel standalone — ไม่ได้ถูกใช้จริง
- logic เป็น ES class รันตรงผ่าน `evalDcLogic`/`new Function` (ไม่มีการ transpile) → **Babel ไม่ถูกโหลด** first paint ไม่ติด Babel
- `BABEL_URL` ใน `support.js` ยังอยู่แต่ dormant (ยิงเฉพาะ x-import kind jsx ซึ่งแอปนี้ไม่มี) — ดู comment กำกับในไฟล์
- ดู [Decisions.md](Decisions.md) D1

## บาร์โค้ด / QR
- วาดหลัง mount ใน `renderBarcodes()` ลง `<canvas>`/`<div>` ผ่าน data-attributes
- มี **draw-cache**: `cv.dataset.drawn = txt+'|'+fmt+'|'+show` — ถ้าแก้ canvas เองต้องเปลี่ยน key ไม่งั้นมันข้าม
- **EAN13** ต้องเป็นตัวเลข 12–13 หลัก; ถ้าค่าไม่ถูกจะ `try/catch` fallback เป็น CODE128

## ⚠️ สร้าง HTML สตริงข้างใน data-dc-script — ต้อง escape `</script>`
- โค้ด logic อยู่ใน `<script type="text/x-dc" data-dc-script>` — HTML parser ของเบราว์เซอร์จะปิด
  script element ทันทีที่เจอ `</script>` แม้อยู่ในสตริง JS
- เวลาเขียนสตริง HTML ที่มี `</script>` (เช่น `buildPrintHTML`) **ต้องเขียนเป็น `<\/script>` ในซอร์ส**
  (ค่า runtime ยังเป็น `</script>` ถูกต้อง แต่ parser ไม่ตัด)
- ตรวจ: raw `</script>` ที่อยู่ "ข้างใน" data-dc-script ต้องเป็น **0** เสมอ

## ⚠️ พิมพ์ผ่าน popup — อาจโดน popup blocker
- `doPrint()` ใช้ `window.open()` เปิดหน้าต่างพิมพ์ — ต้องถูกเรียกจาก user click (ปุ่มพิมพ์) เท่านั้น
  ถ้าเรียกแบบ async/หน่วงเวลา เบราว์เซอร์จะบล็อก → มี toast เตือนให้อนุญาต popup
- หน้าต่างพิมพ์โหลด JsBarcode/QR + ฟอนต์จาก `vendor/` ในเครื่อง (origin-absolute `window.location.origin + '/vendor/...'` เพราะ about:blank ใช้ relative ไม่ได้) แล้วรอ `document.fonts.ready` ก่อน `window.print()`
- รูป/โลโก้ (`image`) รองรับอัปโหลดจริงแล้ว — เก็บเป็น **data URL ใน `el.src`** จึงถูกฝังลง `templates.json` ด้วย (รูปใหญ่ทำให้ไฟล์ใหญ่ → จำกัด ≤ 3MB ตอนเลือก, render ด้วย `object-fit:contain`)

## ⚠️ Secret / .env — อย่า commit
- token/API key/รหัสผ่าน SQL อยู่ใน **`.env` เท่านั้น** (gitignored) — มี `.env.example` เป็นแม่แบบ
- repo นี้เป็น public บน GitHub — ถ้า key หลุดต้อง **rotate ทันที**
- `dataSource.js` มี `.env` loader ของตัวเอง (ไม่ใช้ dotenv) — รูปแบบ `KEY=value` ต่อบรรทัด

## ⚠️ ข้อมูลจริง: ต้องรันผ่าน backend (ไม่ใช่ file://)
- `/api/skus` เสิร์ฟโดย `server.js` → ต้องเปิดด้วย `node server.js` (เปิด `.dc.html` ตรง ๆ `file://` จะ fetch ไม่ได้)
- **REST**: เบราว์เซอร์ต่อ csith ตรง ๆ ติด CORS — จึงให้ backend เป็น proxy (`source=api`) และเก็บ token ฝั่ง server
  flow: POST `/api/system/token` ต้องมี `Content-Length: 0` (ไม่งั้น HTTP 411); ได้ `AccessToken` อายุ `ExpiresIn` วิ → cache
- **SQL Server**: เบราว์เซอร์ต่อตรงไม่ได้ → `source=sql` ผ่าน backend + `npm install mssql` (เป็น optional dep, require แบบ lazy)
- ปรับ endpoint สินค้า/field mapping ได้ที่ `.env` (`CSITH_PRODUCTS_PATH`, `MAP_*`) โดยไม่ต้องแก้โค้ด

## ระบบพิกัด
- ค่าใน state เป็น **mm** ไม่ใช่ px — คูณ `PX (3.7795)` เฉพาะตอน render
- ราคา format ด้วย locale `th-TH` ใน `skuVal()` (มีคอมมา) — อย่าเอาค่า formatted ไปคำนวณต่อ

## Git / Windows
- **commit message ที่มี double-quote** จะถูก PowerShell 5.1 ตัด/เพี้ยนตอนส่งให้ git → ใช้ข้อความไม่มี `"` หรือ here-string เดี่ยว
- เห็น warning `LF will be replaced by CRLF` ตอน commit เป็นเรื่องปกติของ autocrlf บน Windows
- ชื่อไฟล์หลักคือ `LabelDesigner.dc.html` (ไม่มีเว้นวรรค) — `index.html` ชี้ไปไฟล์นี้ ถ้า rename ต้องแก้ `index.html` ด้วย

## Theme
- `accentColor` / `canvasMood` / `labelStock` ตั้งผ่าน **data-props ของ dc component เท่านั้น**
- standalone ไม่มี UI สลับ — ใช้ค่า fallback ใน `renderVals()` (`accentColor ?? '#7b1fa2'`)
