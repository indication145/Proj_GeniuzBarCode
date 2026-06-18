# Build a single .exe for end-user machines

แพ็กแอปเป็นไฟล์ `.exe` เดียว ที่ end-user **ดับเบิลคลิกแล้วใช้ได้เลย ไม่ต้องติดตั้ง Node**
(static files ถูก bundle เข้าไปในตัว; `.env` อ่าน/เขียนข้าง ๆ ตัว exe)

## บนเครื่อง build (เครื่อง dev ที่มี Node 18+ และต่อเน็ต)
```powershell
cd <repo>
npm install                 # ดึง @yao-pkg/pkg (และ mssql ถ้าจะใช้)
npm run build:exe           # ได้ dist\LabelDesigner.exe (~50-90 MB)
```
> ครั้งแรก pkg จะดาวน์โหลด Node base binary (ต้องต่อเน็ต) — ครั้งถัดไปเร็วขึ้น

## ส่งให้ end-user (ในโฟลเดอร์เดียวกัน)
```
LabelDesigner.exe        <- ตัวโปรแกรม
.env                     <- คัดลอกจาก .env.example แล้วใส่ค่า (อยู่ข้าง ๆ exe)
```
- ดับเบิลคลิก `LabelDesigner.exe` → เปิด server ที่ `http://localhost:8080` และเปิดเบราว์เซอร์ให้อัตโนมัติ
- ปิดโปรแกรมด้วยการปิดหน้าต่าง console

## เรื่อง .env บนเครื่อง client
- ไฟล์ `.env` **ต้องอยู่โฟลเดอร์เดียวกับ .exe** (ตัวแอปอ่าน/เขียนที่นั่น)
- ค่าที่เลือกในแอป (เช่น bizId) จะถูกบันทึกกลับลง `.env` นี้
- ⚠️ ทุกเครื่องจะมี API key ในไฟล์ `.env` → ถ้ามีหลายเครื่อง ควรใช้ key ที่จำกัดสิทธิ์ และพร้อม rotate

## ข้อจำกัด
- ยังต้องต่อเน็ต (ยิง csith + โหลด lib จาก CDN)
- โหมด **SQL Server ไม่ทำงานใน .exe** (native module `mssql` แพ็กไม่ได้) — ใช้ได้เฉพาะ REST API
  ถ้าต้องใช้ SQL ให้รันแบบ `node server.js` หรือ deploy บน server แทน
