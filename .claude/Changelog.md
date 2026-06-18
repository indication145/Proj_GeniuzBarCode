# Changelog — Print Labels & Barcodes

บันทึกการเปลี่ยนแปลงของ **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย)
รูปแบบอิง [Keep a Changelog](https://keepachangelog.com/) · วันที่เป็น YYYY-MM-DD

## [Unreleased]

### Added
- **ข้อมูลจริง (P1, กำลังทำ)** — backend proxy: `dataSource.js` + `/api/skus?source=api|sql` ใน `server.js`
  REST auth ผ่าน POST `/api/system/token` (X-API-Key) แล้ว cache `AccessToken` ใช้เป็น Bearer;
  หน้า Connection กด "เชื่อมต่อ" → `loadData()` แทน `defaultSku()`; secret อยู่ใน `.env` (gitignored),
  มี `.env.example` + `package.json` (mssql เป็น optional dep). รอ endpoint สินค้าจริงเพื่อ set path + mapping
- **เลือกธุรกิจ (bizId)** — `/api/biz` (GET โหลด list จาก `CsPara/GetList`, POST บันทึก `CSITH_BIZ_ID` ลง `.env`)
  + dropdown "ธุรกิจ" ในหน้า Connection (โหมด API); `dataSource.setEnvVar()` เขียนค่า setting ลง `.env` แบบถาวร
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
