import { NavLink, useNavigate } from 'react-router-dom'

import BrandMark from './BrandMark'
import { useAuth } from '../hooks/useAuth'
import { useBusiness } from '../hooks/useBusiness'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'

function isMobile() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

type SidebarProps = {
  mobileNavOpen?: boolean
  onCloseMobileNav?: () => void
}

function Sidebar({ mobileNavOpen, onCloseMobileNav }: SidebarProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { currentBusiness } = useBusiness()
  const { settings } = useSettings()
  const { canUse } = useSubscription()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'Account'

  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function handleNavClick() {
    if (onCloseMobileNav) {
      onCloseMobileNav()
    }
  }

  return (
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-mobile-open' : ''}`}>
      {currentBusiness?.logo_url ? (
        <div className="sidebar-brand">
          <img
            src={currentBusiness.logo_url}
            alt={`${currentBusiness.name} logo`}
            className="brand-mark-logo"
            style={{ width: 34, height: 34, objectFit: 'contain' }}
          />
          <span className="brand-mark-wordmark">{currentBusiness.name}</span>
        </div>
      ) : (
        <BrandMark className="sidebar-brand" />
      )}

      <nav className="navigation">
        <NavLink
          to="/dashboard"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/inventory"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Inventory
        </NavLink>

        {settings.features.listingsEnabled && canUse('listings') && (
          <NavLink
            to="/listings"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            Listings
          </NavLink>
        )}

        <NavLink
          to="/sales"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Sales
        </NavLink>

        {settings.features.expensesEnabled && (
          <NavLink
            to="/expenses"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
          Expenses
        </NavLink>
        )}

        {settings.features.receiptsEnabled && (
          <NavLink
            to="/receipts"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            Receipts Archive
          </NavLink>
        )}

        {settings.features.forecastsEnabled && canUse('forecasts') && (
          <NavLink
            to="/forecasts"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            Forecasts
          </NavLink>
        )}

        <NavLink
          to="/tax"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Tax
        </NavLink>

        <NavLink
          to="/pricing"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Pricing
        </NavLink>

        <NavLink
          to="/subscriptions"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Subscriptions
        </NavLink>

        {!isMobile() && canUse('qrRelay') && (
          <NavLink
            to="/relay"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            QR Relay
          </NavLink>
        )}
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Settings
        </NavLink>

        <NavLink
          to="/profile"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Profile
        </NavLink>

        {canUse('auditLog') && (
          <NavLink
            to="/audit-log"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            Audit log
          </NavLink>
        )}

        <div className="account">
          <div className="avatar">{initials}</div>

          <div className="account-details">
            <strong>{displayName}</strong>
            <span>{user?.email ?? 'Personal account'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="nav-item"
          style={{
            background: 'none',
            border: 'none',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'var(--shq-error)',
            fontWeight: '500',
            marginTop: '8px',
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar