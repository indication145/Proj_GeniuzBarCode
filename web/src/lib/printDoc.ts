// Print without a CDN/vendor dependency: pre-render barcodes/QR to PNG data-URLs
// in the app, then open a popup containing pure HTML <img> (no scripts). Fonts
// come from the parent document's @font-face rules (rewritten to absolute URLs).
// This is the Phase-5 "data-URL print" folded into Phase 4b.
import { drawBarcode, qrToDataURL } from './barcode'
import { resolveValue } from './elements'
import { esc } from './print'
import type { El, LabelDoc, ResolveCtx } from './types'

/** Copy @font-face rules from the running app so the popup has IBM Plex offline. */
function fontFaceCss(origin: string): string {
  let css = ''
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      continue // cross-origin sheet
    }
    for (const rule of Array.from(rules || [])) {
      if (rule instanceof CSSFontFaceRule) css += rule.cssText + '\n'
    }
  }
  // root-relative url(/assets/..) won't resolve in an about:blank popup → absolutize
  return css.replace(/url\((['"]?)\//g, `url($1${origin}/`)
}

async function elHTML(el: El, ctx: ResolveCtx, idx: number, cache: Map<string, string>): Promise<string> {
  const rot = el.rotation ? `transform:rotate(${el.rotation}deg);` : ''
  const pos = `position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;box-sizing:border-box;overflow:hidden;${rot}`

  if (el.type === 'text' || el.type === 'price') {
    const val = esc(resolveValue(el, ctx, idx))
    const just = el.align === 'left' ? 'flex-start' : el.align === 'right' ? 'flex-end' : 'center'
    const st =
      pos +
      `display:flex;align-items:center;justify-content:${just};text-align:${el.align || 'center'};` +
      `font-family:${el.fontFamily || "'IBM Plex Sans Thai',sans-serif"};font-size:${el.fontSize}mm;font-weight:${el.weight || 600};` +
      `font-style:${el.italic ? 'italic' : 'normal'};color:${el.color || '#1b1a18'};line-height:1.04;` +
      (el.type === 'price' ? 'white-space:nowrap;' : '')
    return `<div style="${st}">${val}</div>`
  }
  if (el.type === 'frame') {
    return `<div style="${pos}border:${el.border}mm solid ${el.color || '#1b1a18'};border-radius:${el.radius}mm;background:transparent;"></div>`
  }
  if (el.type === 'barcode') {
    const text = resolveValue(el, ctx, idx)
    const key = 'b|' + (el.format || 'CODE128') + '|' + (el.showText ? 1 : 0) + '|' + text
    let url = cache.get(key)
    if (url == null) {
      const c = document.createElement('canvas')
      drawBarcode(c, text, { format: el.format, showText: el.showText, height: 60 })
      url = text ? c.toDataURL('image/png') : ''
      cache.set(key, url)
    }
    return `<div style="${pos}"><img src="${url}" style="width:100%;height:100%;object-fit:fill;display:block;"/></div>`
  }
  if (el.type === 'qr') {
    const text = resolveValue(el, ctx, idx)
    const key = 'q|' + text
    let url = cache.get(key)
    if (url == null) {
      url = text ? await qrToDataURL(text, 300) : ''
      cache.set(key, url)
    }
    return `<div style="${pos}"><img src="${url}" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>`
  }
  if (el.type === 'image') {
    if (el.src) return `<div style="${pos}"><img src="${esc(el.src)}" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>`
    const fs = Math.max(2, el.w * 0.22)
    const st = pos + `display:flex;align-items:center;justify-content:center;border:0.3mm dashed #b9b3a9;border-radius:0.5mm;color:#9a938a;font-family:'IBM Plex Mono',monospace;font-size:${fs}mm;`
    return `<div style="${st}">${esc(el.label || 'LOGO')}</div>`
  }
  return ''
}

async function labelHTML(doc: LabelDoc, ctx: ResolveCtx, idx: number, cache: Map<string, string>): Promise<string> {
  const inner = (await Promise.all(doc.elements.map((el) => elHTML(el, ctx, idx, cache)))).join('')
  return `<div class="label" style="width:${doc.labelW}mm;height:${doc.labelH}mm;background:${doc.bg};">${inner}</div>`
}

/** Build the full print document (Promise — barcodes render async).
 *  `auto` embeds a script that calls window.print() on load (popup path);
 *  set false for the iframe path where the caller triggers print itself. */
export async function buildPrintDoc(doc: LabelDoc, items: number[], ctx: ResolveCtx, auto = true): Promise<string> {
  const cache = new Map<string, string>()
  const roll = doc.printMedia === 'roll'
  let pageCss: string
  let layoutCss: string
  let body: string

  if (roll) {
    const cols = Math.max(1, doc.rollCols)
    const rows = Math.max(1, doc.rollRows)
    const gap = 2
    const perPage = cols * rows
    const pageW = (cols * doc.labelW + (cols - 1) * gap).toFixed(2)
    const pageH = (rows * doc.labelH + (rows - 1) * gap).toFixed(2)
    let pages = ''
    for (let i = 0; i < items.length; i += perPage) {
      const chunk = await Promise.all(items.slice(i, i + perPage).map((idx) => labelHTML(doc, ctx, idx, cache)))
      pages += '<div class="page">' + chunk.join('') + '</div>'
    }
    pageCss = `@page{size:${pageW}mm ${pageH}mm;margin:0;}`
    layoutCss = `.page{display:grid;grid-template-columns:repeat(${cols},${doc.labelW}mm);grid-auto-rows:${doc.labelH}mm;gap:${gap}mm;page-break-after:always;}.page:last-child{page-break-after:auto;}.label{position:relative;overflow:hidden;box-sizing:border-box;}`
    body = pages
  } else {
    const labels = (await Promise.all(items.map((idx) => labelHTML(doc, ctx, idx, cache)))).join('')
    pageCss = '@page{size:A4;margin:8mm;}'
    layoutCss = '.sheet{display:flex;flex-wrap:wrap;gap:2mm;align-content:flex-start;}.label{position:relative;overflow:hidden;box-sizing:border-box;border:0.2mm solid #e3e0db;break-inside:avoid;}'
    body = `<div class="sheet">${labels}</div>`
  }

  const fonts = fontFaceCss(window.location.origin)
  const autoScript = auto
    ? '<script>window.onload=function(){document.fonts&&document.fonts.ready?document.fonts.ready.then(function(){setTimeout(function(){window.print()},120)}):setTimeout(function(){window.print()},200)};<\/script>'
    : ''
  return (
    '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">' +
    `<title>${esc(doc.labelName)} — พิมพ์</title>` +
    `<style>${fonts}*{box-sizing:border-box;}html,body{margin:0;padding:0;background:#fff;font-family:'IBM Plex Sans Thai',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}${pageCss}${layoutCss}</style>` +
    '</head><body>' +
    body +
    autoScript +
    '</body></html>'
  )
}

/** Render + open the print popup. Returns false if the popup was blocked. */
export async function openPrint(doc: LabelDoc, items: number[], ctx: ResolveCtx): Promise<boolean> {
  const w = window.open('', '_blank')
  if (!w) return false
  const html = await buildPrintDoc(doc, items, ctx)
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}

/** Print via a hidden iframe — no popup, so it survives mobile popup-blockers.
 *  The native print sheet offers "Save as PDF" on both iOS and Android. */
export async function openPrintFrame(doc: LabelDoc, items: number[], ctx: ResolveCtx): Promise<boolean> {
  const html = await buildPrintDoc(doc, items, ctx, false)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)
  const cw = iframe.contentWindow
  if (!cw) {
    iframe.remove()
    return false
  }
  cw.document.open()
  cw.document.write(html)
  cw.document.close()
  const cleanup = () => setTimeout(() => iframe.remove(), 800)
  cw.onafterprint = cleanup
  const fire = () => {
    try {
      cw.focus()
      cw.print()
    } catch {
      cleanup()
    }
  }
  const fonts = cw.document.fonts
  if (fonts && fonts.ready) fonts.ready.then(() => setTimeout(fire, 120))
  else setTimeout(fire, 250)
  // safety: drop the iframe even if onafterprint never fires (some browsers)
  setTimeout(() => {
    if (document.body.contains(iframe)) iframe.remove()
  }, 60000)
  return true
}
