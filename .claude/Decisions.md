# Decisions — Print Labels & Barcodes

บันทึกการตัดสินใจเชิงสถาปัตยกรรม (ADR แบบย่อ) ของ **GeniuzBarCode Label Designer**

---

## D1 — เก็บรูปแบบ `.dc.html` + `support.js` ไว้ ไม่ rewrite เป็น React app ปกติ
**ตัดสินใจ:** ใช้ไฟล์ที่ import มาจาก Claude Design ตามเดิม
**เหตุผล:** ยัง re-sync กับ Claude Design ได้, ลด effort, ตัวแอปทำงานครบอยู่แล้ว
**ผลตามมา:** พึ่ง dc-runtime + Babel standalone ตอน runtime (ดู [Gotchas.md](Gotchas.md)); ถ้าจะ production จริงค่อยพิจารณา pre-compile

## D2 — Local server เป็น Node ล้วน ไม่มี dependency
**ตัดสินใจ:** `server.js` ใช้เฉพาะ built-in (`http`/`fs`/`path`) + `run.bat` เปิดแบบดับเบิลคลิก
**เหตุผล:** ไม่ต้อง `npm install`, เครื่องมี Node อยู่แล้ว, รันได้ทันที; เลี่ยง `file://` ที่บาง CDN/feature มีปัญหา
**ทางเลือกสำรอง:** `run.bat` fallback ไป `python -m http.server` ถ้าไม่มี Node

## D3 — ไฟล์ทุกไฟล์ต้องเป็น UTF-8 (no BOM)
**ตัดสินใจ:** บังคับเขียนด้วย UTF-8 ไม่มี BOM
**เหตุผล:** UI เป็นภาษาไทยทั้งหมด; เคยเจอ Thai เพี้ยน (mojibake) เพราะ PowerShell `Get-Content` อ่านเป็น ANSI codepage
**ผลตามมา:** ตอนแก้ไฟล์ผ่านสคริปต์ ต้องระบุ encoding ชัดเจนเสมอ — ดู [Gotchas.md](Gotchas.md)

## D4 — สี accent เป็นม่วงเข้ม `#7b1fa2`
**ตัดสินใจ:** เปลี่ยนจากส้ม `#E24F2C` เป็นม่วงเข้ม `#7b1fa2` ทั้งระบบ
**เหตุผล:** ตามที่เจ้าของโปรเจกต์ร้องขอ
**วิธีทำ:** แก้ทั้ง `accentVars()` fallback, `accentColor` prop default และ literal ที่ฮาร์ดโค้ด; tint อ่อน `#FEF3F0`→`#F4EAF8`

## D5 — ระบบพิกัดเป็นมิลลิเมตร (mm) + ค่าคงที่ PX
**ตัดสินใจ:** เก็บตำแหน่ง/ขนาดเป็น mm, render ด้วย `PX = 3.7795`
**เหตุผล:** ป้าย/สติกเกอร์เป็นหน่วยพิมพ์จริง; ผู้ใช้คิดเป็น mm; แปลงเป็น px เพื่อแสดงผลเท่านั้น

## D6 — ชื่อไฟล์หลักไม่มีเว้นวรรค + มี `index.html` เป็นจุดเข้า
**ตัดสินใจ:** rename `Label Designer.dc.html` → `LabelDesigner.dc.html`, ใช้ `index.html` redirect
**เหตุผล:** ชื่อมีเว้นวรรคยุ่งยากตอน serve/พิมพ์คำสั่ง; `index.html` เปิดที่ root ได้ทันที

## D8 — self-host ไลบรารี/ฟอนต์ใน `vendor/` (ออฟไลน์) แทน CDN
**ตัดสินใจ:** ดึง React/ReactDOM/JsBarcode/qrcodejs + ฟอนต์ IBM Plex มาเก็บใน `vendor/` แล้ว commit ลง repo + ใส่ใน `pkg.assets`
**เหตุผล:** แอปแพ็กเป็น `.exe` แจกเครื่องหน้าร้านที่อาจไม่มีเน็ต — พึ่ง CDN = เปิดไม่ขึ้น/บาร์โค้ดไม่วาด/ฟอนต์ไทยเพี้ยน
**วิธีทำ:** `scripts/fetch-vendor.js` (`npm run fetch:vendor`) ทำซ้ำได้ — ดึง JS, ดึง CSS Google Fonts ด้วย Chrome UA แล้ว download woff2 + rewrite `url()` เป็น path ในเครื่อง (`vendor/fonts/fonts.css`)
**ผลตามมา:** ถ้าจะอัปเวอร์ชันต้องแก้ให้ตรงกัน 3 จุด (support.js / head html / buildPrintHTML) แล้วรัน fetch ใหม่; ทิ้ง SRI ของ React (same-origin first-party แล้ว); หน้าต่างพิมพ์ต้องใช้ origin-absolute เพราะเปิดเป็น about:blank — ดู [Gotchas.md](Gotchas.md)
**Babel:** ไม่ vendored เพราะไม่ถูกโหลด (logic เป็น ES class ไม่ใช่ JSX)

## D7 — เริ่มจาก mock แล้วค่อยต่อ backend จริง (ตอนนี้ต่อจริงแล้ว)
**ตัดสินใจ:** prototype phase เริ่มด้วย `doPrint`/`save`/connection เป็น mock เพื่อโฟกัส UX ออกแบบป้ายก่อน
**สถานะปัจจุบัน:** ต่อ backend จริงครบแล้ว — พิมพ์ผ่าน `window.print()` (`buildPrintHTML`), บันทึกลง `templates.json`, ดึง SKU/ธุรกิจ/ร้าน/PO จริงผ่าน `server.js` + `dataSource.js`
**เหลือ:** อัปโหลดรูปจริง, Undo/Redo, SQL Server, self-host (ออฟไลน์) — ดู [Roadmap.md](Roadmap.md)
