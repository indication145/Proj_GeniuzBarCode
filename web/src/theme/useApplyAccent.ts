import { useEffect } from 'react'
import { accentVars } from '@/lib/theme'
import { useStore } from '@/store/useStore'

/** Push the current accent into CSS custom properties so the whole shell
 *  (any `var(--accent*)`) updates with no hardcoded colours. */
export function useApplyAccent() {
  const accent = useStore((s) => s.accent)
  const dark = useStore((s) => s.dark)
  useEffect(() => {
    const a = accentVars(accent)
    const s = document.documentElement.style
    s.setProperty('--accent', a.base)
    s.setProperty('--accent-soft', a.soft)
    s.setProperty('--accent-soft-border', a.softBorder)
    s.setProperty('--accent-dark', a.dark)
    s.setProperty('--accent-text', a.text)
    s.setProperty('--accent-shadow', a.shadow)
  }, [accent])
  useEffect(() => {
    // light/dark token set lives in index.css under [data-theme="dark"]
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])
}
