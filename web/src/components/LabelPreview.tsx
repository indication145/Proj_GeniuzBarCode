import { PX } from '@/lib/units'
import type { El, ResolveCtx } from '@/lib/types'
import { ElementBox } from './ElementBox'

/** One label rendered at `ps` px-per-mm: a scaled cell containing all elements
 *  resolved for sku row `idx`. Used by the print preview (and reusable by Design). */
export function LabelPreview({ elements, labelW, labelH, bg, ctx, idx, ps }: { elements: El[]; labelW: number; labelH: number; bg: string; ctx: ResolveCtx; idx: number; ps: number }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', flex: '0 0 auto', width: labelW * ps, height: labelH * ps, background: bg, border: '1px solid #E6E3DF', borderRadius: 2 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: labelW * PX, height: labelH * PX, transform: `scale(${ps / PX})`, transformOrigin: '0 0' }}>
        {elements.map((el) => (
          <ElementBox key={el.id} el={el} ctx={ctx} idx={idx} />
        ))}
      </div>
    </div>
  )
}
