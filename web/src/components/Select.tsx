import { useEffect, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
}

/**
 * Themed dropdown — a styled replacement for native <select> so the option
 * list matches the app (rounded popover, hover accent, a check on the current
 * value). Pure inline styles + theme tokens, no external deps. Closes on
 * outside-click or Escape; arrow keys navigate, Enter/Space select.
 */
export function Select({
  value,
  options,
  onChange,
  width,
  height = 38,
  ariaLabel,
}: {
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
  width?: number | string
  height?: number
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const cur = options.find((o) => o.value === value)

  // close on outside click
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (active >= 0) choose(options[active].value)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0, width }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKey}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          width: width ? '100%' : 'auto',
          height,
          padding: '0 11px',
          border: '1px solid ' + (open ? 'var(--accent)' : 'var(--border)'),
          borderRadius: 8,
          background: open ? 'var(--surface)' : 'var(--surface-2)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Sans Thai'",
          fontSize: 12.5,
          boxShadow: open ? '0 0 0 3px var(--accent-soft)' : 'none',
          transition: 'box-shadow .15s ease, border-color .15s ease',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur?.label ?? ''}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '100%',
            zIndex: 50,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
            padding: 6,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {options.map((o, i) => {
            const sel = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={sel}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px 8px 8px',
                  border: 'none',
                  borderRadius: 7,
                  background: i === active ? 'var(--accent-soft)' : 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans Thai'",
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ width: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  {sel && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
