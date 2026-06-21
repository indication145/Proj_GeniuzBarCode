import { useEffect, useState } from 'react'

/** Breakpoints (px). mobile < 640 ≤ tablet < 1024 ≤ desktop */
export const BP = { mobile: 640, tablet: 1024 } as const

/** Subscribe to a media query; re-renders on change. SSR-safe-ish (guards matchMedia). */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => (typeof matchMedia === 'function' ? matchMedia(query).matches : false))
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(query)
    const onChange = () => setMatch(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return match
}

export type Breakpoint = { isMobile: boolean; isTablet: boolean; isDesktop: boolean }

/** Single hook for the three buckets. isTablet = tablet-or-smaller (≤1023). */
export function useBreakpoint(): Breakpoint {
  const isMobile = useMediaQuery(`(max-width: ${BP.mobile - 1}px)`)
  const isTablet = useMediaQuery(`(max-width: ${BP.tablet - 1}px)`)
  return { isMobile, isTablet, isDesktop: !isTablet }
}
