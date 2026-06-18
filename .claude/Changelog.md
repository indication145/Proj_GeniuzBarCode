# Changelog — Print Labels & Barcodes

บันทึกการเปลี่ยนแปลงของ **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย)
รูปแบบอิง [Keep a Changelog](https://keepachangelog.com/) · วันที่เป็น YYYY-MM-DD

## [Unreleased]

### Added
- **บันทึก/โหลด/ลบ แม่แบบ label** — `save()` ใช้งานจริงแล้ว (เดิมเป็น mock); เก็บเป็น `templates.json`
  ฝั่ง server (`templates.js` + `/api/templates` GET list/get, POST upsert ตามชื่อ, DELETE);
  เพิ่ม section "SAVED · แม่แบบที่บันทึก" ใน sidebar (เปิด/ลบ) โหลด list ตอน mount; `templates.json` อยู่ใน .gitignore
- **Single .exe สำหรับเครื่อง client** — `npm run build:exe` (@yao-pkg/pkg) แพ็ก static files เข้าตัว exe;
  `dataSource.js` อ่าน/เขียน `.env` ข้าง ๆ ตัว exe เมื่อ packaged (process.pkg); ดู `deploy/client/README.md`
  (SQL ไม่รองรับใน exe — REST เท่านั้น). ทดสอบแล้ว exe เสิร์ฟหน้าเว็บ + เรียก csith จริงได้
- **Deploy (Windows Server)** — `deploy/windows/` พร้อม README ขั้นตอน, NSSM service installer
  (`install-service.ps1`/`uninstall-service.ps1`), และ IIS reverse-proxy `web.config`;
  `server.js` ข้าม auto-open browser เมื่อ `NODE_ENV=production` หรือ `NO_OPEN`
- **ข้อมูลจริง (P1, กำลังทำ)** — backend proxy: `dataSource.js` + `/api/skus?source=api|sql` ใน `server.js`
  REST auth ผ่าน POST `/api/system/token` (X-API-Key) แล้ว cache `AccessToken` ใช้เป็น Bearer;
  หน้า Connection กด "เชื่อมต่อ" → `loadData()` แทน `defaultSku()`; secret อยู่ใน `.env` (gitignored),
  มี `.env.example` + `package.json` (mssql เป็น optional dep). รอ endpoint สินค้าจริงเพื่อ set path + mapping
- **เลือกธุรกิจ (bizId)** — `/api/biz` (GET โหลด list จาก `CsPara/GetList`, POST บันทึก `CSITH_BIZ_ID` ลง `.env`)
  + dropdown "ธุรกิจ" ในหน้า Connection (โหมด API); `dataSource.setEnvVar()` เขียนค่า setting ลง `.env` แบบถาวร
- **ข้อมูลร้าน/สาขา (shop)** — `/api/shops` ดึงจาก `Shop/GetShopList?BizId=<CSITH_BIZ_ID>`; dropdown เลือกร้าน
  ในหน้า Connection; ฟิลด์ร้านผูกเป็น binding `shop.*` (ชื่อร้าน/สาขา/ที่อยู่/เลขภาษี) พิมพ์ลง label ได้
  (`resolve()` รองรับ prefix `shop.` ผ่าน `bindVal()`/`shopVal()`)
- **ข้อมูลสินค้าหลัก** — `fromApi()` เรียก `BarCode/GetBarCode` (POST `{Fg,SearchCode,BizId}`); map
  `skuCode/skuDesc/pluCode/sellUnitPrice1/sellUnit`; เพิ่มช่องค้นหาในแถบ DATA SOURCE (server-side ตาม Fg)
  + badge บอกแหล่งข้อมูล (mock/REST API/SQL); แก้บั๊ก `getPath(j,"")` คืนทั้ง object (productsArrayPath ว่าง)

- **พิมพ์จากใบสั่งซื้อ (PO)** — `/api/po` (list+ค้นหาตาม Fg: เลขเอกสาร/ผู้ขาย/วันที่/คลัง/อ้างอิง) จาก `GetPurInvoice`
  และ `/api/po/lines?doc=` (รายการสินค้าใน PO ผ่าน `GetBarCode Fg=22`); ปุ่ม "พิมพ์จากใบสั่งซื้อ" + modal เลือก PO
  → โหลดรายการเข้าแถบ SKU (skuSource=po); normalize เก็บ `qty` เพิ่ม
- **พิมพ์ตามจำนวนใน PO (qty)** — `copiesFor()` ใช้ qty ต่อชิ้นเป็นจำนวนดวง (เปิดอัตโนมัติเมื่อโหลดจาก PO)
  มี toggle ในหน้าพิมพ์สลับระหว่าง qty กับค่าคงที่ printCopies; การ์ด SKU แสดง "พิมพ์ N ดวง" เมื่อเปิดโหมด

### Changed (header UI)
- ย้าย dropdown ธุรกิจ + ร้าน/สาขา ไปไว้ที่ header มุมบนขวา (auto-load ตอน mount) — เลือก/เปลี่ยนสะดวกขึ้น
- **พิมพ์ได้จริง (P0)** — `doPrint()` เปิดหน้าต่างพิมพ์ที่ render ป้ายทุกดวงเป็นหน่วย mm จริง
  แล้วเรียก `window.print()`; รองรับ A4 (จัดเรียง grid หลายดวง/แผ่น) และม้วนสติกเกอร์ (1 ดวง/หน้า
  ผ่าน `@page size`); บาร์โค้ดเป็น SVG, QR เป็น canvas; ได้ PDF ผ่าน "Save as PDF" ของเบราว์เซอร์
  (helper ใหม่: `buildPrintHTML` / `printLabelHTML` / `printElHTML` / `_esc`)

## 2026-06-18

### Added (docs)
- เอกสาร `.claude/` (Roadmap, Architecture, Changelog, Decisions, Design, Gotchas) · `6cf3b29`

### Changed
- เปลี่ยนสี accent หลักจากส้ม `#E24F2C` → ม่วงเข้ม `#7b1fa2` ทั้งระบบ
  (`accentVars()` fallback, `accentColor` default, literal ฮาร์ดโค้ด) และ tint อ่อน `#FEF3F0` → `#F4EAF8` · `1b342b0`
- เปลี่ยนชื่อไฟล์ `Label Designer.dc.html` → `LabelDesigner.dc.html` (ตัดเว้นวรรค) + อัปเดต `index.html` · `7add8db`

### Fixed
- แก้ภาษาไทยเพี้ยน (mojibake) — re-extract `LabelDesigner.dc.html` + `support.js` เป็น UTF-8 (no BOM)
  สาเหตุ: ตอนแตกไฟล์ครั้งแรก PowerShell อ่านเป็น ANSI codepage · `5023e0a`

### Added
- **Implement Label Designer จาก Claude Design** — import ตัวแอป (`.dc.html`) + dc-runtime (`support.js`) · `d766d1b`
- `index.html` เป็นจุดเข้า redirect ไปตัวแอป · `e8bef07`
- ตัวเปิดแบบดับเบิลคลิก: `run.bat` + `server.js` (static server Node ล้วน ไม่มี dependency, fallback Python) · `ad5affa`
- ตั้งต้น repository (`README.md`, `.gitignore`) + push ขึ้น GitHub · `57b74f7`

---
> สิ่งที่วางแผนทำต่อ ดู [Roadmap.md](Roadmap.md)
