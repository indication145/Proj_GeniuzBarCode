import { useEffect } from 'react'
import { Header } from '@/components/Header'
import { NavRail } from '@/components/NavRail'
import { Toast } from '@/components/Toast'
import { DesignView } from '@/views/DesignView'
import { PrintView } from '@/views/PrintView'
import { SettingsView } from '@/views/SettingsView'
import { useStore } from '@/store/useStore'
import { useApplyAccent } from '@/theme/useApplyAccent'
import { useBreakpoint } from '@/lib/useMediaQuery'

export default function App() {
  useApplyAccent()
  const { isMobile } = useBreakpoint()
  const view = useStore((s) => s.view)
  const initTheme = useStore((s) => s.initTheme)
  const loadHeader = useStore((s) => s.loadHeader)
  const bootTemplates = useStore((s) => s.bootTemplates)

  useEffect(() => {
    document.title = `Geniuz Barcode V.${__APP_VERSION__}`
    initTheme()
    void loadHeader()
    void bootTemplates()
  }, [initTheme, loadHeader, bootTemplates])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {!isMobile && <NavRail />}
        {view === 'design' && <DesignView />}
        {view === 'print' && <PrintView />}
        {view === 'settings' && <SettingsView />}
      </div>
      {isMobile && <NavRail bottom />}
      <Toast />
    </div>
  )
}
