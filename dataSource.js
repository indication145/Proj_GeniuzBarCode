// Data source for the Label Designer: REST API (csith) + SQL Server (GeniuzPOS).
// Reads config from .env (gitignored). Never hardcode secrets here.
"use strict";
const fs = require("fs");
const path = require("path");

// --- minimal .env loader (no dependency) ---
(function loadEnv() {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
})();

const E = process.env;
const CFG = {
  baseUrl: (E.CSITH_BASE_URL || "http://cli.csith.com").replace(/\/+$/, ""),
  apiKey: E.CSITH_API_KEY || "",
  tokenPath: E.CSITH_TOKEN_PATH || "/api/system/token",
  productsPath: E.CSITH_PRODUCTS_PATH || "/Services/Geniuz/BarCode/GetBarCode",
  productsArrayPath: E.CSITH_PRODUCTS_ARRAY_PATH || "",
  bizListPath: E.CSITH_BIZ_LIST_PATH || "/Services/Administration/CsPara/GetList",
  bizId: E.CSITH_BIZ_ID || "",
  shopListPath: E.CSITH_SHOP_LIST_PATH || "/Services/Geniuz/Shop/GetShopList",
  map: {
    sku: E.MAP_SKU || "skuCode",
    name: E.MAP_NAME || "skuDesc,pluDesc",
    price: E.MAP_PRICE || "sellUnitPrice1,price",
    barcode: E.MAP_BARCODE || "pluCode,barcode",
    unit: E.MAP_UNIT || "sellUnit,stkUnit",
  },
};

// --- token cache (AccessToken valid ~ExpiresIn seconds) ---
let tokenCache = { token: null, exp: 0 };
async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
  if (!CFG.apiKey) throw new Error("CSITH_API_KEY ไม่ได้ตั้งค่าใน .env");
  const res = await fetch(CFG.baseUrl + CFG.tokenPath, {
    method: "POST",
    headers: { "X-API-Key": CFG.apiKey, "Content-Length": "0" },
  });
  if (!res.ok) throw new Error("ขอ token ไม่สำเร็จ (HTTP " + res.status + ")");
  const j = await res.json();
  const tok = j.AccessToken || j.accessToken || j.token;
  if (!tok) throw new Error("token response ไม่มี AccessToken");
  const ttlMs = (Number(j.ExpiresIn) || 3600) * 1000;
  tokenCache = { token: tok, exp: Date.now() + ttlMs - 60000 }; // refresh 1 min early
  return tok;
}

function getPath(obj, p) {
  if (!p) return obj;
  return p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function pick(row, keys) {
  for (const k of String(keys).split(",")) {
    const v = getPath(row, k.trim());
    if (v != null && v !== "") return v;
  }
  return "";
}
function normalize(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    sku: String(pick(r, CFG.map.sku)),
    name: String(pick(r, CFG.map.name)),
    price: Number(String(pick(r, CFG.map.price)).replace(/[^0-9.\-]/g, "")) || 0,
    barcode: String(pick(r, CFG.map.barcode)),
    unit: String(pick(r, CFG.map.unit)),
  })).filter(r => r.sku || r.name || r.barcode);
}

// POST helper with Bearer token (csith services use POST + JSON body)
async function apiPost(p, body) {
  const token = await getToken();
  const res = await fetch(CFG.baseUrl + p, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error("HTTP " + res.status + " จาก " + p);
  return res.json();
}

// list ธุรกิจ (bizId) จาก CsPara/GetList
async function getBizList() {
  const j = await apiPost(CFG.bizListPath, {});
  const arr = Array.isArray(j) ? j : (j.data || j.items || j.rows || []);
  return arr.map(b => ({
    bizId: b.bizId,
    bizCode: b.bizCode != null ? String(b.bizCode) : "",
    bizName: b.bizName || b.taxInvName || String(b.bizId),
    taxInvName: b.taxInvName || "",
  }));
}

// list ร้าน/สาขา ของ bizId ที่ตั้งค่าไว้ (GET ?BizId=) — ใช้พิมพ์ข้อมูลร้านลง label
async function getShopList(bizIdArg) {
  const bizId = bizIdArg || CFG.bizId;
  if (!bizId) throw new Error("ยังไม่ได้ตั้งค่า bizId — เลือกธุรกิจก่อน");
  const token = await getToken();
  const url = CFG.baseUrl + CFG.shopListPath + "?BizId=" + encodeURIComponent(bizId);
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
  if (!res.ok) throw new Error("โหลดร้านไม่สำเร็จ (HTTP " + res.status + ")");
  const j = await res.json();
  const arr = Array.isArray(j) ? j : (j.data || j.items || j.rows || []);
  return arr.map(s => ({
    shopId: s.shopId != null ? String(s.shopId) : "",
    shopName: s.shopName || "",
    shopNameEn: s.shopNameEn || "",
    branchName: s.branchName || "",
    shopAddress: s.shopAddress || "",
    shopTaxId: s.shopTaxId || "",
    shopRegName: s.shopRegName || "",
    shopRegAddressLine1: s.shopRegAddressLine1 || "",
  }));
}

// เขียน/อัปเดตค่าใน .env (เก็บ setting แบบถาวร) แล้วอัปเดต runtime ทันที
function setEnvVar(key, value) {
  const p = path.join(__dirname, ".env");
  const v = String(value);
  let lines = fs.existsSync(p) ? fs.readFileSync(p, "utf8").split(/\r?\n/) : [];
  const re = new RegExp("^\\s*" + key + "\\s*=");
  let found = false;
  lines = lines.map(l => (re.test(l) ? ((found = true), key + "=" + v) : l));
  if (!found) {
    if (lines.length && lines[lines.length - 1] === "") lines.splice(lines.length - 1, 0, key + "=" + v);
    else lines.push(key + "=" + v);
  }
  fs.writeFileSync(p, lines.join("\n"), "utf8");
  process.env[key] = v;
  if (key === "CSITH_BIZ_ID") CFG.bizId = v;
}

// สินค้า: POST GetBarCode { Fg, SearchCode, BizId }. Fg=0 ทั้งหมด, 1..21 ค้นหาตามฟิลด์
async function fromApi(opts) {
  opts = opts || {};
  const token = await getToken();
  const body = {
    Fg: String(opts.fg != null && opts.fg !== "" ? opts.fg : 0),
    SearchCode: opts.code != null ? String(opts.code) : "",
    BizId: String(CFG.bizId || ""),
  };
  const res = await fetch(CFG.baseUrl + CFG.productsPath, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("โหลดสินค้าไม่สำเร็จ (HTTP " + res.status + ")");
  const j = await res.json();
  const arr = Array.isArray(j) ? j
    : ((CFG.productsArrayPath ? getPath(j, CFG.productsArrayPath) : null) || j.data || j.items || j.products || j.rows || []);
  return normalize(arr);
}

async function fromSql() {
  let mssql;
  try { mssql = require("mssql"); }
  catch (e) { throw new Error("ยังไม่ได้ติดตั้ง mssql — รัน: npm install mssql"); }
  if (!E.SQL_HOST || !E.SQL_DATABASE) throw new Error("SQL config ไม่ครบใน .env");
  const pool = await mssql.connect({
    server: E.SQL_HOST,
    port: Number(E.SQL_PORT) || 1433,
    database: E.SQL_DATABASE,
    user: E.SQL_USER,
    password: E.SQL_PASSWORD,
    options: {
      encrypt: String(E.SQL_ENCRYPT) !== "false",
      trustServerCertificate: String(E.SQL_TRUST_CERT) !== "false",
    },
  });
  const q = E.SQL_QUERY || "SELECT sku, name, price, barcode, unit FROM Products";
  const result = await pool.request().query(q);
  return normalize(result.recordset);
}

async function getSkus(source, opts) {
  return source === "sql" ? fromSql() : fromApi(opts);
}

module.exports = { getSkus, getToken, getBizList, getShopList, setEnvVar, CFG };
