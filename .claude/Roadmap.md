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

### P0 — ทำให้ "พิมพ์ได้จริง"
- [ ] `doPrint()` → พิมพ์จริงด้วย `window.print()` + `@page` CSS (ตอนนี้เป็น setTimeout + toast)
- [ ] Export PDF (หลายดวง/แผ่น A4) และ PNG ราย element
- [ ] รองรับเครื่องพิมพ์สติกเกอร์ความร้อน — export **ZPL/TSPL** สำหรับม้วนสติกเกอร์
- [ ] จัดวางหลายดวงบนแผ่น A4 จริง (grid layout ตามขนาดป้าย)

### P1 — ข้อมูลจริง (เลิก mock)
- [ ] เชื่อม REST API จริง (`connMode:'api'`) แทน `defaultSku()`
- [ ] เชื่อม SQL Server / GeniuzPOS (`connMode:'sql'`)
- [ ] ค้นหา/เลือก SKU จากฐานข้อมูลจริง

### P1 — บันทึก/จัดการแม่แบบ
- [ ] `save()` บันทึกจริง (localStorage ก่อน แล้วค่อย backend) — ตอนนี้แค่ toast
- [ ] โหลด/ลบ/ทำซ้ำแม่แบบที่บันทึกไว้
- [ ] Undo / Redo

### P2 — คุณภาพ & ออฟไลน์
- [ ] self-host React/Babel/JsBarcode/QR (ตัด dependency CDN ให้ทำงานออฟไลน์ได้) — ดู [Gotchas.md](Gotchas.md)
- [ ] ตัด Babel standalone ออก (pre-compile) ลดเวลา first paint
- [ ] UI สลับ theme/accent ใน standalone (ตอนนี้ตั้งได้ผ่าน props เท่านั้น)
- [ ] snap-to-guide / alignment tools, keyboard shortcuts เพิ่ม

> รายละเอียดสิ่งที่เป็น mock ดู [Gotchas.md](Gotchas.md) · เหตุผลการตัดสินใจ ดู [Decisions.md](Decisions.md)
