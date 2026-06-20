// Data source for the Label Designer: REST API (csith) + SQL Server (GeniuzPOS).
// Reads config from .env (gitignored). Never hardcode secrets here.
"use strict";
const fs = require("fs");
const path = require("path");

// When packaged as a single .exe (pkg), read/write .env next to the exe,
// not inside the read-only snapshot. Otherwise use the project dir.
const BASE_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;

// --- minimal .env loader (no dependency) ---
(function loadEnv() {
  const p = path.join(BASE_DIR, ".env");
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
  purInvoicePath: E.CSITH_PUR_INVOICE_PATH || "/Services/Geniuz/BarCode/GetPurInvoice",
  map: {
    sku: E.MAP_SKU || "skuCode",
    name: E.MAP_NAME || "skuDesc,pluDesc",
    price: E.MAP_PRICE || "sellUnitPrice1,price",
    barcode: E.MAP_BARCODE || "pluCode,barcode",
    unit: E.MAP_UNIT || "sellUnit,stkUnit",
    pluCode: E.MAP_PLU || "pluCode",
    catCode: E.MAP_CATCODE || "catCode,deptCode",
    catName: E.MAP_CATNAME || "catName,deptName",
    skuDesc: E.MAP_SKUDESC || "skuDesc,pluDesc",
    supplierId: E.MAP_SUPID || "supplierId,supplId,supId",
    supplierName: E.MAP_SUPNAME || "supplierName,supplName,supName",
  },
  // โหมดแหล่งข้อมูล: api (REST) หรือ sql (SQL Server) — มีผลกับ biz/shop/po/products
  dataSource: (E.DATA_SOURCE || "api").toLowerCase(),
  // SQL queries (อ่านชื่อคอลัมน์แบบ case-insensitive จะวาง SQL ดิบได้). param: @bizId, @code, @doc
  bizQuery: E.SQL_BIZ_QUERY || "SELECT BizId, BizCode, BizName, TaxInvName, TaxInvAddrLine1 FROM csPara ORDER BY BizId",
  shopQuery: E.SQL_SHOP_QUERY || "SELECT ShopId, ShopTypeId, ShopGroupId, ShopName, ShopNameEn, BranchName, BranchNameEn, ShopAddress, ShopRegId, ShopTaxId, ShopRegName, ShopRegAddressLine1, BizId FROM [dbo].[psShop] WHERE BizId = @bizId AND IsActive = 1",
  // สินค้า — table-valued function (รับ @fg, @code, @bizId เหมือน REST GetBarCode)
  productsQuery: E.SQL_QUERY || E.SQL_PRODUCTS_QUERY || "SELECT * FROM dbo.csbarcode_GetSkuPluInfo(@fg, @code, @bizId)",
  // ใบสั่งซื้อ (PO) — @docFg: 0=ใบสั่งซื้อ, 1=GR, 2=ใบรับเข้า
  poQuery: E.SQL_PO_QUERY || "SELECT * FROM [dbo].[csbarcode_GetPurInvoice](@fg, @code, @bizId, @docFg)",
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
  if (row == null) return "";
  // map คีย์เป็น lowercase ครั้งเดียว → รองรับทั้ง REST (camelCase) และ SQL (PascalCase)
  const lower = {};
  for (const k of Object.keys(row)) lower[k.toLowerCase()] = row[k];
  for (const k of String(keys).split(",")) {
    const key = k.trim();
    const v = key.indexOf(".") >= 0 ? getPath(row, key) : lower[key.toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return "";
}
// format วันที่เป็น YYYY-MM-DD (รองรับทั้ง Date object จาก SQL และ string จาก REST)
function fmtDate(d) {
  if (d == null || d === "") return "";
  if (d instanceof Date) {
    if (isNaN(d)) return "";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  return String(d).slice(0, 10);
}
// อ่านค่าจาก row โดยไม่สนตัวพิมพ์เล็ก/ใหญ่ (รองรับคอลัมน์ SQL แบบ PascalCase)
function ciGet(row /* , ...names */) {
  if (!row) return undefined;
  const lower = {};
  for (const k of Object.keys(row)) lower[k.toLowerCase()] = row[k];
  for (let i = 1; i < arguments.length; i++) {
    const v = lower[String(arguments[i]).toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return undefined;
}
function normalize(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    sku: String(pick(r, CFG.map.sku)),
    name: String(pick(r, CFG.map.name)),
    price: Number(String(pick(r, CFG.map.price)).replace(/[^0-9.\-]/g, "")) || 0,
    barcode: String(pick(r, CFG.map.barcode)),
    unit: String(pick(r, CFG.map.unit)),
    qty: Number(String(pick(r, "qty")).replace(/[^0-9.\-]/g, "")) || 0,
    pluCode: String(pick(r, CFG.map.pluCode)),
    catCode: String(pick(r, CFG.map.catCode)),
    catName: String(pick(r, CFG.map.catName)),
    skuDesc: String(pick(r, CFG.map.skuDesc)),
    supplierId: String(pick(r, CFG.map.supplierId)),
    supplierName: String(pick(r, CFG.map.supplierName)),
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

// list ธุรกิจ (bizId) — REST: CsPara/GetList | SQL: SQL_BIZ_QUERY (csPara)
async function getBizList() {
  if (CFG.dataSource === "sql") {
    const rows = await sqlQuery(CFG.bizQuery);
    return rows.map(b => {
      const id = ciGet(b, "bizId");
      return {
        bizId: id,
        bizCode: ciGet(b, "bizCode") != null ? String(ciGet(b, "bizCode")) : "",
        bizName: ciGet(b, "bizName") || ciGet(b, "taxInvName") || String(id != null ? id : ""),
        taxInvName: ciGet(b, "taxInvName") || "",
      };
    });
  }
  const j = await apiPost(CFG.bizListPath, {});
  const arr = Array.isArray(j) ? j : (j.data || j.items || j.rows || []);
  return arr.map(b => ({
    bizId: b.bizId,
    bizCode: b.bizCode != null ? String(b.bizCode) : "",
    bizName: b.bizName || b.taxInvName || String(b.bizId),
    taxInvName: b.taxInvName || "",
  }));
}

// list ร้าน/สาขา ของ bizId ที่ตั้งค่าไว้ — REST: Shop/GetShopList | SQL: SQL_SHOP_QUERY (psShop)
async function getShopList(bizIdArg) {
  const bizId = bizIdArg || CFG.bizId;
  if (!bizId) throw new Error("ยังไม่ได้ตั้งค่า bizId — เลือกธุรกิจก่อน");
  if (CFG.dataSource === "sql") {
    const rows = await sqlQuery(CFG.shopQuery, { bizId });
    return rows.map(s => ({
      shopId: ciGet(s, "shopId") != null ? String(ciGet(s, "shopId")) : "",
      shopName: ciGet(s, "shopName") || "",
      shopNameEn: ciGet(s, "shopNameEn") || "",
      branchName: ciGet(s, "branchName") || "",
      shopAddress: ciGet(s, "shopAddress") || "",
      shopTaxId: ciGet(s, "shopTaxId") || "",
      shopRegName: ciGet(s, "shopRegName") || "",
      shopRegAddressLine1: ciGet(s, "shopRegAddressLine1") || "",
    }));
  }
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

// list ใบสั่งซื้อ (PO) — POST GetPurInvoice { DocFg, Fg, SearchCode, BizId }
// Fg: 0=ทั้งหมด, 1=SysDocNo, 2=SupplierId, 3=DocDate, 4=WhsId, 5=RefDocNo1
async function getPurInvoices(opts) {
  opts = opts || {};
  if (CFG.dataSource === "sql") {
    const fg = (opts.fg != null && opts.fg !== "") ? Number(opts.fg) : 0;
    const rows = await sqlQuery(CFG.poQuery, {
      fg: isNaN(fg) ? 0 : fg,
      code: opts.code != null ? String(opts.code) : "",
      bizId: Number(CFG.bizId) || 0,
      docFg: 0,
    });
    return rows.map(p => ({
      sysDocNo: ciGet(p, "sysDocNo") || "",
      supplierId: ciGet(p, "supplierId") || "",
      docDate: fmtDate(ciGet(p, "docDate")),
      whsId: ciGet(p, "whsId") || "",
      purIvNo: ciGet(p, "purIvNo") || "",
    })).filter(p => p.sysDocNo);
  }
  const j = await apiPost(CFG.purInvoicePath, {
    DocFg: 0,
    Fg: Number(opts.fg != null && opts.fg !== "" ? opts.fg : 0),
    SearchCode: opts.code != null ? String(opts.code) : "",
    BizId: CFG.bizId || "",
  });
  const arr = Array.isArray(j) ? j : (j.data || j.items || j.rows || []);
  return arr.map(p => ({
    sysDocNo: p.sysDocNo || "",
    supplierId: p.supplierId || "",
    docDate: p.docDate ? String(p.docDate).slice(0, 10) : "",
    whsId: p.whsId || "",
    purIvNo: p.purIvNo || "",
  })).filter(p => p.sysDocNo);
}

// รายการสินค้าของใบสั่งซื้อ — Fg=22, SearchCode=<sysDocNo> (REST GetBarCode | SQL GetSkuPluInfo)
async function getPoLines(docNo) {
  if (!docNo) throw new Error("ต้องระบุเลขใบสั่งซื้อ (sysDocNo)");
  return CFG.dataSource === "sql" ? fromSql({ fg: "22", code: docNo }) : fromApi({ fg: "22", code: docNo });
}

// เขียน/อัปเดตค่าใน .env (เก็บ setting แบบถาวร) แล้วอัปเดต runtime ทันที
function setEnvVar(key, value) {
  const p = path.join(BASE_DIR, ".env");
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
  // อัปเดต runtime config ทันที (ไม่ต้อง restart)
  if (key === "CSITH_BIZ_ID") CFG.bizId = v;
  if (key === "CSITH_BASE_URL") { CFG.baseUrl = v.replace(/\/+$/, ""); tokenCache = { token: null, exp: 0 }; }
  if (key === "CSITH_API_KEY") { CFG.apiKey = v; tokenCache = { token: null, exp: 0 }; }
  if (key === "CSITH_TOKEN_PATH") CFG.tokenPath = v;
  if (key === "DATA_SOURCE") CFG.dataSource = v.toLowerCase();
  if (key === "SQL_BIZ_QUERY") CFG.bizQuery = v;
  if (key === "SQL_SHOP_QUERY") CFG.shopQuery = v;
  if (key === "SQL_QUERY" || key === "SQL_PRODUCTS_QUERY") CFG.productsQuery = v;
  // reset pool เฉพาะเมื่อเปลี่ยน config การ "ต่อ" (host/db/user...) ไม่ใช่ตอนเปลี่ยน query
  if (key.indexOf("SQL_") === 0 && key.indexOf("QUERY") < 0) resetSqlPool();
}

// คืน config ปัจจุบันแบบปลอดภัย (ปิดบัง API key) สำหรับหน้า "ตั้งค่าการเชื่อมต่อ"
function getConfig() {
  const k = CFG.apiKey || "";
  return {
    baseUrl: CFG.baseUrl,
    tokenPath: CFG.tokenPath,
    productsPath: CFG.productsPath,
    bizListPath: CFG.bizListPath,
    shopListPath: CFG.shopListPath,
    purInvoicePath: CFG.purInvoicePath,
    hasApiKey: !!k,
    apiKeyMask: k ? (k.length <= 8 ? "••••" : k.slice(0, 4) + "••••" + k.slice(-4)) : "",
    dataSource: CFG.dataSource,
    sql: {
      host: E.SQL_HOST || "",
      port: E.SQL_PORT || "1433",
      database: E.SQL_DATABASE || "",
      user: E.SQL_USER || "",
      hasPassword: !!E.SQL_PASSWORD,
      encrypt: String(E.SQL_ENCRYPT) === "true",
      trustCert: String(E.SQL_TRUST_CERT) !== "false",
      query: E.SQL_QUERY || "",
      driverReady: (() => { try { require.resolve("mssql"); return true; } catch (e) { return false; } })(),
    },
  };
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

// --- SQL Server: connection pool ที่ reuse ได้ (สร้างใหม่เมื่อ config เปลี่ยน) ---
let sqlPool = null, sqlPoolKey = "";
function sqlConfig() {
  return {
    server: E.SQL_HOST,
    port: Number(E.SQL_PORT) || 1433,
    database: E.SQL_DATABASE,
    user: E.SQL_USER,
    password: E.SQL_PASSWORD,
    options: {
      encrypt: String(E.SQL_ENCRYPT) === "true",
      trustServerCertificate: String(E.SQL_TRUST_CERT) !== "false",
    },
    pool: { max: 4, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 15000,
    requestTimeout: 20000,
  };
}
function resetSqlPool() {
  if (sqlPool) { try { sqlPool.close(); } catch (e) {} }
  sqlPool = null; sqlPoolKey = "";
}
async function getSqlPool(mssql) {
  const cfg = sqlConfig();
  const key = [cfg.server, cfg.port, cfg.database, cfg.user, cfg.password,
    cfg.options.encrypt, cfg.options.trustServerCertificate].join("|");
  if (sqlPool && sqlPool.connected && sqlPoolKey === key) return sqlPool;
  if (sqlPool) { try { await sqlPool.close(); } catch (e) {} sqlPool = null; }
  sqlPool = await new mssql.ConnectionPool(cfg).connect();
  sqlPoolKey = key;
  return sqlPool;
}
async function fromSql(opts) {
  opts = opts || {};
  let mssql;
  try { mssql = require("mssql"); }
  catch (e) { throw new Error("ยังไม่ได้ติดตั้ง mssql — รัน: npm install mssql"); }
  if (!E.SQL_HOST || !E.SQL_DATABASE) throw new Error("SQL config ไม่ครบใน .env (ต้องมี SQL_HOST และ SQL_DATABASE)");
  const pool = await getSqlPool(mssql);
  const code = opts.code != null ? String(opts.code).trim() : "";
  const fg = (opts.fg != null && opts.fg !== "") ? Number(opts.fg) : 0;
  // bind @fg/@code/@bizId เสมอ (query ที่ไม่ใช้ param ตัวไหน ก็ปล่อยผ่านได้)
  const r = await pool.request()
    .input("fg", mssql.Int, isNaN(fg) ? 0 : fg)
    .input("code", mssql.NVarChar(50), code)
    .input("bizId", mssql.Int, Number(CFG.bizId) || 0)
    .query(CFG.productsQuery);
  return normalize(r.recordset);
}

// รัน query ทั่วไปบน SQL (ใช้กับ biz/shop/po) — params={key:val} → bind เป็น @key
async function sqlQuery(sql, params) {
  let mssql;
  try { mssql = require("mssql"); }
  catch (e) { throw new Error("ยังไม่ได้ติดตั้ง mssql — รัน: npm install mssql"); }
  if (!E.SQL_HOST || !E.SQL_DATABASE) throw new Error("SQL config ไม่ครบใน .env (ต้องมี SQL_HOST และ SQL_DATABASE)");
  const pool = await getSqlPool(mssql);
  const req = pool.request();
  if (params) for (const k of Object.keys(params)) req.input(k, params[k] == null ? "" : params[k]);
  const r = await req.query(sql);
  return r.recordset || [];
}

async function getSkus(source, opts) {
  return source === "sql" ? fromSql(opts) : fromApi(opts);
}

module.exports = { getSkus, getToken, getBizList, getShopList, getPurInvoices, getPoLines, setEnvVar, getConfig, CFG };
