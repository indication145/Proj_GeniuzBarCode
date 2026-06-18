// Saved label templates store — JSON file next to the exe (or repo dir).
"use strict";
const fs = require("fs");
const path = require("path");

const BASE_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const FILE = path.join(BASE_DIR, "templates.json");

function readAll() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")).templates || []; }
  catch (e) { return []; }
}
function writeAll(list) {
  fs.writeFileSync(FILE, JSON.stringify({ templates: list }, null, 2), "utf8");
}

// list = lightweight metadata (no full elements)
function list() {
  return readAll().map(t => ({
    id: t.id,
    name: t.name,
    labelW: t.design && t.design.labelW,
    labelH: t.design && t.design.labelH,
    count: (t.design && t.design.elements || []).length,
    updatedAt: t.updatedAt,
  }));
}
function get(id) { return readAll().find(t => t.id === id) || null; }

// upsert: by id if given, else by name (so re-saving same name overwrites)
function save(input) {
  const all = readAll();
  let t = null;
  if (input.id) t = all.find(x => x.id === input.id);
  if (!t && input.name) t = all.find(x => x.name === input.name);
  if (t) {
    t.name = input.name || t.name;
    t.design = input.design;
    t.updatedAt = Date.now();
  } else {
    t = {
      id: "tpl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: input.name || "untitled",
      design: input.design,
      updatedAt: Date.now(),
    };
    all.push(t);
  }
  writeAll(all);
  return t;
}
function remove(id) { writeAll(readAll().filter(t => t.id !== id)); }

module.exports = { list, get, save, remove };
