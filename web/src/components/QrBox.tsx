import { useEffect, useRef } from 'react'
import { drawQRCanvas } from '@/lib/barcode'

/** Renders a QR code into a <canvas> (fixed internal resolution, CSS-scaled). */
export function QrBox({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current && text) void drawQRCanvas(ref.current, text, 300)
  }, [text])
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
