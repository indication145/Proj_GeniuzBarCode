// Build single-file Windows exe (Geniuz_Barcode.exe) with app icon.
//
// ขั้นตอน:
//   1) แปลง design/geniuz_barcode.png -> design/geniuz_barcode.ico (เติมขอบให้จัตุรัสก่อน)
//   2) ฝัง icon + version ที่ "base node binary" ของ pkg ด้วย rcedit
//   3) bundle ด้วย @yao-pkg/pkg -> dist/Geniuz_Barcode.exe (pkg ต่อ payload ท้ายไฟล์)
//
// ทำไมต้องฝัง icon ที่ base ก่อน ไม่ใช่ที่ exe สุดท้าย:
//   pkg (SEA + postject) ฝัง payload เป็น resource ในตัว exe — ถ้า rcedit ไปเขียน resource
//   ของ exe สุดท้าย payload จะเสีย → รันขึ้น "Pkg: Error reading from file"
//   จึง rcedit ที่ base ก่อน แล้วบังคับให้ pkg ใช้ base ตัวนั้นด้วย env PKG_NODE_PATH
//   (ปกติ pkg-fetch เช็ค hash ของ base ที่ cache แล้ว re-fetch ทับถ้าถูกแก้ — PKG_NODE_PATH สั่งให้ข้ามเช็ค)
//   ต้องใช้ --no-bytecode --public-packages "*" เพราะ bytecode gen ใช้ไม่ได้กับ base ที่ถูกแก้ resource
//
// รัน: npm run build:exe   (icon ฝังได้เฉพาะบน Windows; แพลตฟอร์มอื่น build ได้แต่ไม่มี icon)
"use strict";

const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const pngToIco = require("png-to-ico").default;
const pkg = require("@yao-pkg/pkg");
const { need } = require("@yao-pkg/pkg-fetch");
const rcedit = require("rcedit").rcedit;

const ROOT = path.join(__dirname, "..");
const PNG = path.join(ROOT, "design", "geniuz_barcode.png");
const ICO = path.join(ROOT, "design", "geniuz_barcode.ico");
const OUT = path.join(ROOT, "dist", "Geniuz_Barcode.exe");
const TARGET = "node22-win-x64";

const VERSION_STRING = {
  ProductName: "GeniuzBarCode Label Designer",
  FileDescription: "GeniuzBarCode Label Designer",
  CompanyName: "Geniuz",
  LegalCopyright: "Geniuz",
  OriginalFilename: "Geniuz_Barcode.exe",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// อ่านขนาด PNG จาก IHDR (กว้าง/สูง big-endian ที่ byte 16/20)
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// png-to-ico ต้องการรูปจัตุรัส — ถ้าไม่จัตุรัสให้เติมขอบโปร่งใสด้วย System.Drawing (Windows)
function ensureSquarePng(src) {
  const { w, h } = pngSize(src);
  if (w === h) return src;
  if (process.platform !== "win32") {
    throw new Error("icon PNG ไม่เป็นจัตุรัส (" + w + "x" + h + ") และเติมขอบอัตโนมัติได้เฉพาะบน Windows");
  }
  const squared = path.join(ROOT, "design", "geniuz_barcode.square.png");
  console.log("[build] รูป icon ไม่จัตุรัส (" + w + "x" + h + ") — เติมขอบให้เป็นจัตุรัส");
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    path.join(__dirname, "png-square.ps1"), "-In", src, "-Out", squared], { stdio: "inherit" });
  return squared;
}

// rcedit อาจล้มเหลวชั่วคราวถ้าไฟล์ถูก antivirus ล็อก → retry เงียบ ๆ 1-2 ครั้งแรก
async function rceditRetry(target, opts) {
  let lastErr;
  for (let i = 1; i <= 6; i++) {
    try { await rcedit(target, opts); return; }
    catch (e) {
      lastErr = e;
      if (i >= 3) console.warn("[build]   ไฟล์ยังถูกล็อก (AV?) — รอแล้วลองใหม่ ครั้งที่ " + i + "/6");
      await sleep(1500 * i);
    }
  }
  throw lastErr;
}

async function main() {
  // 0) build the Vite app -> web/dist (bundled into the exe via pkg.assets)
  console.log("[build] vite build (web/)…");
  // shell:true so Windows resolves npm.cmd (execFileSync on .cmd throws EINVAL otherwise)
  execFileSync("npm", ["--prefix", "web", "run", "build"], { stdio: "inherit", cwd: ROOT, shell: true });
  if (!fs.existsSync(path.join(ROOT, "web", "dist", "index.html"))) throw new Error("web/dist/index.html ไม่พบหลัง vite build");

  // 1) icon: png -> (square) -> ico
  if (!fs.existsSync(PNG)) throw new Error("ไม่พบไฟล์ icon ต้นฉบับ: " + PNG);
  console.log("[build] สร้าง icon จาก", path.relative(ROOT, PNG));
  const squarePng = ensureSquarePng(PNG);
  fs.writeFileSync(ICO, await pngToIco(squarePng));
  if (squarePng !== PNG) { try { fs.unlinkSync(squarePng); } catch (e) {} }  // ลบไฟล์ชั่วคราว
  console.log("[build]   ->", path.relative(ROOT, ICO), fs.statSync(ICO).size, "bytes");

  // 2) ฝัง icon + version ที่ base node binary ก่อน (เฉพาะ Windows)
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const args = [".", "--targets", TARGET, "--output", OUT];
  if (process.platform === "win32") {
    console.log("[build] เตรียม base node binary (pkg-fetch)…");
    const base = await need({ nodeRange: "node22", platform: "win", arch: "x64" });
    console.log("[build] ฝัง icon + version ที่ base:", base);
    await rceditRetry(base, { icon: ICO, "version-string": VERSION_STRING });
    process.env.PKG_NODE_PATH = base;            // สั่ง pkg ให้ใช้ base ตัวนี้ (ข้ามเช็ค hash)
    args.splice(1, 0, "--no-bytecode", "--public-packages", "*", "--public");
  } else {
    console.warn("[build] ข้ามการฝัง icon (ไม่ได้รันบน Windows) — exe จะไม่มี icon");
  }

  // 3) bundle exe
  console.log("[build] pkg ->", path.relative(ROOT, OUT));
  await pkg.exec(args);

  console.log("[build] เสร็จ ->", path.relative(ROOT, OUT));
}

main().catch((e) => {
  console.error("[build] ล้มเหลว:", (e && e.message) || e);
  process.exit(1);
});
