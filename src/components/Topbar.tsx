import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useBusiness } from '../hooks/useBusiness'

function isInstallable() {
  return !window.matchMedia('(display-mode: standalone)').matches &&
    !(window.navigator as unknown as { standalone?: boolean }).standalone
}

function isMobile() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'Overview of your reselling business.',
  },
  '/inventory': {
    title: 'Inventory',
    subtitle: 'Manage products, stock, and storage.',
  },
  '/listings': {
    title: 'Listings',
    subtitle: 'Manage your marketplace listings.',
  },
  '/sales': {
    title: 'Sales',
    subtitle: 'Manage sales and bundles.',
  },
  '/expenses': {
    title: 'Expenses',
    subtitle: 'Track your business expenses.',
  },
  '/forecasts': {
    title: 'Forecasts',
    subtitle: 'Sales, revenue, profit and cash-flow forecasts.',
  },
  '/tax': {
    title: 'Tax',
    subtitle: 'UK tax estimates and tax-year history.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Account and business preferences.',
  },
  '/profile': {
    title: 'Profile',
    subtitle: 'Your account details.',
  },
  '/install': {
    title: 'Install App',
    subtitle: 'Get SellerHQ on your device.',
  },
  '/scan': {
    title: 'Scan QR',
    subtitle: 'Scan a product label QR code.',
  },
  '/create-business': {
    title: 'New business',
    subtitle: 'Set up another business in SellerHQ.',
  },
}

type TopbarProps = {
  onToggleMobileNav?: () => void
}

function Topbar({ onToggleMobileNav }: TopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    businesses,
    currentBusiness,
    loading,
    switchBusiness,
  } = useBusiness()

  const [open, setOpen] = useState(false)

  const productMatch = location.pathname.match(
    /^\/products\/([^/]+)$/,
  )
  const pageMeta = productMatch
    ? {
        title: 'Product details',
        subtitle: 'View and update this inventory item.',
      }
    : pageTitles[location.pathname] ?? {
        title: 'SellerHQ',
        subtitle: 'Manage your reselling business.',
      }

  if (loading) {
    return (
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="hamburger"
            onClick={onToggleMobileNav}
            aria-label="Open menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <div className="topbar-heading">
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.subtitle}</p>
          </div>
        </div>

        <div className="business-selector business-selector-loading">
          <div className="business-icon">…</div>
          <div>
            <strong>Loading…</strong>
            <span>Business account</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="hamburger"
          onClick={onToggleMobileNav}
          aria-label="Open menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        <div className="topbar-heading">
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.subtitle}</p>
        </div>
      </div>

      {currentBusiness && (
        <div className="business-selector-wrapper">
          <button
            className="business-selector"
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <div className="business-icon">
              {currentBusiness.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{currentBusiness.name}</strong>
              <span>{currentBusiness.business_type}</span>
            </div>

            <span className="chevron">{open ? '⌃' : '⌄'}</span>
          </button>

          {isInstallable() && (
            <button
              type="button"
              onClick={() => navigate('/install')}
              className="install-btn"
            >
              ⬇ Install app
            </button>
          )}

          {isMobile() && (
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="scan-btn"
              aria-label="Scan QR code"
            >
              ⊡ Scan
            </button>
          )}

          {open && (
            <div className="business-menu" role="listbox">
              <div className="business-menu-heading">
                Your businesses
              </div>

              {businesses.map((business) => (
                <button
                  key={business.id}
                  type="button"
                  className={`business-menu-item ${
                    business.id === currentBusiness.id
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => {
                    switchBusiness(business.id)
                    setOpen(false)
                  }}
                >
                  <div className="business-menu-icon">
                    {business.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>{business.name}</strong>
                    <span>{business.business_type}</span>
                  </div>
                </button>
              ))}

              <div className="business-menu-divider" />

              <button
                type="button"
                className="business-menu-add"
                onClick={() => {
                  setOpen(false)
                  navigate('/create-business')
                }}
              >
                <span>+</span>
                Add another business
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default Topbar