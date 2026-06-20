import { useEffect, useRef } from 'react'
import { drawQRCanvas } from '@/lib/barcode'

/** Renders a QR code into a <canvas> (fixed internal resolution, CSS-scaled). */
export function QrBox({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !text) return
    void drawQRCanvas(cv, text, 300).then(() => {
      // qrcode's toCanvas overwrites inline style to the px size — force it back
      // so the 300px bitmap scales to fill the element box instead of overflowing
      cv.style.width = '100%'
      cv.style.height = '100%'
    })
  }, [text])
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
