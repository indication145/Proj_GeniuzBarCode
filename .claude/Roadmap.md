# Roadmap — Print Labels & Barcodes

แผนพัฒนา **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย)
สถานะปัจจุบัน: **ใช้งานได้จริงครบวงจร + ออฟไลน์** — ออกแบบ → บันทึกแม่แบบ → ดึง SKU/PO จริง (REST หรือ SQL Server) → พิมพ์ → แพ็กเป็น `.exe` แจกได้ (ไลบรารี/ฟอนต์ self-host ใน `vendor/` ไม่ต้องต่อเน็ต)
(เหลือเฉพาะ feature เสริม เช่น Undo-Redo / code signing ดูด้านล่าง)

## ตอนนี้ทำได้ (Done)
- ✅ ออกแบบป้าย: เพิ่ม/ย้าย/ปรับขนาด element (text, price, barcode, QR, image, frame)
- ✅ บาร์โค้ดจริง (JsBarcode: CODE128/EAN13…) + QR จริง (qrcodejs)
- ✅ แม่แบบสำเร็จรูป 3 แบบ + size preset 6 ขนาด + กำหนดขนาดเอง (mm)
- ✅ Data binding กับฟิลด์ SKU + live preview
- ✅ zoom/pan, selection handles, theme สี (accent ม่วง `#7b1fa2`)

### โครงสร้าง UI ใหม่ (เพิ่มภายหลังเอกสารชุดแรก)
- ✅ **แถบเมนูซ้าย (nav rail) 3 เมนู** — สร้าง Template · พิมพ์ป้ายราคา · ตั้งค่าเชื่อมต่อ (เดิมเป็น modal รวม)
- ✅ **หน้าพิมพ์แบบ grid (ยิงรหัสสินค้า)** — `<table>` auto-width (คอลัมน์ปรับตามเนื้อหา) SkuCode/PluCode/CatCode/CatName/SkuDesc/SupplierID/SupplierName/Price/Qty + ลบราย row (ปุ่มแดง), Total Quantity, แถวสแกนมี dropdown เลือกฟิลด์ค้น + ปุ่มเพิ่ม/ล้าง/พิมพ์, preview ด้านขวา (เพิ่ม field mapping ใน `dataSource.js`)
- ✅ **สแกน/ค้นเจอหลายรายการ → modal ให้เลือก** เพิ่มทีละรายการ หรือเพิ่มทั้งหมด (`addByCode` → `_appendSku`/`addAllResults`)
- ✅ ตัวเลือกกระดาษ A4/ม้วน + roll cols/rows, preview: **A4 แสดงเต็มแผ่นจริง (210×297mm + ขอบ 8mm)**, ม้วนปรับสเกลอัตโนมัติ + แผง preview กว้างรองรับ 3 คอลัมน์, empty state
- ✅ **จัดการหลายแม่แบบผ่านรายการ SAVED** (เปิดทีละ 1) — ตอนเปิดโปรแกรมโหลดแม่แบบแรกจาก `templates.json`
- ✅ **บันทึกแยกชัด** — ชื่อเดิม=อัปเดต, ชื่อใหม่=สร้างใหม่, ชื่อซ้ำ=เด้ง modal เตือนก่อนเขียนทับ
- ✅ **เก็บรูปแบบกระดาษในแม่แบบ** — `printMedia` + `rollCols`/`rollRows` ติดไปกับแต่ละ template
- ✅ ราคาฟอร์แมต `.00` ทุกที่ (helper `_fmtPrice`), ตัด `฿` ออกจากค่าเริ่มต้น
- ✅ จำนวนพิมพ์ราย SKU (copies stepper) + โหมดพิมพ์ตาม qty ของ PO

## ลำดับถัดไป (Next)

### P0 — ทำให้ "พิมพ์ได้จริง"  (เสร็จหลัก เหลือ feature เสริม)
- [x] `doPrint()` → พิมพ์จริงด้วย `window.print()` + `@page` CSS (เปิดหน้าต่างพิมพ์ render ป้ายเป็น mm จริง)
- [x] จัดวางหลายดวงบนแผ่น A4 จริง (flex-wrap grid) และโหมดม้วนสติกเกอร์ (1 ดวง/หน้า ตามขนาดป้าย)
- [x] Export PDF — ได้ผ่าน dialog เบราว์เซอร์ "Save as PDF" (ใช้ `@page size` จริง)
- [ ] Export PNG ราย element / ราย label (ยังไม่ทำ)
- [ ] รองรับเครื่องพิมพ์สติกเกอร์ความร้อน — export **ZPL/TSPL** สำหรับม้วนสติกเกอร์ (ยังไม่ทำ)
- [x] อัปโหลดรูป/โลโก้จริง — element `image` รับไฟล์ (FileReader → data URL) เก็บใน `el.src`, render `<img>` บนจอ + ตอนพิมพ์, มีแผง inspector (เลือก/เปลี่ยน/ลบรูป); fallback placeholder เมื่อยังไม่มีรูป

### P1 — ข้อมูลจริง (เลิก mock)  (เสร็จ — REST; เหลือ SQL)
- [x] Backend proxy ใน `server.js` + `dataSource.js` → `/api/skus?source=api|sql` (secret อยู่ใน `.env`)
- [x] REST auth flow: POST `/api/system/token` (X-API-Key) → cache `AccessToken` → `Bearer`
- [x] **แก้ config จากหน้า settings** — Endpoint / API Key (REST) และ Server/DB/User/Password (SQL) แก้+บันทึกลง `.env` ผ่าน `/api/config` (API key ปิดบัง, ว่าง=คงเดิม); มีผลทันทีไม่ต้อง restart (เคลียร์ token/pool cache)
- [x] หน้า Connection กด "เชื่อมต่อ" → `loadData()` ดึง SKU จริงมาแทน `defaultSku()` (มี loading/error)
- [x] เลือก "ธุรกิจ" (bizId) จาก `CsPara/GetList` → บันทึกลง `.env` (`/api/biz` GET/POST + dropdown ในหน้า Connection)
- [x] โหลด "ร้าน/สาขา" จาก `Shop/GetShopList?BizId=<env>` (`/api/shops`) → เลือกร้าน → ผูกเป็น binding `shop.*` พิมพ์ลง label ได้
- [x] **ข้อมูลสินค้าจริง** — `BarCode/GetBarCode` (POST `{Fg,SearchCode,BizId}`); map `skuCode/skuDesc/pluCode/sellUnitPrice1/sellUnit`
- [x] ค้นหา SKU ฝั่ง server ตาม Fg (1=รหัส,2=PLU,3=ชื่อ,4=ราคา,5=หน่วย,6=หมวด,11=แบรนด์) — ช่องค้นหาในแถบ DATA SOURCE
- [x] **พิมพ์จากใบสั่งซื้อ (PO)** — `GetPurInvoice` (เลือก PO) → `GetBarCode Fg=22` (รายการใน PO) → โหลดเข้าแถบ SKU
      (`/api/po`, `/api/po/lines`, modal เลือก PO + ค้นหา); รายการ PO มี qty ติดมาด้วย (เผื่อทำ copies ต่อชิ้น)
- [x] **SQL Server — full data layer** (`npm install mssql`): สวิตช์ `DATA_SOURCE=api|sql` ทำให้ **biz/shop/สินค้า/PO** ดึงจาก SQL ทั้งหมด (เทียบเท่า REST)
  - ConnectionPool reuse ได้ (reset เมื่อ config การต่อเปลี่ยน), `pick()`/`ciGet()` อ่านคอลัมน์แบบ case-insensitive (วาง SQL ดิบไม่ต้อง alias)
  - queries (ปรับใน `.env` ได้) ชี้ GeniuzPOS จริง: `csPara` (biz), `psShop` (shop), `csbarcode_GetSkuPluInfo(@fg,@code,@bizId)` (สินค้า + PO lines fg=22), `csbarcode_GetPurInvoice(@fg,@code,@bizId,@docFg)` (PO)
  - แก้ Server/DB/User/Password + สลับโหมดจากหน้า "ตั้งค่าเชื่อมต่อ" แท็บ SQL → บันทึก `.env` ผ่าน `/api/config`; UI sync โหมดตาม `DATA_SOURCE`
  - ทดสอบจริงครบ: biz 15 · shop 6 · สินค้า 100+ค้นหา · PO 100 · PO lines (มี qty)
  - ✅ **ใช้ใน `.exe` ได้ด้วย** — mssql ใช้ driver `tedious` (pure JS ไม่มี native `.node`) จึงแพ็กด้วย pkg ได้ (ทดสอบ exe ต่อ SQL ผ่านแล้ว); วาง `.env` ที่มี `DATA_SOURCE=sql` + SQL_* ไว้ข้าง exe
- [ ] ปรับ duplicate rows (1 SKU มีหลายแถวตาม PLU/หน่วย) + paging (Fg=0 cap ~100)

### P1 — บันทึก/จัดการแม่แบบ
- [x] `save()` บันทึกจริง — เก็บเป็น `templates.json` ฝั่ง server (`/api/templates` CRUD)
- [x] โหลด/ลบ แม่แบบที่บันทึกไว้ (section "SAVED · แม่แบบที่บันทึก" ใน sidebar)
- [x] ทำซ้ำผ่าน "บันทึกเป็นชื่อใหม่" (ชื่อซ้ำเด้งเตือนก่อนเขียนทับ)
- [ ] export / import แม่แบบเป็นไฟล์ (.json)
- [ ] **Undo / Redo** (ยังไม่มี — gap หลัก)

### P1 — แพ็กเป็น .exe สำหรับ end-user  (เสร็จ)
- [x] **single-exe** ด้วย `@yao-pkg/pkg` (`npm run build:exe` → `scripts/build-exe.js`) — bundle static files + อ่าน/เขียน `.env` ข้าง exe
- [x] **icon แอป** จาก `design/geniuz_barcode.png` (เติมขอบจัตุรัส → .ico → rcedit ที่ base ก่อน pkg เพราะ rcedit ตัว exe ทำ SEA payload เสีย) + เปลี่ยนชื่อเป็น `Geniuz_Barcode.exe`
- [x] SQL Server ใช้ใน exe ได้ (tedious เป็น pure JS) — วาง `.env` (`DATA_SOURCE=sql` + `SQL_*`) ข้าง exe
- [x] เปิด/ปิดด้วยหน้าต่าง console (มี console window — ปิดหน้าต่างเพื่อหยุด server) — *เคยลอง windowless + ปุ่มปิดในแอป แต่ revert กลับเป็น console ตามที่ผู้ใช้เลือก*
- [ ] code signing (กัน SmartScreen เตือน) — ยังไม่ทำ

### P2 — คุณภาพ & ออฟไลน์
- [x] **self-host React/ReactDOM/JsBarcode/QR + ฟอนต์ IBM Plex** → `vendor/` (ตัด CDN ทำงานออฟไลน์ได้)
  - `npm run fetch:vendor` (`scripts/fetch-vendor.js`) ดึงไลบรารี + ดึง CSS Google Fonts แล้ว rewrite `url()` เป็น woff2 ในเครื่อง (`vendor/fonts/fonts.css`, 35 subset)
  - อ้างอิงในเครื่องทั้ง: `support.js` (REACT_URL/REACT_DOM_URL), head ของ `LabelDesigner.dc.html`, และ **หน้าต่างพิมพ์** (`buildPrintHTML` ใช้ origin-absolute เพราะเปิดเป็น about:blank)
  - `vendor/**/*` อยู่ใน `pkg.assets` → ใช้ใน `.exe` ได้ (ออฟไลน์เต็มรูปแบบ); commit `vendor/` ลง repo ให้ clone แล้วใช้ได้เลย
- [x] **Babel standalone — ยืนยันว่าไม่ถูกโหลดอยู่แล้ว** (ไม่ใช่ gap): logic เป็น ES class รันผ่าน `evalDcLogic`/`new Function` ไม่ใช่ JSX; `ensureBabel()` ยิงเฉพาะ x-import kind jsx ซึ่งแอปไม่มี → first paint ไม่ติด Babel (เพิ่ม comment กำกับใน `support.js`)
- [x] **snap-to-guide + alignment tools + keyboard shortcuts** —
  - snap ตอนลากเพิ่มให้จับขอบ/กึ่งกลางของ **element อื่น** ด้วย (เดิมจับเฉพาะขอบ/กึ่งกลางป้าย) ผ่าน `_snapMove()`; กด **Alt ค้าง** = ลากอิสระไม่ snap
  - ปุ่ม **ALIGN 6 ทิศ** (ซ้าย/กลาง/ขวา · บน/กลาง/ล่าง) ใน inspector → `alignSel(dir)` จัดกล่อง element ในขอบป้าย
  - shortcut: **Esc = ยกเลิกการเลือก** (เพิ่มจากเดิม Space/Delete/Arrows(±0.5, Shift ±2)/Ctrl+D)
- [x] **UI สลับ theme/accent ใน standalone** — แถบ "ธีม · THEME" ในหน้าตั้งค่าเชื่อมต่อ: จานสี accent 5 สี + dropdown canvas mood (studio/blueprint/spotlight/paper) + label stock (plain/cream/kraft/thermal)
  - state `themeAccent/themeMood/themeStock` (null = ใช้ props/default, คงพฤติกรรม dc-editor); `renderVals` อ่าน `S.themeX || props.X || default`; เก็บ `localStorage` (`ge_accent/ge_mood/ge_stock`) จำตอนเปิดใหม่ผ่าน `loadTheme()` ใน componentDidMount

> รายละเอียดสิ่งที่เป็น mock ดู [Gotchas.md](Gotchas.md) · เหตุผลการตัดสินใจ ดู [Decisions.md](Decisions.md)
