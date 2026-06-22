import { useStore } from '@/store/useStore'

export function Toast() {
  const on = useStore((s) => s.toastOn)
  const msg = useStore((s) => s.toastMsg)
  if (!on) return null
  return (
    <div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 22,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background: 'var(--text)',
        color: '#fff',
        padding: '13px 18px',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        animation: 'geToast .3s cubic-bezier(.2,.8,.3,1)',
        maxWidth: 360,
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#1F8A5B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{msg}</span>
    </div>
  )
}
