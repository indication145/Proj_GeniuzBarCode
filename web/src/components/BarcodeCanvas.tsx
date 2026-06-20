import { useEffect, useRef } from 'react'
import { drawBarcode } from '@/lib/barcode'

/** Renders a 1D barcode into a <canvas>, redrawing when text/format/show change. */
export function BarcodeCanvas({ text, format, showText }: { text: string; format?: string; showText?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawBarcode(ref.current, text, { format, showText })
  }, [text, format, showText])
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
