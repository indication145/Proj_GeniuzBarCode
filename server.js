// Zero-dependency static server for GeniuzBarCode Label Designer.
// Run: node server.js   (or double-click run.bat)
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const dataSource = require("./dataSource");

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
    const source = u.searchParams.get("source") === "sql" ? "sql" : "api";
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

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) { handleApi(req, res); return; }

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // Resolve safely inside ROOT (block path traversal).
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found: " + urlPath);
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
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
