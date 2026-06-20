# Gotchas — Print Labels & Barcodes

จุดที่พลาดง่ายของ **GeniuzBarCode Label Designer** (Vite + React; ดู [Architecture.md](Architecture.md))

## ⚠️ Encoding ภาษาไทย — ต้อง UTF-8 (no BOM)
- UI เป็นภาษาไทยทั้งหมด **ห้ามแก้ไฟล์ด้วยเครื่องมือที่อ่าน/เขียนเป็น ANSI**
- PowerShell 5.1 `Get-Content -Raw` ดีฟอลต์ = ANSI codepage → ภาษาไทยพังเป็น mojibake (เคยเกิดจริง)
- เวลาแก้ผ่านสคริปต์ ให้ระบุ encoding ชัดเจน; `Out-File`/`Set-Content` ใช้ `-Encoding utf8`
- ตรวจเร็ว ๆ: ไทยที่ถูกต้องคือ byte `E0 B8 xx` / `E0 B9 xx`

## ⚠️ Dev = 2 process
- `node server.js` (API :8080) **และ** `cd web && npm run dev` (Vite UI :5173, proxy `/api` → 8080)
- เปิด UI ที่ **:5173** ตอน dev (ไม่ใช่ 8080); 8080 เสิร์ฟ `web/dist` (ของที่ build แล้ว)
- prod/exe: `server.js` เสิร์ฟ `web/dist` ที่ :8080 (ดู `run.bat` / `build:exe`)

## ✅ ออฟไลน์ — Vite bundle เอง (ไม่มี vendor/CDN)
- React/jsbarcode/qrcode + ฟอนต์ IBM Plex (`@fontsource/*`) ถูก bundle เข้า `web/dist` → ไม่ต้องต่อเน็ต
- บาร์โค้ด/QR วาดด้วย `web/src/lib/barcode.ts` (`import` จาก npm) ลง `<canvas>` ใน `useEffect`
- **ห้าม** กลับไป `<script src>` CDN หรือ `window.JsBarcode` แบบเดิม

## ⚠️ พิมพ์ = data-URL popup (ไม่มี vendor)
- `lib/printDoc.ts` pre-render บาร์โค้ด/QR เป็น **PNG data-URL** + ฝัง `@font-face` จาก stylesheet ของแอป (rewrite `url(/..)` เป็น absolute origin) → popup เป็น HTML ล้วน ไม่มี script
- `window.open('')` ต้องเรียกจาก user click (ปุ่มพิมพ์) — `openPrint()` เปิด window **ก่อน** await build กัน popup blocker
- รูปอัปโหลด (`image`) เก็บเป็น data URL ใน `el.src` → ฝังลง `templates.json` (จำกัด ≤ 3MB)

## ⚠️ Secret / .env — อย่า commit
- token/API key/รหัสผ่าน SQL อยู่ใน **`.env` เท่านั้น** (gitignored) — มี `.env.example` เป็นแม่แบบ
- repo นี้เป็น public — ถ้า key หลุดต้อง **rotate ทันที**
- `dataSource.js` มี `.env` loader ของตัวเอง (รูปแบบ `KEY=value` ต่อบรรทัด); ในโหมด exe อ่าน/เขียน `.env` **ข้างตัว exe**

## ⚠️ ข้อมูลจริง: ผ่าน backend เท่านั้น
- `/api/*` เสิร์ฟโดย `server.js` (proxy) — เบราว์เซอร์ต่อ csith/SQL ตรงไม่ได้ (CORS / ไม่มี driver)
- **REST**: POST `/api/system/token` ต้องมี `Content-Length: 0` (ไม่งั้น 411); cache `AccessToken`
- **SQL Server**: `npm install mssql` (optional dep, require แบบ lazy), driver `tedious` (pure JS) → แพ็ก exe ได้
- ปรับ endpoint/field mapping ที่ `.env` (`CSITH_*`, `MAP_*`, `SQL_QUERY`) ไม่ต้องแก้โค้ด

## ระบบพิกัด
- state เป็น **mm** ไม่ใช่ px — คูณ `PX` (3.7795) เฉพาะตอน render (`lib/units.ts`)
- ราคา format ด้วย `fmtPrice` (locale `th-TH`, 2 ตำแหน่ง) — อย่าเอาค่า formatted ไปคำนวณต่อ

## Theme
- accent/mood/stock ตั้งจากหน้า Settings → เก็บ `localStorage` (`ge_accent/ge_mood/ge_stock`)
- accent ใช้ผ่าน **CSS var `--accent*`** (ตั้งโดย `useApplyAccent`) — เลิก hardcode `#7b1fa2` แล้ว

## ⚠️ Build exe (pkg)
- `npm run build:exe` = `vite build` → ฝัง icon ที่ base node → pkg bundle `web/dist/**`
- spawn `npm` ใน build-exe ใช้ `shell:true` (ไม่งั้น `.cmd` โยน EINVAL บน Windows)
- ห้าม rcedit ตัว exe สุดท้าย (payload SEA เสีย) — ฝัง icon ที่ base ก่อน; ดู [deploy/client/README.md](../deploy/client/README.md)

## Git / Windows
- commit message ที่มี double-quote โดน PowerShell 5.1 ตัด → ใช้ `git commit -F <file>` หรือ here-string
- เห็น warning `LF will be replaced by CRLF` ตอน commit เป็นเรื่องปกติของ autocrlf บน Windows
- `web/dist`, `dist/`, `node_modules/` ถูก gitignore — build output ไม่เข้า repo
