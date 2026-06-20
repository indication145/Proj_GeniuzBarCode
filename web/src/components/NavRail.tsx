import { useStore, type View } from '@/store/useStore'

const ITEMS: { view: View; label: string; icon: React.ReactNode }[] = [
  {
    view: 'design',
    label: 'สร้าง\nTemplate',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    view: 'print',
    label: 'พิมพ์\nป้ายราคา',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    ),
  },
  {
    view: 'settings',
    label: 'ตั้งค่า\nเชื่อมต่อ',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
]

export function NavRail() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  return (
    <nav style={{ width: 72, flexShrink: 0, background: '#fff', borderRight: '1px solid #E6E3DF', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10, gap: 6 }}>
      {ITEMS.map((it) => {
        const active = view === it.view
        return (
          <button
            key={it.view}
            onClick={() => setView(it.view)}
            title={it.label.replace('\n', ' ')}
            style={{
              width: 56,
              padding: '9px 0',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              fontFamily: "'IBM Plex Sans Thai'",
              fontSize: 10,
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: 'pre-line',
              textAlign: 'center',
              background: active ? 'var(--accent-soft)' : 'transparent',
              color: active ? 'var(--accent)' : '#78716c',
            }}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
