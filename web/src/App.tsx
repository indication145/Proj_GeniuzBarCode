import { useEffect } from 'react'
import { Header } from '@/components/Header'
import { NavRail } from '@/components/NavRail'
import { Toast } from '@/components/Toast'
import { DesignView } from '@/views/DesignView'
import { PrintView } from '@/views/PrintView'
import { SettingsView } from '@/views/SettingsView'
import { useStore } from '@/store/useStore'
import { useApplyAccent } from '@/theme/useApplyAccent'

export default function App() {
  useApplyAccent()
  const view = useStore((s) => s.view)
  const initTheme = useStore((s) => s.initTheme)
  const loadHeader = useStore((s) => s.loadHeader)
  const bootTemplates = useStore((s) => s.bootTemplates)

  useEffect(() => {
    initTheme()
    void loadHeader()
    void bootTemplates()
  }, [initTheme, loadHeader, bootTemplates])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavRail />
        {view === 'design' && <DesignView />}
        {view === 'print' && <PrintView />}
        {view === 'settings' && <SettingsView />}
      </div>
      <Toast />
    </div>
  )
}
