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

## D7 — ส่วนพิมพ์/บันทึก/เชื่อมต่อยังเป็น mock (ตั้งใจ)
**ตัดสินใจ:** prototype phase — `doPrint`/`save`/connection เป็น mock (toast เฉยๆ)
**เหตุผล:** โฟกัส UX การออกแบบป้ายก่อน; backend/printer integration เป็นงานเฟสถัดไป
**ผลตามมา:** ดูงานจริงที่ต้องทำใน [Roadmap.md](Roadmap.md)
