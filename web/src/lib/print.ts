// Build the print-window HTML (mm-accurate, A4 multi-up or roll). Pure string
// builder ported from LabelDesigner.dc.html (buildPrintHTML/printElHTML/...).
//
// NOTE: still emits <script src> to JsBarcode/QR under `assetBase`, like the dc
// app. Phase 5 will replace this with pre-rendered data-URLs so the popup needs
// no JS/network (see Migration-Vite.md). Kept faithful for now.
import { resolveValue } from './elements'
import type { El, LabelDoc, ResolveCtx } from './types'

export function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function printElHTML(el: El, ctx: ResolveCtx, idx: number): string {
  const pos = `position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;box-sizing:border-box;overflow:hidden;`
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
    const val = esc(resolveValue(el, ctx, idx))
    return `<div style="${pos}"><svg class="bc" data-text="${val}" data-format="${esc(el.format || 'CODE128')}" data-show="${el.showText ? '1' : '0'}" style="width:100%;height:100%;display:block;"></svg></div>`
  }
  if (el.type === 'qr') {
    const val = esc(resolveValue(el, ctx, idx))
    return `<div style="${pos}"><div class="qr" data-text="${val}" style="width:100%;height:100%;"></div></div>`
  }
  if (el.type === 'image') {
    if (el.src) {
      return `<div style="${pos}"><img src="${esc(el.src)}" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>`
    }
    const fs = Math.max(2, el.w * 0.22)
    const st =
      pos +
      'display:flex;align-items:center;justify-content:center;border:0.3mm dashed #b9b3a9;border-radius:0.5mm;color:#9a938a;' +
      `font-family:'IBM Plex Mono',monospace;font-size:${fs}mm;background:repeating-linear-gradient(45deg,#f4f3f1,#f4f3f1 1mm,#eceae6 1mm,#eceae6 2mm);`
    return `<div style="${st}">${esc(el.label || 'LOGO')}</div>`
  }
  return ''
}

function printLabelHTML(doc: LabelDoc, ctx: ResolveCtx, idx: number): string {
  const inner = doc.elements.map((el) => printElHTML(el, ctx, idx)).join('')
  return `<div class="label" style="width:${doc.labelW}mm;height:${doc.labelH}mm;background:${doc.bg};">${inner}</div>`
}

export interface PrintOpts {
  /** Base URL for vendored JsBarcode/QR + fonts, e.g. location.origin. */
  assetBase?: string
}

/** `items` is a list of skuRow indices (one per label to print, copies expanded). */
export function buildPrintHTML(doc: LabelDoc, items: number[], ctx: ResolveCtx, opts: PrintOpts = {}): string {
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
      pages += '<div class="page">' + items.slice(i, i + perPage).map((idx) => printLabelHTML(doc, ctx, idx)).join('') + '</div>'
    }
    pageCss = `@page{size:${pageW}mm ${pageH}mm;margin:0;}`
    layoutCss =
      `.page{display:grid;grid-template-columns:repeat(${cols},${doc.labelW}mm);grid-auto-rows:${doc.labelH}mm;gap:${gap}mm;page-break-after:always;}` +
      '.page:last-child{page-break-after:auto;}.label{position:relative;overflow:hidden;box-sizing:border-box;}'
    body = pages
  } else {
    const labels = items.map((idx) => printLabelHTML(doc, ctx, idx)).join('')
    pageCss = '@page{size:A4;margin:8mm;}'
    layoutCss = '.sheet{display:flex;flex-wrap:wrap;gap:2mm;align-content:flex-start;}.label{position:relative;overflow:hidden;box-sizing:border-box;border:0.2mm solid #e3e0db;break-inside:avoid;}'
    body = `<div class="sheet">${labels}</div>`
  }

  const draw =
    '(function(){function run(){' +
    'if(!window.JsBarcode||!window.QRCode){return setTimeout(run,80);}' +
    "document.querySelectorAll('svg.bc').forEach(function(svg){var t=svg.getAttribute('data-text');if(!t)return;" +
    "var show=svg.getAttribute('data-show')==='1',fmt=svg.getAttribute('data-format')||'CODE128';" +
    "try{JsBarcode(svg,t,{format:fmt,displayValue:show,height:60,width:2,margin:0,fontSize:14,font:'IBM Plex Mono',background:'transparent',lineColor:'#1b1a18'});}" +
    "catch(e){try{JsBarcode(svg,t,{format:'CODE128',displayValue:show,height:60,width:2,margin:0,fontSize:14,background:'transparent',lineColor:'#1b1a18'});}catch(e2){}}" +
    "var bw=svg.getAttribute('width'),bh=svg.getAttribute('height');if(bw&&bh){svg.setAttribute('viewBox','0 0 '+bw+' '+bh);}" +
    "svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('preserveAspectRatio','none');svg.style.width='100%';svg.style.height='100%';" +
    '});' +
    "document.querySelectorAll('div.qr').forEach(function(d){var t=d.getAttribute('data-text');if(!t)return;d.innerHTML='';" +
    "try{new QRCode(d,{text:t,width:300,height:300,correctLevel:QRCode.CorrectLevel.M,colorDark:'#1b1a18',colorLight:'#ffffff'});}catch(e){}" +
    "var img=d.querySelector('img');if(img){img.style.width='100%';img.style.height='100%';}var c=d.querySelector('canvas');if(c){c.style.width='100%';c.style.height='100%';}" +
    '});' +
    'var done=function(){setTimeout(function(){window.focus();window.print();},250);};' +
    'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(done);}else{done();}' +
    '}run();})();'

  const base = opts.assetBase ?? ''
  return (
    '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">' +
    `<title>${esc(doc.labelName)} — พิมพ์</title>` +
    `<link href="${base}/vendor/fonts/fonts.css" rel="stylesheet">` +
    `<style>*{box-sizing:border-box;}html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}${pageCss}${layoutCss}</style>` +
    `<script src="${base}/vendor/JsBarcode.all.min.js"></script>` +
    `<script src="${base}/vendor/qrcode.min.js"></script>` +
    `</head><body>${body}<script>${draw}</script></body></html>`
  )
}
