# Roadmap — Print Labels & Barcodes

แผนพัฒนา **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย)
สถานะปัจจุบัน: prototype ใช้งานได้ (ออกแบบป้ายได้จริง) แต่ส่วน **พิมพ์/บันทึก/เชื่อมต่อข้อมูลยังเป็น mock**

## ตอนนี้ทำได้ (Done)
- ✅ ออกแบบป้าย: เพิ่ม/ย้าย/ปรับขนาด element (text, price, barcode, QR, image, frame)
- ✅ บาร์โค้ดจริง (JsBarcode: CODE128/EAN13…) + QR จริง (qrcodejs)
- ✅ แม่แบบสำเร็จรูป 3 แบบ + size preset 6 ขนาด + กำหนดขนาดเอง (mm)
- ✅ Data binding กับฟิลด์ SKU + live preview จากแถบ SKU
- ✅ zoom/pan, selection handles, theme สี (accent ม่วง `#7b1fa2`)

## ลำดับถัดไป (Next)

### P0 — ทำให้ "พิมพ์ได้จริง"  (กำลังทำ)
- [x] `doPrint()` → พิมพ์จริงด้วย `window.print()` + `@page` CSS (เปิดหน้าต่างพิมพ์ render ป้ายเป็น mm จริง)
- [x] จัดวางหลายดวงบนแผ่น A4 จริง (flex-wrap grid) และโหมดม้วนสติกเกอร์ (1 ดวง/หน้า ตามขนาดป้าย)
- [x] Export PDF — ได้ผ่าน dialog เบราว์เซอร์ "Save as PDF" (ใช้ `@page size` จริง)
- [ ] Export PNG ราย element / ราย label (ยังไม่ทำ)
- [ ] รองรับเครื่องพิมพ์สติกเกอร์ความร้อน — export **ZPL/TSPL** สำหรับม้วนสติกเกอร์ (ยังไม่ทำ)
- [ ] อัปโหลดรูป/โลโก้จริง (ตอน image ยังเป็น placeholder ในงานพิมพ์)

### P1 — ข้อมูลจริง (เลิก mock)  (กำลังทำ)
- [x] Backend proxy ใน `server.js` + `dataSource.js` → `/api/skus?source=api|sql` (secret อยู่ใน `.env`)
- [x] REST auth flow: POST `/api/system/token` (X-API-Key) → cache `AccessToken` → `Bearer`
- [x] หน้า Connection กด "เชื่อมต่อ" → `loadData()` ดึง SKU จริงมาแทน `defaultSku()` (มี loading/error)
- [x] เลือก "ธุรกิจ" (bizId) จาก `CsPara/GetList` → บันทึกลง `.env` (`/api/biz` GET/POST + dropdown ในหน้า Connection)
- [x] โหลด "ร้าน/สาขา" จาก `Shop/GetShopList?BizId=<env>` (`/api/shops`) → เลือกร้าน → ผูกเป็น binding `shop.*` พิมพ์ลง label ได้
- [x] **ข้อมูลสินค้าจริง** — `BarCode/GetBarCode` (POST `{Fg,SearchCode,BizId}`); map `skuCode/skuDesc/pluCode/sellUnitPrice1/sellUnit`
- [x] ค้นหา SKU ฝั่ง server ตาม Fg (1=รหัส,2=PLU,3=ชื่อ,4=ราคา,5=หน่วย,6=หมวด,11=แบรนด์) — ช่องค้นหาในแถบ DATA SOURCE
- [x] **พิมพ์จากใบสั่งซื้อ (PO)** — `GetPurInvoice` (เลือก PO) → `GetBarCode Fg=22` (รายการใน PO) → โหลดเข้าแถบ SKU
      (`/api/po`, `/api/po/lines`, modal เลือก PO + ค้นหา); รายการ PO มี qty ติดมาด้วย (เผื่อทำ copies ต่อชิ้น)
- [ ] SQL Server: `npm install mssql` + ใส่ credentials/query ใน `.env`
- [ ] ปรับ duplicate rows (1 SKU มีหลายแถวตาม PLU/หน่วย) + paging (Fg=0 cap ~100)

### P1 — บันทึก/จัดการแม่แบบ
- [x] `save()` บันทึกจริง — เก็บเป็น `templates.json` ฝั่ง server (`/api/templates` CRUD)
- [x] โหลด/ลบ แม่แบบที่บันทึกไว้ (section "SAVED · แม่แบบที่บันทึก" ใน sidebar)
- [ ] ทำซ้ำ (duplicate) แม่แบบ / export-import เป็นไฟล์
- [ ] Undo / Redo

### P2 — คุณภาพ & ออฟไลน์
- [ ] self-host React/Babel/JsBarcode/QR (ตัด dependency CDN ให้ทำงานออฟไลน์ได้) — ดู [Gotchas.md](Gotchas.md)
- [ ] ตัด Babel standalone ออก (pre-compile) ลดเวลา first paint
- [ ] UI สลับ theme/accent ใน standalone (ตอนนี้ตั้งได้ผ่าน props เท่านั้น)
- [ ] snap-to-guide / alignment tools, keyboard shortcuts เพิ่ม

> รายละเอียดสิ่งที่เป็น mock ดู [Gotchas.md](Gotchas.md) · เหตุผลการตัดสินใจ ดู [Decisions.md](Decisions.md)
