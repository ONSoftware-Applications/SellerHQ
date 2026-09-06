import { NavLink, useNavigate } from 'react-router-dom'

import BrandMark from './BrandMark'
import Icon, { type IconName } from './Icon'
import { useAuth } from '../hooks/useAuth'
import { useBusiness } from '../hooks/useBusiness'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import { appDisplayName, isWhiteLabel } from '../lib/branding'

function isMobileDevice() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

type SidebarProps = {
  mobileNavOpen?: boolean
  onCloseMobileNav?: () => void
}

type SidebarLinkProps = {
  to: string
  label: string
  icon: IconName
  onClick: () => void
}

function SidebarLink({ to, label, icon, onClick }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </NavLink>
  )
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
    onCloseMobileNav?.()
  }

  function renderBrand() {
    if (currentBusiness && isWhiteLabel(currentBusiness)) {
      return (
        <div className="sidebar-brand">
          {currentBusiness.logo_url ? (
            <img
              src={currentBusiness.logo_url}
              alt={`${currentBusiness.name} logo`}
              className="brand-mark-logo"
              style={{ width: 31, height: 31, objectFit: 'contain' }}
            />
          ) : (
            <div
              className="brand-mark-icon"
              aria-hidden="true"
              style={{
                width: 31,
                height: 31,
                borderRadius: 8,
                background: 'rgb(255 255 255 / 8%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {currentBusiness.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="brand-mark-wordmark">{appDisplayName(currentBusiness)}</span>
        </div>
      )
    }

    if (currentBusiness?.logo_url) {
      return (
        <div className="sidebar-brand">
          <img
            src={currentBusiness.logo_url}
            alt={`${currentBusiness.name} logo`}
            className="brand-mark-logo"
            style={{ width: 31, height: 31, objectFit: 'contain' }}
          />
          <span className="brand-mark-wordmark">{currentBusiness.name}</span>
        </div>
      )
    }

    return <BrandMark className="sidebar-brand" />
  }

  return (
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-mobile-open' : ''}`}>
      {renderBrand()}

      <nav className="navigation" aria-label="Primary navigation">
        <div className="nav-group">
          <SidebarLink
            to="/dashboard"
            label="Overview"
            icon="dashboard"
            onClick={handleNavClick}
          />
        </div>

        <div className="nav-group">
          <span className="nav-group-label">Operations</span>
          <SidebarLink
            to="/inventory"
            label="Inventory"
            icon="inventory"
            onClick={handleNavClick}
          />

          {settings.features.listingsEnabled && canUse('listings') && (
            <SidebarLink
              to="/listings"
              label="Listings"
              icon="listings"
              onClick={handleNavClick}
            />
          )}

          <SidebarLink
            to="/sales"
            label="Sales"
            icon="sales"
            onClick={handleNavClick}
          />

          {canUse('tillMode') && settings.features.tillModeEnabled && (
            <SidebarLink
              to="/till"
              label="Till"
              icon="till"
              onClick={handleNavClick}
            />
          )}
        </div>

        <div className="nav-group">
          <span className="nav-group-label">Finance</span>

          {settings.features.expensesEnabled && (
            <SidebarLink
              to="/expenses"
              label="Expenses"
              icon="expenses"
              onClick={handleNavClick}
            />
          )}

          <SidebarLink
            to="/tax"
            label="Tax"
            icon="tax"
            onClick={handleNavClick}
          />

          {canUse('reports') && (
            <SidebarLink
              to="/reports"
              label="Reports"
              icon="reports"
              onClick={handleNavClick}
            />
          )}

          {settings.features.forecastsEnabled && canUse('forecasts') && (
            <SidebarLink
              to="/forecasts"
              label="Forecasts"
              icon="forecast"
              onClick={handleNavClick}
            />
          )}
        </div>

        <div className="nav-group">
          <span className="nav-group-label">Workspace</span>

          {settings.features.receiptsEnabled && (
            <SidebarLink
              to="/receipts"
              label="Receipts"
              icon="receipts"
              onClick={handleNavClick}
            />
          )}

          <SidebarLink
            to="/team"
            label="Team"
            icon="team"
            onClick={handleNavClick}
          />

          {!isMobileDevice() && canUse('qrRelay') && (
            <SidebarLink
              to="/relay"
              label="QR relay"
              icon="relay"
              onClick={handleNavClick}
            />
          )}
        </div>
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-bottom-links">
          <SidebarLink
            to="/settings"
            label="Settings"
            icon="settings"
            onClick={handleNavClick}
          />
          <SidebarLink
            to="/support"
            label="Help & support"
            icon="support"
            onClick={handleNavClick}
          />
          {canUse('auditLog') && (
            <SidebarLink
              to="/audit-log"
              label="Audit log"
              icon="reports"
              onClick={handleNavClick}
            />
          )}
        </div>

        <button
          type="button"
          className="account sidebar-account-button"
          onClick={() => {
            handleNavClick()
            navigate('/profile')
          }}
          aria-label="Open profile"
        >
          <div className="avatar">{initials}</div>
          <div className="account-details">
            <strong>{displayName}</strong>
            <span>{user?.email ?? 'Personal account'}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="nav-item sidebar-signout"
        >
          <Icon name="logout" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
