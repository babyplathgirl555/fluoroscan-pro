import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar         from './components/Sidebar.jsx'
import Header          from './components/Header.jsx'
import LoadSection     from './components/LoadSection.jsx'
import TableSection    from './components/TableSection.jsx'
import AnalyzeSection  from './components/AnalyzeSection.jsx'
import ResultsSection  from './components/ResultsSection.jsx'
import SettingsSection from './components/SettingsSection.jsx'
import LoginScreen     from './components/LoginScreen.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { checkHealth }   from './lib/api.js'
import HistorySection from './components/HistorySection.jsx'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0,  transition: { duration: .25 } },
  exit:    { opacity: 0, y: -8, transition: { duration: .18 } },
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}

function AppInner() {
  const [section, setSection] = useState('load')
  const [images,  setImages]  = useState([])
  const [apiOk,   setApiOk]   = useState(false)

  // ── Login: lee del localStorage ──────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fs_user')) }
    catch { return null }
  })

  // ── Ping al backend cada 10s ─────────────────────────────────────────────
  useEffect(() => {
    checkHealth().then(setApiOk).catch(() => setApiOk(false))
    const id = setInterval(() =>
      checkHealth().then(setApiOk).catch(() => setApiOk(false)), 10000)
    return () => clearInterval(id)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('fs_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('fs_user')
    setImages([])
    setSection('load')
  }

  const handleReset = () => {
    setImages([])
    setSection('load')
  }

  // ── Si no hay usuario, muestra login ────────────────────────────────────
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        active={section}
        onNav={setSection}
        apiOk={apiOk}
        user={user}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    minWidth: 0, overflowX: 'hidden' }}>
        <Header
          activeSection={section}
          imageCount={images.length}
          onOpenHistory={() => setSection('history')}
          onOpenSettings={() => setSection('settings')}
        />

        <main style={{ flex: 1, padding: '32px 40px 52px', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {section === 'load' && (
                <LoadSection
                  images={images}
                  setImages={setImages}
                  onNext={() => setSection('table')}
                />
              )}
              {section === 'table' && (
                <TableSection
                  images={images}
                  setImages={setImages}
                  onBack={() => setSection('load')}
                  onNext={() => setSection('analyze')}
                />
              )}
              {section === 'analyze' && (
                <AnalyzeSection
                  images={images}
                  onBack={() => setSection('table')}
                  onReset={handleReset}
                  onShowResults={() => setSection('results')}
                />
              )}
              {section === 'results' && (
                <ResultsSection
                  images={images}
                  onBack={() => setSection('table')}
                />
              )}
              {section === 'history' && (
                <HistorySection />
              )}
              {section === 'settings' && (
                <SettingsSection
                  user={user}
                  onLogout={handleLogout}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
