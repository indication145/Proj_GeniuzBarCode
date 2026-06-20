# Build a single .exe for end-user machines

แพ็กแอปเป็นไฟล์ `.exe` เดียว ที่ end-user **ดับเบิลคลิกแล้วใช้ได้เลย ไม่ต้องติดตั้ง Node**
(static files ถูก bundle เข้าไปในตัว; `.env` อ่าน/เขียนข้าง ๆ ตัว exe)

## บนเครื่อง build (เครื่อง dev ที่มี Node 18+ และต่อเน็ต)
```powershell
cd <repo>
npm install                 # ดึง @yao-pkg/pkg, png-to-ico, rcedit (และ mssql ถ้าจะใช้)
npm run build:exe           # ได้ dist\Geniuz_Barcode.exe (~95 MB)
```
> ครั้งแรก pkg จะดาวน์โหลด Node base binary (ต้องต่อเน็ต) — ครั้งถัดไปเร็วขึ้น
> build:exe ([scripts/build-exe.js](../../scripts/build-exe.js)) จะ:
> 1. สร้าง icon จาก `design/geniuz_barcode.png` (เติมขอบให้จัตุรัส → .ico)
> 2. ฝัง icon + version ที่ **base node binary** ด้วย rcedit แล้วบังคับ pkg ใช้ base นั้น (`PKG_NODE_PATH`)
> 3. bundle ด้วย `--no-bytecode --public-packages "*"` (จำเป็นเมื่อใช้ base ที่ถูกแก้ resource)
>
> ⚠️ ห้าม rcedit ตัว exe สุดท้ายโดยตรง — pkg ฝัง payload เป็น resource ในตัว exe (SEA) การแก้ resource
> ภายหลังจะทำ payload เสีย → รันขึ้น "Pkg: Error reading from file" (จึงต้องฝัง icon ที่ base ก่อน build)
> หมายเหตุ: `--no-bytecode` ทำให้ซอร์สถูกฝังแบบอ่านได้ในตัว exe (ยอมรับได้สำหรับ tool ภายใน) และไฟล์ใหญ่ขึ้น

## ส่งให้ end-user (ในโฟลเดอร์เดียวกัน)
```
Geniuz_Barcode.exe       <- ตัวโปรแกรม (มี icon Geniuz)
.env                     <- คัดลอกจาก .env.example แล้วใส่ค่า (อยู่ข้าง ๆ exe)
```
- ดับเบิลคลิก `Geniuz_Barcode.exe` → เปิด server ที่ `http://localhost:8080` และเปิดเบราว์เซอร์ให้อัตโนมัติ
- ปิดโปรแกรมด้วยการปิดหน้าต่าง console

## เรื่อง .env บนเครื่อง client
- ไฟล์ `.env` **ต้องอยู่โฟลเดอร์เดียวกับ .exe** (ตัวแอปอ่าน/เขียนที่นั่น)
- ค่าที่เลือกในแอป (เช่น bizId) จะถูกบันทึกกลับลง `.env` นี้
- ⚠️ ทุกเครื่องจะมี API key ในไฟล์ `.env` → ถ้ามีหลายเครื่อง ควรใช้ key ที่จำกัดสิทธิ์ และพร้อม rotate

## ข้อจำกัด
- ยังต้องต่อเน็ต (ยิง csith + โหลด lib จาก CDN)
- โหมด **SQL Server ใช้ใน .exe ได้** (mssql ใช้ driver `tedious` ซึ่งเป็น pure JS — pkg แพ็กได้)
  ต้องวาง `.env` ข้าง exe ให้มี `DATA_SOURCE=sql` + `SQL_HOST/SQL_DATABASE/SQL_USER/SQL_PASSWORD` แล้วเครื่อง client ต้องต่อถึง SQL Server ได้
