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
  productsPath: E.CSITH_PRODUCTS_PATH || "/api/products",
  productsArrayPath: E.CSITH_PRODUCTS_ARRAY_PATH || "",
  map: {
    sku: E.MAP_SKU || "sku,code",
    name: E.MAP_NAME || "name,productName",
    price: E.MAP_PRICE || "price",
    barcode: E.MAP_BARCODE || "barcode",
    unit: E.MAP_UNIT || "unit",
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

async function fromApi() {
  const token = await getToken();
  const res = await fetch(CFG.baseUrl + CFG.productsPath, {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("โหลดสินค้าไม่สำเร็จ (HTTP " + res.status + ")");
  const j = await res.json();
  const arr = Array.isArray(j) ? j
    : (getPath(j, CFG.productsArrayPath) || j.data || j.items || j.products || j.rows || []);
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

async function getSkus(source) {
  return source === "sql" ? fromSql() : fromApi();
}

module.exports = { getSkus, getToken, CFG };
