// Download all third-party runtime assets into vendor/ so the app runs OFFLINE
// (no CDN). Re-run whenever you bump a version below. Output is committed to the
// repo and bundled into the .exe (see package.json "pkg".assets -> vendor/**).
//
//   node scripts/fetch-vendor.js
//
// What it fetches:
//   - React + ReactDOM UMD (must match support.js REACT_URL/REACT_DOM_URL)
//   - JsBarcode + qrcodejs (must match the <script> tags in LabelDesigner.dc.html)
//   - IBM Plex Sans Thai + IBM Plex Mono woff2 subsets from Google Fonts,
//     rewritten into vendor/fonts/fonts.css with local relative url()s
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const VENDOR = path.join(ROOT, "vendor");
const FONTS = path.join(VENDOR, "fonts");

// JS libs — keep versions in sync with support.js + LabelDesigner.dc.html
const LIBS = [
  ["https://unpkg.com/react@18.3.1/umd/react.production.min.js", "react.production.min.js"],
  ["https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js", "react-dom.production.min.js"],
  ["https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js", "JsBarcode.all.min.js"],
  ["https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js", "qrcode.min.js"],
];

// Same family/weights the UI requests today (IBM Plex Sans Thai 300-700, Mono 400-600)
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
// A modern-browser UA so Google returns woff2 (not ttf for legacy UAs)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function get(url, headers, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error("too many redirects: " + url));
    https.get(url, { headers: Object.assign({ "User-Agent": UA }, headers || {}) }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(get(next, headers, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode + " for " + url));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function fetchLibs() {
  fs.mkdirSync(VENDOR, { recursive: true });
  for (const [url, name] of LIBS) {
    const buf = await get(url);
    fs.writeFileSync(path.join(VENDOR, name), buf);
    console.log("  vendor/" + name, "(" + buf.length + " bytes)");
  }
}

async function fetchFonts() {
  fs.mkdirSync(FONTS, { recursive: true });
  let css = (await get(FONT_CSS_URL)).toString("utf8");
  const urls = [...new Set((css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g) || []))];
  if (!urls.length) throw new Error("no woff2 URLs found in Google Fonts CSS — check UA/response");
  let i = 0;
  for (const u of urls) {
    const file = "ibmplex-" + (i++) + ".woff2";
    const buf = await get(u);
    fs.writeFileSync(path.join(FONTS, file), buf);
    css = css.split(u).join("./" + file); // rewrite to local relative path
    console.log("  vendor/fonts/" + file, "(" + buf.length + " bytes)");
  }
  const header =
    "/* IBM Plex Sans Thai + Mono — vendored from Google Fonts for offline use.\n" +
    "   Regenerate with: node scripts/fetch-vendor.js  (SIL Open Font License 1.1) */\n";
  fs.writeFileSync(path.join(FONTS, "fonts.css"), header + css, "utf8");
  console.log("  vendor/fonts/fonts.css (" + urls.length + " font files)");
}

(async () => {
  console.log("[fetch-vendor] downloading JS libs…");
  await fetchLibs();
  console.log("[fetch-vendor] downloading IBM Plex fonts…");
  await fetchFonts();
  console.log("[fetch-vendor] done — vendor/ is ready for offline use.");
})().catch((e) => {
  console.error("[fetch-vendor] FAILED:", (e && e.message) || e);
  process.exit(1);
});
