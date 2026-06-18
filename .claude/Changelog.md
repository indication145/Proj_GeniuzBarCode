# Changelog — Print Labels & Barcodes

บันทึกการเปลี่ยนแปลงของ **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย)
รูปแบบอิง [Keep a Changelog](https://keepachangelog.com/) · วันที่เป็น YYYY-MM-DD

## [Unreleased]
- เอกสาร `.claude/` (Roadmap, Architecture, Changelog, Decisions, Design, Gotchas)

## 2026-06-18

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
