# Migration Plan — ย้าย frontend ไป Vite + React

แผนย้าย **GeniuzBarCode Label Designer** จาก dc-runtime (`.dc.html` + `support.js`)
ไปเป็น **Vite + React** แบบเป็นเฟส (scaffold → ย้ายทีละหน้า → cutover)

> สถานะ: **Phase 4 กำลังทำ — 4a (Settings) เสร็จ**; ถัดไป 4b (Print + render core) · 4c (Design) — branch `feat/vite-migration`; main = แอป dc เดิมใช้งานปกติ

---

## ⚠️ ก่อนตัดสินใจเริ่ม (decision gate)

1. **เสีย re-sync กับ Claude Design ถาวร** — ดู [Decisions.md](Decisions.md) D1. หลังย้ายเป็น JSX
   จะดึงงานออกแบบจาก Claude Design กลับมาไม่ได้อีก แก้ดีไซน์ต้องทำมือใน JSX
2. **perf gain ต่อ end-user น้อย** — Babel ไม่ได้ถูกโหลดอยู่แล้ว (logic เป็น ES class), template parse
   แค่ครั้งเดียวตอนบูต. ของจริงที่ได้คือ **DX + โครงระยะยาว + ตัด vendor/ hack** ไม่ใช่ "ผู้ใช้รู้สึกเร็วขึ้น"
3. งานนี้ ≈ **เขียน frontend ใหม่ ~2,100 บรรทัด** (template+logic). Backend ไม่กระทบ

**เริ่มก็ต่อเมื่อ:** เลิกพึ่ง Claude Design แล้ว · อยากได้ TS/test/tooling · จะต่อฟีเจอร์อีกเยอะ

---

## เป้าหมาย / ไม่ใช่เป้าหมาย

**เป้าหมาย**
- frontend เป็น React + JSX (Vite build, esbuild/SWC transform), TypeScript
- ตัด CDN/vendor hack — ใช้ npm import (React/JsBarcode/qrcode) bundle เอง
- คงพฤติกรรม UI/ฟีเจอร์ทุกอย่างให้เทียบเท่าของเดิม (design/print/settings/theme/snap/PO/SQL)

**ไม่ใช่เป้าหมาย (คงเดิม ห้ามแตะตอนย้าย)**
- `server.js` (static + API proxy), `dataSource.js`, `templates.js` — Node ล้วน
- API contract: `/api/skus` `/api/templates` `/api/biz` `/api/shops` `/api/po` `/api/po/lines` `/api/config`
- `.env` / SQL layer / token cache / pkg-based `.exe` (เปลี่ยนแค่ build step)

---

## หลักการ migration

1. **ย้ายแบบขนาน** — Vite app อยู่ใน `web/` แยก ไม่แตะ `LabelDesigner.dc.html` จนกว่าจะ cutover
2. **server.js เป็นแกนเดิม** — dev: Vite proxy `/api` → server.js; prod: `vite build` → `web/dist` แล้ว server.js เสิร์ฟ
3. **ย้ายทีละหน้า** — เทียบกับแอปเดิม (เปิดคู่กัน) ได้ตลอด หน้าไหนยังไม่ย้ายให้ redirect ไปแอปเดิมก่อน
4. **logic ก่อน UI** — แยก logic ที่ไม่พึ่ง React (units/print/snap/theme/api) เป็น module + เขียน test ก่อน

---

## โครงสร้างปลายทาง (เสนอ)

```
web/
  index.html              # entry ของ Vite (แทน LabelDesigner.dc.html)
  vite.config.ts          # + proxy /api -> http://localhost:8080
  tsconfig.json
  src/
    main.tsx              # ReactDOM.createRoot
    App.tsx              # shell: header + nav rail + view switch + toast
    store/
      useStore.ts        # Zustand (state ก้อนเดียวแบบ this.state เดิม แต่แยก slice)
    lib/                 # framework-agnostic (port ตรงจาก logic เดิม + test)
      units.ts           # PX=3.7795, mm<->px, _fmtPrice
      elements.ts        # mkEl, tplPriceTag/tplProduct/tplQr, model ของ element
      barcode.ts         # วาด JsBarcode/QRCode (รับ canvas/svg, import npm)
      print.ts           # buildPrintHTML / printElHTML / printLabelHTML
      snap.ts            # _snapMove, alignSel
      theme.ts           # accentVars, accentChoices, moods/stocks, localStorage
      api.ts             # fetch wrapper ของทุก /api/*
    views/
      DesignView.tsx     # canvas + inspector + palette + saved/templates/size
      PrintView.tsx      # scan bar + grid + copies + media + preview
      SettingsView.tsx   # connection (REST/SQL) + scope + theme
    components/
      Canvas.tsx, ElementBox.tsx, Inspector.tsx, AlignBar.tsx,
      NavRail.tsx, Header.tsx, Toast.tsx,
      PoModal.tsx, ScanResultsModal.tsx, ConfirmDupModal.tsx
```

หลัง cutover: `LabelDesigner.dc.html` + `support.js` + `vendor/` + `scripts/fetch-vendor.js` ลบได้

---

## เฟส

### Phase 0 — เตรียม (ครึ่งวัน) — ✅ เสร็จ
- [x] commit งานที่ค้างลง main ก่อนแตก branch — `938cb9c` (theme switcher + button fix) · `68a5fee` (แผนนี้) → push แล้ว
- [x] แตก branch `feat/vite-migration` (จาก main `68a5fee`)
- [x] decision gate — ผู้ใช้สั่ง "ลุยเฟส 0" = รับทราบจะเสีย Claude Design sync
      (จุด irreversible จริงคือ Phase 6/7 ตอนลบ `.dc.html`/`support.js` — ก่อนหน้านั้นทิ้ง branch ได้)
- [x] freeze ฟีเจอร์ใหม่บนแอปเดิม (main) ระหว่างย้าย — แก้บั๊กได้ แต่ฟีเจอร์ใหม่รอหลัง cutover

**ถัดไป → [Phase 1 — Scaffold](#phase-1--scaffold-1-วัน)**

### Phase 1 — Scaffold — ✅ เสร็จ
- [x] `npm create vite@latest web -- --template react-ts` — ได้ **React 19 · Vite 8 · TS 6**
      (ใหม่กว่าที่วางไว้ React 18 — โอเค); `npm install` ใน `web/` (152 pkg, 0 vuln)
- [x] `web/vite.config.ts`: proxy `/api` → `http://localhost:8080` + alias `@` → `web/src` + port 5173
- [x] path alias ใน `web/tsconfig.app.json` (`paths: {"@/*": ["./src/*"]}`; ไม่ใช้ `baseUrl` — TS6 deprecated)
- [x] `web/src/App.tsx` = placeholder ยิง `/api/health` (แทน demo); shell จริงทำ Phase 3
- [x] `npm run build` ผ่าน (tsc + vite) → `web/dist` (JS 191KB / gzip 60KB)
- **เช็คแล้ว (Chrome headless):** `server.js`@8080 + `vite`@5173 → `/api/health` ผ่าน proxy = `{"ok":true}`,
      React render `#root` มีลูก, `data-testid=health` = "API OK ✓", 0 console error
- **dev workflow:** ต้องรัน 2 process — `node server.js` (term 1) + `cd web && npm run dev` (term 2)

**ถัดไป → Phase 2 — ย้าย logic → `web/src/lib/`**

### Phase 2 — ย้าย logic → `web/src/lib/` — ✅ เสร็จ
port logic เดิมเป็น TS module (มี type) — ทั้งหมดไม่พึ่ง React:
- [x] `types.ts` (El/Sku/LabelDoc/ResolveCtx/Guide)
- [x] `units.ts` (PX, mm↔px, snapHalf, fmtPrice, num)
- [x] `theme.ts` (accentVars, ACCENT_CHOICES, MOODS/STOCKS, loadTheme/save* localStorage)
- [x] `elements.ts` (defaultsFor, mkEl, tplPriceTag/Sticker/Qr, resolveValue + binding, defaultSku)
- [x] `snap.ts` (snapMove, alignBox)
- [x] `print.ts` (buildPrintHTML/printElHTML — pure; `assetBase` param แทน hardcode origin)
- [x] `barcode.ts` (`import JsBarcode from 'jsbarcode'`, `import QRCode from 'qrcode'`; drawBarcode/drawQRCanvas/qrToDataURL — เลิกพึ่ง `window.*`)
- [x] `api.ts` (typed wrapper ทุก `/api/*`: skus/biz/shops/po/templates/config/health)
- [x] vitest — `lib.test.ts` **22 ผ่าน** (units/theme/elements/snap/print)
- **เช็คแล้ว:** `npm test` 22/22 เขียว · `npm run build` (tsc+vite) ผ่าน
- **หมายเหตุ:** ติดตั้ง `jsbarcode` `qrcode` (runtime) + `vitest` `@types/*` (dev)

**ถัดไป → Phase 3 — shell + store (Zustand)**

### Phase 3 — Shell + store — ✅ เสร็จ
- [x] `store/useStore.ts` (Zustand) — slice ui (view/toast) · theme (accent/mood/stock + localStorage) · header (biz/shop/conn + `loadHeader`/`selectBiz`/`selectShop` ผ่าน `api.ts`)
- [x] `App.tsx` — `Header` (โลโก้ + biz/shop dropdown + chip สถานะ) · `NavRail` (3 เมนู) · สลับ view · `Toast`
- [x] theme: `useApplyAccent` ตั้ง CSS var `--accent*` ที่ `:root` → ทั้ง shell ใช้ `var(--accent)` (ตัดปัญหา hardcode สีที่ต้นเหตุ); `initTheme` โหลด localStorage ตอน mount
- [x] ฟอนต์ offline: `@fontsource/ibm-plex-sans-thai` + mono (import ใน `main.tsx`) — ไม่พึ่ง Google Fonts
- [x] view เป็น placeholder (Design/Print) + Settings มี theme switcher ใช้งานได้จริง
- **เช็คแล้ว (Chrome headless):** สลับ 3 เมนูได้, คลิก accent → `--accent` เปลี่ยนทั้ง shell + เก็บ localStorage, mood persist, biz/shop โหลดจาก **SQL จริงผ่าน proxy** ("SQL Server · connected"), Thai render ครบ, 0 error; `build`+`test` ผ่าน
- **ลบ demo create-vite** (App.css/assets) ทิ้งแล้ว

**ถัดไป → Phase 4 — ย้ายทีละหน้า (Settings → Print → Design)**

### Phase 4 — ย้ายทีละหน้า (ง่าย→ยาก) — 🚧 กำลังทำ (1/3)
ลำดับ: **Settings → Print → Design** · ซอยเป็น commit ย่อย verify ทีละหน้า

- [x] **4a · SettingsView** (`aea5acd`) — REST/SQL tabs + form ผูก `/api/config` (load+save), SCOPE (biz/shop), THEME; ปุ่ม save themed `var(--accent)`; store เพิ่ม `setConnMode`
  - **เช็คแล้ว (headless):** โหลด `.env` จริง (SQL host/db/user), save → toast "บันทึก SQL Server แล้ว", 0 error
- [ ] **4b · PrintView** — scan bar (Fg + ค้น), grid `<table>` (Sku/Plu/Cat/Desc/Supplier/Price/Qty + ลบแถว), copies stepper, media A4/roll, **live preview**, `PoModal`, `ScanResultsModal`, ปุ่มพิมพ์
  - ⚠️ **interdependence:** preview เรนเดอร์ label จริง (elements + บาร์โค้ดบน canvas) → ต้องสร้าง **editor store slice (elements/labelW/H/bg) + `LabelPreview`/`ElementBox` + barcode/QR component (`barcode.ts` ผ่าน ref)** ในเฟสนี้ — เป็น render core ที่ **Design (4c) ใช้ซ้ำ**
  - 🔮 print window: เลือกทำ **data-URL ตั้งแต่ 4b** (ดึง Phase 5 มารวม) จะได้ไม่ต้องพึ่ง `/vendor/` ในโลก bundled
- [ ] **4c · DesignView** (ใหญ่สุดของทั้งโปรเจกต์) — `Canvas` drag/resize/zoom/pan/guides + `Inspector` (TRANSFORM/ALIGN/CONTENT/color/binding/image ครบ 6 ชนิด) + ELEMENTS palette + TEMPLATES + SAVED + LABEL SIZE + shortcuts (Arrow/Del/Esc/Ctrl+D/Space/Alt)
  - ใช้ render core จาก 4b; เพิ่มชั้น interaction
  - **เช็ค:** เพิ่ม/ย้าย/ปรับขนาด/snap/align/บันทึกแม่แบบ → `templates.json` เหมือนเดิม

> **หมายเหตุการแบ่งงาน:** 4b (Print + render core) และ 4c (editor) แต่ละอันใหญ่และเชื่อมกัน — ทำทีละเฟสในแต่ละรอบเพื่อคุม quality + verify จริงทุกหน้า (ไม่รวบรวดเดียว)

### Phase 5 — Print window (ดู จุดเสี่ยง ด้านล่าง) (1 วัน)
- [ ] ตัดสินวิธี render หน้าต่างพิมพ์ในโลก bundled (ไม่มี `/vendor/` static แล้ว)
- [ ] เทียบผลพิมพ์ A4 หลายดวง + ม้วน + Save-as-PDF กับแอปเดิม

### Phase 6 — Cutover + แพ็ก exe (1 วัน)
- [ ] `vite build` → `web/dist`
- [ ] `server.js`: ชี้ static root ไป `web/dist` (เดิมเสิร์ฟ root ของโปรเจกต์); `/` → `web/dist/index.html`
- [ ] `package.json` `pkg.assets`: เปลี่ยน `LabelDesigner.dc.html`/`support.js`/`vendor/**`
      → `web/dist/**`
- [ ] `scripts/build-exe.js`: เพิ่ม step รัน `vite build` ก่อน pkg
- [ ] ทดสอบ `.exe` จริง: เปิดได้, ออฟไลน์, ต่อ SQL, พิมพ์ผ่าน
- **เช็ค:** exe ใหม่ทำงานเทียบเท่า exe เดิมทุกฟีเจอร์

### Phase 7 — Cleanup + docs (ครึ่งวัน)
- [ ] ลบ `LabelDesigner.dc.html`, `support.js`, `vendor/`, `scripts/fetch-vendor.js`, `index.html` เดิม
- [ ] อัปเดต [Roadmap.md](Roadmap.md) / [Gotchas.md](Gotchas.md) / [Decisions.md](Decisions.md)
      (เพิ่ม ADR "ย้าย Vite, เลิก dc-runtime/Claude Design sync")
- [ ] อัปเดต `deploy/client/README.md` + `run.bat` (dev ต้องรัน 2 process หรือทำ script รวม)

---

## ตาราง mapping เดิม → ใหม่

| dc-runtime (เดิม) | Vite + React (ใหม่) |
|---|---|
| `<x-dc>` template + `{{ }}` | JSX |
| `<sc-if value="{{x}}">` | `{x && <.../>}` |
| `<sc-for list="{{xs}}" as="i">` | `{xs.map(i => <.../>)}` |
| `style="{{ obj }}"` / `style-hover` | `style={obj}` + `:hover` (CSS) / `onMouseEnter` |
| `onClick="{{ fn }}"` | `onClick={fn}` |
| `renderVals()` object ก้อนใหญ่ | ค่าใน component + `useMemo`/store |
| `class extends DCLogic` + `setState` | function component + Zustand/hooks |
| `window.JsBarcode` / `window.QRCode` | `import` จาก npm |
| `support.js` loadReactUmd + vendor | Vite bundle (ตัดทิ้ง) |
| `props.accentColor` (dc props) | CSS var `--accent` + store |

---

## จุดเสี่ยง / ของยาก

### 1. Print window (สำคัญ)
ตอนนี้ `doPrint` เปิด `window.open('', '_blank')` + `document.write(buildPrintHTML)` แล้วโหลด
JsBarcode/QR + ฟอนต์จาก `origin/vendor/...`. โลก bundled ไม่มี static `/vendor/` แล้ว — เลือกทางใดทางหนึ่ง:
- **(แนะนำ) pre-render บาร์โค้ด/QR เป็น data-URL ในแอปหลัก** แล้ว write HTML ที่มีแต่ `<img>`
  → หน้าต่างพิมพ์ไม่ต้องมี JS/lib เลย, ออฟไลน์ชัวร์, ฟอนต์ฝัง `@font-face` data-URL ได้
- หรือ render print ใน **hidden iframe / React portal** แล้วเรียก `iframe.contentWindow.print()`
- หรือชี้ `<script src>` ไปไฟล์ asset ที่ Vite build (path มี hash — ต้องอ่านจาก manifest)

### 2. Canvas drag/resize/zoom-pan
logic พิกัด (mm↔px, snap, guides) ย้ายได้ตรง ๆ แต่ event handling ต้องเป็น React
(`onMouseDown` + global `mousemove`/`mouseup` ผ่าน `useEffect`). ระวัง stale closure — ใช้ store/ref

### 3. barcode draw timing
เดิมวาดใน `componentDidUpdate` + draw-cache (`dataset.drawn`). ใน React ใช้ `useEffect([deps])`
+ ref ต่อ element; EAN13 fallback → CODE128 คงไว้

### 4. .exe / offline
Vite bundle ทุกอย่างเข้า `dist/` (มี hash) → ออฟไลน์ได้ฟรี **ไม่ต้องมี vendor/**.
ฟอนต์ IBM Plex: ใช้ `@fontsource/ibm-plex-sans-thai` (npm) ให้ Vite bundle woff2 เอง

### 5. dev workflow เปลี่ยน
เดิมดับเบิลคลิก `run.bat` → node เดียว. ใหม่ตอน dev ต้อง 2 process (server.js + vite).
prod ยังเป็น exe เดียว (รัน server.js เสิร์ฟ dist). อาจทำ `npm run dev` รวมด้วย `concurrently`

---

## Rollback
- ทุกเฟสอยู่บน branch `feat/vite-migration` — main ยังเป็นแอป dc เดิมใช้งานได้
- ยังไม่ cutover (Phase 6) ก็ทิ้ง branch ได้ทันที ไม่กระทบ production
- เก็บ tag commit สุดท้ายก่อนลบ `.dc.html`/`support.js` เผื่อย้อนดู

---

## Definition of Done
- [ ] ทุกหน้า (design/print/settings) + ทุกฟีเจอร์เทียบเท่าแอปเดิม (snap/align/theme/PO/SQL/print/templates)
- [ ] `.exe` ใหม่: เปิด-ออฟไลน์-ต่อ SQL-พิมพ์ ผ่านครบ
- [ ] ไม่มี `vendor/` / `support.js` / `.dc.html` เหลือ
- [ ] docs อัปเดต + ADR ใหม่
- [ ] เวลาโดยรวมประเมิน ~**8–11 วันทำงาน** (logic 2-3 + shell 2 + 3 หน้า 4-5 + print 1 + cutover 1)
