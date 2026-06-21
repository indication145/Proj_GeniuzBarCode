# Responsive Plan — ใช้งานบนมือถือ/แท็บเล็ต

แผนทำให้ **GeniuzBarCode Label Designer** (Vite + React; ดู [Architecture.md](Architecture.md)) ใช้บนจอเล็กได้
แบบเป็นเฟส (Print/Settings ก่อน → Editor บนแท็บเล็ต → มือถือเล็ก)

> สถานะ: **R0–R3 เสร็จครบ** ✅ (เหลือทดสอบพิมพ์/ลากบนมือถือ**จริง** 1 เครื่องตามจุดเสี่ยง)

---

## เป้าหมาย / ไม่ใช่เป้าหมาย
**เป้าหมาย**
- หน้า **พิมพ์ป้ายราคา** + **ตั้งค่า** ใช้บนมือถือได้จริง (สแกน/เพิ่ม/พิมพ์/ตั้งค่า)
- หน้า **สร้าง Template** ใช้บน **แท็บเล็ต** ได้ (touch drag/resize, panel พับ)
- ไม่ทำลาย desktop (ยังเป็นหลัก)

**ไม่ใช่เป้าหมาย**
- ไม่ทำ native app — เป็น responsive web ในเบราว์เซอร์มือถือ
- ไม่รื้อ data layer / store / API (เปลี่ยนเฉพาะ layout + input ของ UI)

---

## จุดตั้งต้น (ของที่ต้องแก้)
- **layout ความกว้างคงที่** — `App` = Header(54px) + [NavRail(72px) | view]; DesignView = Sidebar(252) | Canvas | Inspector(288); PrintView = grid | preview(480)
- **inline styles ล้วน** (`React.CSSProperties`) → ทำ `@media` ตรง ๆ ไม่ได้ → ต้องมี `useMediaQuery` หรือย้าย layout หลักไป CSS class
- **canvas ใช้ mouse events** (`onMouseDown` + window `mousemove/mouseup` + `wheel`) → ต้องเป็น **pointer events** ให้รองรับนิ้ว + pinch
- `index.html` มี `<meta viewport>` แล้ว ✓

---

## รากฐานทางเทคนิค (ทำใน R0)
**breakpoints** (เสนอ)
```
mobile : < 640px      tablet : 640–1023px      desktop : ≥ 1024px
```
**1) `useMediaQuery` hook** (`web/src/lib/useMediaQuery.ts`)
```ts
export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches)
  useEffect(() => { const mq = matchMedia(q); const h = () => setM(mq.matches)
    mq.addEventListener('change', h); return () => mq.removeEventListener('change', h) }, [q])
  return m
}
// useStore: isMobile = useMediaQuery('(max-width: 639px)'), isTablet = '(max-width: 1023px)'
```
**2) layout หลักย้ายไป CSS class** (`index.css`) — ส่วนที่ต้องพึ่ง `@media` (เช่น flex direction, panel width/drawer) ใช้ class; ส่วน cosmetic คงเป็น inline ได้
**3) Drawer pattern** — panel ซ้าย/ขวาบนจอเล็ก = overlay + `transform: translateX()` + ปุ่ม toggle + backdrop
**4) Pointer events** — แปลง Canvas เป็น `onPointerDown/Move/Up` + `setPointerCapture`; `touch-action: none` ที่ viewport; pinch-zoom = ติดตาม 2 pointer

---

## เฟส

### R0 — Foundation (~0.5–1 วัน) ✅ เสร็จ
- [x] `useMediaQuery` hook + breakpoint constants → [web/src/lib/useMediaQuery.ts](../web/src/lib/useMediaQuery.ts) (`useMediaQuery`, `useBreakpoint`, `BP`)
- [x] เพิ่ม `isMobile`/`isTablet` เข้าถึงได้ → `useBreakpoint()` คืน `{ isMobile, isTablet, isDesktop }`
- [ ] ตั้ง `touch-action: none` ที่ viewport canvas (กัน scroll ชนการลาก) — **ยกไป R2** (ทำพร้อม pointer events)
- [x] โครง responsive ของ App shell — `App.tsx` ย้าย NavRail ลงล่างเมื่อ mobile
- **เช็ค:** ✅ verify ด้วย headless Chrome 3 viewport (390/820/1280) — isMobile/isTablet สลับถูก, desktop ไม่เปลี่ยน

### R1 — Print + Settings responsive (คุ้มสุด · ~2–3 วัน) — เกือบเสร็จ
- [x] **Header** — มือถือ: ซ่อน subtitle, ย้าย biz/shop เป็นแถวสอง (เต็มกว้าง), chip ย่อเหลือ SQL/REST
- [x] **NavRail** → **bottom tab bar** บนมือถือ (3 ไอคอน) + `safe-area-inset-bottom`
- [x] **PrintView**
  - [x] grid `<table>` → **card list** ต่อ SKU บน < 1024 (ชื่อ/ราคา/รหัส + stepper + ลบ)
  - [x] preview panel → **tab สลับ "รายการ / ตัวอย่าง"** บน < 1024
  - [x] media row / scan bar / footer → wrap + ปุ่มเต็มกว้างบนมือถือ
  - [x] `PoModal`/`ScanResultsModal` → **full-screen sheet** บนมือถือ (100vw × 100dvh, search row wrap)
- [x] **SettingsView** — คู่ฟิลด์ (host/port, user/pass, biz/shop, mood/stock) stack 1 คอลัมน์บนมือถือ + ลด padding
- [x] **พิมพ์บนมือถือ:** เพิ่ม `openPrintFrame` (พิมพ์ผ่าน hidden iframe) → เลี่ยง popup-blocker ของมือถือ; native print sheet มี "Save as PDF" ทั้ง iOS/Android ในตัว → มือถือใช้ iframe เป็นหลัก, desktop ใช้ popup แล้ว fallback เป็น iframe
- **เช็ค:** ✅ emulate ผ่าน (layout + modal เต็มจอ) · ⏳ ยังไม่ทดสอบ flow พิมพ์จริงบนมือถือ 1 เครื่อง (โค้ดพร้อม)

### R2 — Editor บนแท็บเล็ต (~3–4 วัน) ✅ เสร็จ
- [x] `DesignSidebar` + `Inspector` → **drawer พับ** บน < 1024 (`DesignView` คุม state, ปุ่มเปิดบน toolbar canvas: ☰ องค์ประกอบ / ปรับแต่ง ⚙) ; desktop คง 3 คอลัมน์
- [x] **Canvas → pointer events** (mouse + touch): `onPointerDown/Move/Up/Cancel`, `setPointerCapture`, `touch-action:none`
- [x] **pinch-zoom** (2 pointer, anchor ที่จุดกึ่งกลาง) + **1-finger pan** บนพื้นที่ว่าง (touch) ; handle ปรับขนาดใหญ่ขึ้นบน `(pointer:coarse)` (17px แทน 9px)
- [x] toolbar canvas (undo/redo + zoom เดิม) + ปุ่มเปิด drawer ; เพิ่ม element ทำผ่าน drawer ซ้าย
- **เช็ค:** ✅ verify ที่ 834px (touch emulate) — drawer เปิด/ปิด, toolbar แสดง, touch pan ทำงาน · ⏳ ลาก/resize ละเอียดด้วยนิ้วจริงยังไม่ทดสอบบนเครื่องจริง

### R3 — มือถือเล็ก: ดู/พิมพ์ (optional · ~1 วัน) ✅ เสร็จ
- [x] บนมือถือ (< 640) หน้า Design = **โหมดพรีวิว** (`MobileDesignView` ใน DesignView) — แสดง `LabelPreview` แบบอ่านอย่างเดียว (ไม่มี drag/resize), fit-to-screen อัตโนมัติ
- [x] drawer "☰ แม่แบบ / ขนาด" (reuse `DesignSidebar`) เปลี่ยน preset/ขนาด/บันทึก/เปิดแม่แบบได้
- [x] ปุ่มเด่น **"ไปหน้าพิมพ์ป้ายราคา →"** + ข้อความบอกว่าแก้ละเอียดบนจอใหญ่ → เน้น flow เลือกแม่แบบ → พิมพ์

---

## ตาราง layout เดิม → responsive

| ส่วน | desktop (≥1024) | tablet (640–1023) | mobile (<640) |
|---|---|---|---|
| NavRail | rail ซ้าย 72px | rail ซ้าย | **bottom tab bar** |
| Header biz/shop | inline ขวา | inline/ย่อ | แถวสอง หรือ sheet |
| Design sidebar/inspector | 252 / 288 คงที่ | **drawer พับ** | ซ่อน (โหมดพรีวิว) |
| Print grid | table + preview ข้าง | table, preview ใต้ | **cards**, preview tab |
| Modals (PO/scan) | กลางจอ | กลางจอ | **full-screen sheet** |

---

## จุดเสี่ยง
1. **inline styles เยอะ** — refactor layout ผ่าน `useMediaQuery` ต้องแตะหลาย component; ทำทีละหน้า (R1 ก่อน) ลดความเสี่ยง
2. **touch drag/resize ใน canvas** — ส่วนยากสุด: ต้องคุม `touch-action`, pinch vs drag, handle ขนาดนิ้ว; snap ช่วยได้
3. **พิมพ์บนมือถือ** — พฤติกรรม print dialog ต่างกันแต่ละ OS/เบราว์เซอร์ → ต้องทดสอบจริง + อาจต้องปุ่มดาวน์โหลด PDF สำรอง
4. **ไม่มีคีย์บอร์ด** บนมือถือ → ฟีเจอร์ที่พึ่ง shortcut (undo/nudge/delete) ต้องมีปุ่มบนจอ (มี align/dup/delete/undo ปุ่มแล้ว ขยายให้ครบ)

## ทดสอบ
- Chrome DevTools device emulation + viewport ต่าง ๆ; Playwright/puppeteer ตั้ง `viewport` + `isMobile`/`hasTouch` จำลอง touch ได้
- ทดสอบจริงบนมือถือ 1 เครื่อง (iOS Safari + Android Chrome) อย่างน้อยหน้า Print

## Definition of Done
- [x] หน้า Print + Settings ใช้งานครบบนมือถือ (สแกน/เพิ่ม/พิมพ์/ตั้งค่า) — layout verify แล้ว
- [x] Editor ใช้บนแท็บเล็ตได้ (touch drag/resize/snap/save) — pointer events + drawers
- [x] desktop ไม่ regress — ≥1024 ใช้ layout เดิมทุกหน้า (เช็คด้วย screenshot 1280px)
- [x] พิมพ์ออก PDF/เครื่องพิมพ์ได้จากมือถือ — iframe print + "Save as PDF" ใน native sheet
- ⏳ เหลือ: ทดสอบบนเครื่องจริง 1 เครื่อง (iOS Safari + Android Chrome) — พฤติกรรม print sheet + ลาก/resize ด้วยนิ้ว
- เวลาโดยรวมประเมิน ~**6–9 วันทำงาน** (R0 0.5–1 + R1 2–3 + R2 3–4 + R3 1)
