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

## ⚠️ ทุกอย่างพึ่ง CDN — ต้องต่อเน็ต
- React/ReactDOM/Babel (unpkg), JsBarcode (jsdelivr), qrcodejs (cloudflare), ฟอนต์ (Google Fonts)
- ออฟไลน์ = แอปไม่ขึ้น/บาร์โค้ดไม่วาด → งาน self-host อยู่ใน [Roadmap.md](Roadmap.md) P2

## ⚠️ ส่วนที่เป็น mock (ยังไม่ทำงานจริง)
- **พิมพ์** `doPrint()` = `setTimeout` + toast เฉย ๆ ไม่ได้พิมพ์/ไม่ได้สร้าง PDF จริง
- **บันทึก** `save()` = toast เฉย ๆ ไม่มี persistence (รีเฟรชแล้วหาย)
- **ข้อมูล SKU** = `defaultSku()` hardcode 8 แถว ไม่ได้ดึงจาก API/SQL
- **การเชื่อมต่อ** (REST API / SQL Server) = mock toast ไม่ได้ต่อจริง
- ไม่มี Undo/Redo

## ⚠️ Babel standalone runtime
- โค้ด logic ถูก compile ตอน runtime → first paint ช้ากว่าปกติเล็กน้อย, ไม่เหมาะ production scale
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
- หน้าต่างพิมพ์โหลด JsBarcode/QR จาก CDN เอง แล้วรอ `document.fonts.ready` ก่อน `window.print()`
- รูป/โลโก้ (`image`) ยังเป็น placeholder ในงานพิมพ์ — ดู [Roadmap.md](Roadmap.md)

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
