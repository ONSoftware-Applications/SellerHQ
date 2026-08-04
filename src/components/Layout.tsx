import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import Sidebar from './Sidebar'
import Topbar from './Topbar'

function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="app">
      <Sidebar mobileNavOpen={mobileNavOpen} onCloseMobileNav={() => setMobileNavOpen(false)} />

      {mobileNavOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main-content">
        <Topbar onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)} />

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}

export default Layout