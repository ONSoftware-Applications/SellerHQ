import { Outlet } from 'react-router-dom'

import Sidebar from './Sidebar'
import Topbar from './Topbar'

function Layout() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <Topbar />

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}

export default Layout