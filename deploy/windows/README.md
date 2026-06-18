# Deploy on Windows Server

แอปคือ Node server (`server.js`) ที่เสิร์ฟไฟล์ static + เป็น proxy ไป csith (`/api/*`)
รันเป็น **Windows Service** ด้วย NSSM แล้วเปิดสู่ภายนอกผ่าน **IIS reverse proxy + HTTPS**

## ข้อกำหนด
- Server ออกเน็ตไป `cli.csith.com` ได้ (proxy ยิงจาก server)
- เครื่องผู้ใช้ออกเน็ตได้ (หน้าเว็บโหลด React/JsBarcode/QR/ฟอนต์ จาก CDN)
- ติดตั้ง **Node.js 18+** (https://nodejs.org) — `node -v`

## ขั้นตอน

### 1. เอาโค้ดขึ้น server
```powershell
cd C:\apps
git clone https://github.com/indication145/Proj_GeniuzBarCode.git
cd Proj_GeniuzBarCode
```

### 2. ตั้งค่า .env (ไม่อยู่ใน git — สร้างเอง)
```powershell
Copy-Item .env.example .env
notepad .env     # ใส่ CSITH_API_KEY (ตัวใหม่!), CSITH_BIZ_ID, PORT=8080
```

### 3. (เฉพาะใช้ SQL Server) ติดตั้ง dependency
```powershell
npm install
```

### 4. ทดสอบรันก่อน
```powershell
$env:NO_OPEN=1; node server.js
# อีกหน้าต่าง: curl http://localhost:8080/api/health   -> {"ok":true}
```

### 5. ติดตั้งเป็น Windows Service (NSSM)
- ดาวน์โหลด NSSM จาก https://nssm.cc/download แล้ววาง `nssm.exe` ไว้บน PATH
- เปิด **PowerShell แบบ Run as Administrator**:
```powershell
.\deploy\windows\install-service.ps1            # ใช้ port 8080
# หรือระบุ: .\deploy\windows\install-service.ps1 -Port 8080 -Nssm C:\tools\nssm.exe
```
บริการชื่อ `LabelDesigner` จะรันอัตโนมัติเมื่อ boot และ log อยู่ที่ `logs\out.log` / `logs\err.log`
ถอนออก: `.\deploy\windows\uninstall-service.ps1`

### 6. เปิดสู่ภายนอกด้วย IIS (reverse proxy + HTTPS)
1. ติดตั้ง IIS + โมดูล **URL Rewrite** และ **Application Request Routing (ARR)**
2. IIS Manager → เลือก server node → *Application Request Routing Cache* → *Server Proxy Settings* → ติ๊ก **Enable proxy**
3. สร้าง Site ผูกโดเมน + ผูก **HTTPS certificate**
4. วาง [`web.config`](web.config) ไว้ที่ physical root ของ Site นั้น (proxy ไป `localhost:8080`)
5. Firewall: เปิด 80/443 เข้ามา; ไม่ต้องเปิด 8080 ออกนอก

> ทางเลือก: ถ้าไม่ใช้ IIS จะเปิด port 8080 ตรง ๆ ก็ได้ (ไม่มี HTTPS) — ไม่แนะนำสำหรับ production

### 7. อัปเดตเวอร์ชันภายหลัง
```powershell
cd C:\apps\Proj_GeniuzBarCode
git pull
nssm restart LabelDesigner
```

## ⚠️ ความปลอดภัย
- `/api/*` ไม่มี auth ในตัว — ใครถึง URL ได้ก็เรียก proxy (ที่ถือ key csith) ได้
  → จำกัดด้วย IP allow-list / VPN / IIS auth หรือเพิ่ม login
- `.env` ห้าม commit (อยู่ใน .gitignore แล้ว) — ใช้ API key ตัวใหม่ เพราะตัวเดิมเคยถูกเปิดเผย
