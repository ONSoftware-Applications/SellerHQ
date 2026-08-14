import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useBusiness } from '../hooks/useBusiness'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import { appDisplayName } from '../lib/branding'

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
  '/relay': {
    title: 'QR Relay',
    subtitle: 'Receive scans from your phone in real time.',
  },
  '/subscriptions': {
    title: 'Subscriptions',
    subtitle: 'Manage your plan and billing.',
  },
  '/reports': {
    title: 'Reports',
    subtitle: 'Business performance and financial reports.',
  },
  '/team': {
    title: 'Team',
    subtitle: 'Manage team members and permissions.',
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
    joinWithCode,
  } = useBusiness()
  const { canUse } = useSubscription()
  const { showToast } = useToast()

  const [open, setOpen] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [joining, setJoining] = useState(false)

  const appName = appDisplayName(currentBusiness)

  const productMatch = location.pathname.match(
    /^\/products\/([^/]+)$/,
  )
  const pageMeta = productMatch
    ? {
        title: 'Product details',
        subtitle: 'View and update this inventory item.',
      }
    : location.pathname === '/install'
      ? {
          title: 'Install App',
          subtitle: `Get ${appName} on your device.`,
        }
      : location.pathname === '/create-business'
        ? {
            title: 'New business',
            subtitle: `Set up another business in ${appName}.`,
          }
        : pageTitles[location.pathname] ?? {
            title: appName,
            subtitle: 'Manage your reselling business.',
          }

  async function handleJoinCode() {
    if (!codeInput.trim() || joining) return
    setJoining(true)
    try {
      const result = await joinWithCode(codeInput)
      if (result.success) {
        setCodeInput('')
        setOpen(false)
        showToast('You have joined the business.', 'success')
      } else {
        showToast(result.error ?? 'Could not join the business.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Could not join the business.', 'error')
    } finally {
      setJoining(false)
    }
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

          {isInstallable() && (
            <button
              type="button"
              onClick={() => navigate('/install')}
              className="install-btn"
            >
              <span className="install-icon">⬇</span>
              <span>
                <strong>Install app</strong>
                <span>Get {appName} on your device</span>
              </span>
            </button>
          )}
      </div>

      {currentBusiness && (
        <div className="business-selector-wrapper">
          {isMobile() && canUse('qrScanner') && (
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="topbar-icon-btn"
              aria-label="Scan QR code"
              title="Scan QR code"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          )}

          <button
            className="business-selector"
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <div className="business-icon">
              {currentBusiness.logo_url ? (
                <img
                  src={currentBusiness.logo_url}
                  alt=""
                  style={{ width: 24, height: 24, objectFit: 'contain' }}
                />
              ) : (
                currentBusiness.name.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <strong>{currentBusiness.name}</strong>
              <span>{currentBusiness.business_type}</span>
            </div>

            <span className="chevron">{open ? '⌃' : '⌄'}</span>
          </button>

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

               <div className="business-menu-divider" />

               <div>
                 <p style={{
                   margin: '8px 12px 4px',
                   fontSize: '11px',
                   fontWeight: 600,
                   color: 'var(--shq-ink-muted)',
                   textTransform: 'uppercase',
                   letterSpacing: '0.04em',
                 }}>
                   Join a business with a code
                 </p>
                 <input
                   type="text"
                   placeholder="Enter invite code"
                   value={codeInput}
                   onChange={(e) => setCodeInput(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.preventDefault()
                       void handleJoinCode()
                     }
                   }}
                   style={{
                     margin: '0 12px 8px',
                     width: 'calc(100% - 24px)',
                     padding: '8px 10px',
                     borderRadius: '6px',
                     border: '1px solid var(--shq-border)',
                     fontSize: '13px',
                     background: 'var(--shq-surface)',
                     color: 'var(--shq-ink)',
                   }}
                 />
                 <button
                   type="button"
                   className="primary-button"
                   onClick={() => void handleJoinCode()}
                   disabled={joining || !codeInput.trim()}
                   style={{
                     margin: '0 12px 8px',
                     width: 'calc(100% - 24px)',
                     padding: '8px 10px',
                     fontSize: '13px',
                   }}
                 >
                   {joining ? 'Joining…' : 'Join business'}
                 </button>
               </div>
             </div>
           )}
         </div>
       )}
     </header>
   )
}

export default Topbar