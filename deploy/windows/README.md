# Deploy on Windows Server

แอปคือ Node server (`server.js`) ที่เสิร์ฟไฟล์ static + เป็น proxy ไป csith (`/api/*`)
รันเป็น **Windows Service** ด้วย NSSM แล้วเปิดสู่ภายนอกผ่าน **IIS reverse proxy + HTTPS**

## ข้อกำหนด
- Server ออกเน็ตไป `cli.csith.com` ได้ (proxy ยิงจาก server)
- เครื่องผู้ใช้ออกเน็ตได้ (หน้าเว็บโหลด React/JsBarcode/QR/ฟอนต์ จาก CDN)
- ติดตั้ง **Node.js LTS ≥ 20.19 / 22.12** (https://nodejs.org) — `node -v`
  (Vite 8 ต้องการเวอร์ชันนี้ขึ้นไป)

## ขั้นตอน

### 1. เอาโค้ดขึ้น server
```powershell
cd C:\apps
git clone https://github.com/indication145/Proj_GeniuzBarCode.git
cd Proj_GeniuzBarCode
```

### 2. Build หน้าเว็บ (จำเป็น — `web\dist` ไม่อยู่ใน git)
`server.js` เสิร์ฟไฟล์จาก `web\dist` ซึ่งถูก gitignore ไว้ ต้อง build เองบน server
ไม่งั้นหน้าเว็บจะว่าง
```powershell
npm --prefix web install
npm --prefix web run build      # สร้าง web\dist
npm install                     # ติดตั้ง mssql (เฉพาะถ้าใช้ SQL Server)
```

### 3. ตั้งค่า .env (ไม่อยู่ใน git — สร้างเอง)
```powershell
Copy-Item .env.example .env
notepad .env     # ใส่ CSITH_API_KEY (ตัวใหม่!), CSITH_BIZ_ID, PORT=8282
```

### 4. ทดสอบรันก่อน
```powershell
$env:NO_OPEN=1; node server.js
# อีกหน้าต่าง: curl http://localhost:8282/api/health   -> {"ok":true}
# เปิด http://localhost:8282 ดูว่าหน้าเว็บโหลดจริง (หน้าว่าง = ข้อ 2 ยังไม่ได้ build)
```

### 5. ติดตั้งเป็น Windows Service (NSSM)
- ดาวน์โหลด NSSM จาก https://nssm.cc/download แล้ววาง `nssm.exe` ไว้บน PATH
- เปิด **PowerShell แบบ Run as Administrator**:
```powershell
.\deploy\windows\install-service.ps1            # ServiceName=GeniuzBarCode, port 8282
# หรือระบุ: .\deploy\windows\install-service.ps1 -ServiceName GeniuzBarCode -Port 8282 -Nssm C:\tools\nssm.exe
```
บริการชื่อ `GeniuzBarCode` จะรันอัตโนมัติเมื่อ boot และ log อยู่ที่ `logs\out.log` / `logs\err.log`
ถอนออก: `.\deploy\windows\uninstall-service.ps1`

### 6. เปิดสู่ภายนอกด้วย IIS (reverse proxy + HTTPS)
1. ติดตั้ง IIS + โมดูล **URL Rewrite** และ **Application Request Routing (ARR)**
2. IIS Manager → เลือก server node → *Application Request Routing* → *Server Proxy Settings* → ติ๊ก **Enable proxy**
3. สร้าง Site ผูกโดเมน (binding port **80/443**) + ผูก **HTTPS certificate**
4. วาง [`web.config`](web.config) ไว้ที่ physical root ของ Site นั้น แล้วแก้ url ใน rewrite ให้ชี้ port ที่ Node รันจริง (ค่าเริ่มต้น `localhost:8080` → เปลี่ยนเป็น `localhost:8282`)
5. Firewall: เปิด 80/443 เข้ามา; ไม่ต้องเปิด 8282 ออกนอก

> ทางเลือก: ถ้าไม่ใช้ IIS จะเปิด port 8282 ตรง ๆ ก็ได้ (ไม่มี HTTPS) — ไม่แนะนำสำหรับ production

### 7. อัปเดตเวอร์ชันภายหลัง
ใช้สคริปต์ทีเดียวจบ (git pull → install → build → restart → health check) ใน
**PowerShell แบบ Run as Administrator**:
```powershell
cd C:\apps\Proj_GeniuzBarCode
.\deploy\windows\update.ps1 -ServiceName GeniuzBarCode -Port 8282
```
build เว็บก่อน restart เสมอ ถ้า build พังจะหยุดก่อน (เวอร์ชันเดิมยังรันอยู่ ไม่ดาวน์)
`.env` ไม่ถูกแตะ ทำเสร็จเปิดเว็บแล้วกด **Ctrl+F5** เพื่อล้าง cache

ทำมือทีละขั้นก็ได้:
```powershell
cd C:\apps\Proj_GeniuzBarCode
git pull
npm --prefix web run build      # build ใหม่ทุกครั้งที่ web เปลี่ยน
nssm restart GeniuzBarCode
```

## ⚠️ ความปลอดภัย
- `/api/*` ไม่มี auth ในตัว — ใครถึง URL ได้ก็เรียก proxy (ที่ถือ key csith) ได้
  → จำกัดด้วย IP allow-list / VPN / IIS auth หรือเพิ่ม login
- `.env` ห้าม commit (อยู่ใน .gitignore แล้ว) — ใช้ API key ตัวใหม่ เพราะตัวเดิมเคยถูกเปิดเผย
