# Design — Print Labels & Barcodes

ภาษาดีไซน์ของ **GeniuzBarCode Label Designer** (ออกแบบ & พิมพ์ป้าย)

## Layout

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (54px)  โลโก้ G · ชื่อแม่แบบ · สถานะเชื่อมต่อ · บันทึก · พิมพ์ป้าย │
├──────────┬──────────────────────────────────┬───────────────┤
│ LEFT     │ CANVAS (zoom/pan)                │ RIGHT          │
│ 252px    │   ป้าย mm จริง + selection handles │ 288px          │
│          │                                  │                │
│ ELEMENTS │   [zoom -/fit/+]  [ขนาด mm]       │ INSPECTOR      │
│ TEMPLATES├──────────────────────────────────┤ - ไม่เลือก:      │
│ LABEL    │ DATA SOURCE dock (แถบ SKU)         │   ตั้งค่าป้าย     │
│ SIZE     │                                  │ - เลือก: แก้ไข   │
└──────────┴──────────────────────────────────┴───────────────┘
                 PRINT MODAL (overlay) — ตั้งค่า + preview
```

- **ซ้าย:** เพิ่มองค์ประกอบ (ข้อความ/ราคา/บาร์โค้ด/QR/รูป/กรอบ), แม่แบบสำเร็จรูป, เลือก/กำหนดขนาดป้าย
- **กลาง:** canvas แสดงป้ายขนาดจริง (mm), แถบ SKU ด้านล่างคลิกเพื่อ live preview, ปุ่ม zoom
- **ขวา:** inspector — เลือก element แล้วแก้ transform/เนื้อหา/สไตล์/ผูกข้อมูล; ถ้าไม่เลือกจะแสดงตั้งค่าป้าย

## Color tokens

| บทบาท | สี |
|-------|-----|
| Accent (หลัก) | `#7b1fa2` ม่วงเข้ม — ปุ่มหลัก, focus, active, โลโก้ (เฉดอื่น derive จาก `accentVars()`) |
| Accent tint อ่อน | `#F4EAF8` (พื้นม่วงอ่อน เช่น hover ปุ่มลบ) |
| พื้นหลังแอป | `#F4F3F1` |
| พื้นการ์ด/แผง | `#ffffff` / `#FBFAF9` / `#FAFAF9` |
| ข้อความหลัก | `#1B1A18` · รอง `#44403B` · จาง `#9A938A` / `#78716c` |
| เส้นขอบ | `#E6E3DF` / `#EBE8E3` / `#EFEDEA` |
| สำเร็จ/เชื่อมต่อ | เขียว `#1F8A5B` (พื้น `#F0F7F2`) |

## Typography
- **IBM Plex Sans Thai** — ตัวหลัก (น้ำหนัก 300–700)
- **IBM Plex Mono** — ตัวเลข, label เทคนิค, โค้ด/รหัส SKU

## Component swatches (ตัวเลือกสีให้ผู้ใช้)
- สีข้อความ/กรอบ: ดำ `#1b1a18`, เทา `#807A72`, ม่วง `#7b1fa2`, น้ำเงิน `#1F6FEB`, เขียว `#1F8A5B`, ขาว `#ffffff`
- พื้นหลังป้าย (labelStock): plain ขาว, cream, kraft, thermal

## Motion
keyframes ใน `<style>`: `geToast` (toast), `gePop` (modal), `geFade`, `gePulse` (จุดสถานะเชื่อมต่อ), `geRise`, `geSpin`

## หลักการ
- โทน warm-neutral + accent ม่วงเข้มจุดเดียว เน้น contrast ที่ปุ่ม action
- canvas เป็น "ของจริง" (mm) ไม่ใช่ abstract — ผู้ใช้เห็นขนาดพิมพ์จริง
- ข้อความ UI ภาษาไทยเป็นหลัก + label เทคนิค (ELEMENTS/TRANSFORM) เป็น mono อังกฤษ
