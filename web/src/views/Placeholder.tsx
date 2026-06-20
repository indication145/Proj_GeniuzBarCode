export function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A938A' }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#44403B' }}>{title}</div>
        <div style={{ fontSize: 12.5, marginTop: 4 }}>{subtitle}</div>
      </div>
    </div>
  )
}
