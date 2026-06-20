// Barcode / QR rendering via npm libs (bundled by Vite — no CDN, no globals).
// Replaces the dc app's window.JsBarcode + qrcodejs. Used by canvas components
// (Phase 4) and the data-URL print path (Phase 5).
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

export interface BarcodeOpts {
  format?: string
  showText?: boolean
  lineColor?: string
  height?: number
}

/** Draw a 1D barcode into a <canvas> or <svg>. EAN13 etc. fall back to CODE128. */
export function drawBarcode(target: HTMLCanvasElement | SVGSVGElement, text: string, opts: BarcodeOpts = {}): void {
  if (!text) return
  const { format = 'CODE128', showText = true, lineColor = '#1b1a18', height = 46 } = opts
  const common = { displayValue: showText, height, width: 2, margin: 2, fontSize: 16, font: 'IBM Plex Mono', textMargin: 1, background: 'transparent', lineColor }
  try {
    JsBarcode(target, text, { ...common, format })
  } catch {
    try {
      JsBarcode(target, text, { ...common, format: 'CODE128' })
    } catch {
      /* give up silently, like the original */
    }
  }
}

const QR_COLOR = { dark: '#1b1a18', light: '#ffffff' }

/** QR as a PNG data-URL (used by the Phase 5 print path so the popup needs no JS). */
export function qrToDataURL(text: string, size = 300): Promise<string> {
  return QRCode.toDataURL(text, { width: size, margin: 0, errorCorrectionLevel: 'M', color: QR_COLOR })
}

/** Draw a QR straight into a <canvas>. */
export function drawQRCanvas(canvas: HTMLCanvasElement, text: string, size = 300): Promise<void> {
  return QRCode.toCanvas(canvas, text, { width: size, margin: 0, errorCorrectionLevel: 'M', color: QR_COLOR })
}
