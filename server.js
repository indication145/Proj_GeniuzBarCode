// Zero-dependency static server for GeniuzBarCode Label Designer.
// Run: node server.js   (or double-click run.bat)
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const dataSource = require("./dataSource");
const templates = require("./templates");

const ROOT = __dirname;
const START_PORT = Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

async function handleApi(req, res) {
  const u = new URL(req.url, "http://localhost");
  if (u.pathname === "/api/health") { sendJson(res, 200, { ok: true }); return; }
  if (u.pathname === "/api/config") {
    try {
      if (req.method === "POST") {
        const body = await readJsonBody(req);
        const changed = [];
        if (typeof body.baseUrl === "string" && body.baseUrl.trim()) { dataSource.setEnvVar("CSITH_BASE_URL", body.baseUrl.trim()); changed.push("Endpoint"); }
        // อัปเดต API key เฉพาะเมื่อส่งค่าใหม่จริง (ค่าว่าง = ไม่เปลี่ยน คงของเดิม)
        if (typeof body.apiKey === "string" && body.apiKey.trim()) { dataSource.setEnvVar("CSITH_API_KEY", body.apiKey.trim()); changed.push("API Key"); }
        if (typeof body.tokenPath === "string" && body.tokenPath.trim()) { dataSource.setEnvVar("CSITH_TOKEN_PATH", body.tokenPath.trim()); changed.push("Token Path"); }
        // ---- SQL Server config ----
        const sql = body.sql || {};
        if (typeof sql.host === "string") { dataSource.setEnvVar("SQL_HOST", sql.host.trim()); changed.push("SQL Server"); }
        if (typeof sql.port === "string" || typeof sql.port === "number") dataSource.setEnvVar("SQL_PORT", String(sql.port).trim() || "1433");
        if (typeof sql.database === "string") dataSource.setEnvVar("SQL_DATABASE", sql.database.trim());
        if (typeof sql.user === "string") dataSource.setEnvVar("SQL_USER", sql.user.trim());
        // รหัสผ่าน: เปลี่ยนเฉพาะเมื่อส่งค่าใหม่ (ว่าง = คงเดิม)
        if (typeof sql.password === "string" && sql.password) { dataSource.setEnvVar("SQL_PASSWORD", sql.password); changed.push("SQL Password"); }
        if (typeof sql.query === "string" && sql.query.trim()) dataSource.setEnvVar("SQL_QUERY", sql.query.trim());
        // สลับโหมดแหล่งข้อมูลตามแท็บที่บันทึก (มี sql = โหมด SQL, มี baseUrl = โหมด REST)
        if (typeof body.mode === "string") dataSource.setEnvVar("DATA_SOURCE", body.mode === "sql" ? "sql" : "api");
        else if (body.sql) dataSource.setEnvVar("DATA_SOURCE", "sql");
        else if (typeof body.baseUrl === "string") dataSource.setEnvVar("DATA_SOURCE", "api");
        sendJson(res, 200, { ok: true, changed, config: dataSource.getConfig() });
      } else {
        sendJson(res, 200, { ok: true, config: dataSource.getConfig() });
      }
    } catch (e) {
      sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
    }
    return;
  }
  if (u.pathname === "/api/biz") {
    try {
      if (req.method === "POST") {
        const body = await readJsonBody(req);
        if (body.bizId == null || body.bizId === "") { sendJson(res, 400, { ok: false, error: "ต้องระบุ bizId" }); return; }
        dataSource.setEnvVar("CSITH_BIZ_ID", body.bizId);
        sendJson(res, 200, { ok: true, bizId: String(body.bizId) });
      } else {
        const rows = await dataSource.getBizList();
        sendJson(res, 200, { ok: true, rows, current: dataSource.CFG.bizId });
      }
    } catch (e) {
      sendJson(res, 502, { ok: false, error: String((e && e.message) || e) });
    }
    return;
  }
  if (u.pathname === "/api/templates") {
    try {
      if (req.method === "POST") {
        const body = await readJsonBody(req);
        if (!body.design) { sendJson(res, 400, { ok: false, error: "ต้องมี design" }); return; }
        const t = templates.save({ id: body.id, name: body.name, design: body.design });
        sendJson(res, 200, { ok: true, id: t.id, name: t.name });
      } else if (req.method === "DELETE") {
        templates.remove(u.searchParams.get("id") || "");
        sendJson(res, 200, { ok: true });
      } else {
        const id = u.searchParams.get("id");
        if (id) sendJson(res, 200, { ok: true, template: templates.get(id) });
        else sendJson(res, 200, { ok: true, rows: templates.list() });
      }
    } catch (e) {
      sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
    }
    return;
  }
  if (u.pathname === "/api/po") {
    try {
      const rows = await dataSource.getPurInvoices({ fg: u.searchParams.get("fg"), code: u.searchParams.get("code") || "" });
      sendJson(res, 200, { ok: true, rows, count: rows.length });
    } catch (e) {
      sendJson(res, 502, { ok: false, error: String((e && e.message) || e) });
    }
    return;
  }
  if (u.pathname === "/api/po/lines") {
    try {
      const rows = await dataSource.getPoLines(u.searchParams.get("doc") || "");
      sendJson(res, 200, { ok: true, rows, count: rows.length, doc: u.searchParams.get("doc") || "" });
    } catch (e) {
      sendJson(res, 502, { ok: false, error: String((e && e.message) || e) });
    }
    return;
  }
  if (u.pathname === "/api/shops") {
    try {
      const rows = await dataSource.getShopList(u.searchParams.get("bizId") || undefined);
      sendJson(res, 200, { ok: true, rows, count: rows.length, bizId: dataSource.CFG.bizId });
    } catch (e) {
      sendJson(res, 502, { ok: false, error: String((e && e.message) || e) });
    }
    return;
  }
  if (u.pathname === "/api/skus") {
    // ไม่ส่ง source มา → ใช้โหมดที่ตั้งไว้ (DATA_SOURCE); ส่งมาก็ตามนั้น
    const sParam = u.searchParams.get("source");
    const source = sParam ? (sParam === "sql" ? "sql" : "api") : (dataSource.CFG.dataSource === "sql" ? "sql" : "api");
    const opts = { fg: u.searchParams.get("fg"), code: u.searchParams.get("code") || "" };
    try {
      const rows = await dataSource.getSkus(source, opts);
      sendJson(res, 200, { ok: true, source, count: rows.length, rows });
    } catch (e) {
      sendJson(res, 502, { ok: false, source, error: String((e && e.message) || e) });
    }
    return;
  }
  sendJson(res, 404, { ok: false, error: "unknown api endpoint" });
}

// Static root = the built Vite app (web/dist), bundled into the exe via pkg.assets.
const WEB_DIR = path.join(ROOT, "web", "dist");

function serveFile(res, filePath, fallback) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (fallback) { serveFile(res, fallback, null); return; }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found (run: cd web && npm run build)");
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) { handleApi(req, res); return; }

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // Resolve safely inside WEB_DIR (block path traversal).
  const filePath = path.join(WEB_DIR, path.normalize(urlPath));
  const indexPath = path.join(WEB_DIR, "index.html");
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  // SPA-ish fallback: unknown extensionless paths → index.html
  serveFile(res, filePath, path.extname(urlPath) ? null : indexPath);
});

function openBrowser(url) {
  const cmd =
    process.platform === "win32" ? `start "" "${url}"` :
    process.platform === "darwin" ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function listen(port, attemptsLeft) {
  server.once("error", (e) => {
    if (e.code === "EADDRINUSE" && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error("Server error:", e.message);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}/`;
    console.log("");
    console.log("  GeniuzBarCode Label Designer is running at:");
    console.log("    " + url);
    console.log("");
    if (process.env.NO_OPEN || process.env.NODE_ENV === "production") {
      console.log("  (auto-open browser disabled)");
    } else {
      console.log("  Opening your browser… (press Ctrl+C to stop)");
      openBrowser(url);
    }
  });
}

listen(START_PORT, 10);
