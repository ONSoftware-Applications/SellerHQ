import { NavLink, useNavigate } from 'react-router-dom'

import BrandMark from './BrandMark'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'

function Sidebar() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { settings } = useSettings()

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

  return (
    <aside className="sidebar">
      <BrandMark className="sidebar-brand" />

      <nav className="navigation">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Inventory
        </NavLink>

        {settings.features.listingsEnabled && (
          <NavLink
            to="/listings"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            Listings
          </NavLink>
        )}

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Sales
        </NavLink>

        {settings.features.expensesEnabled && (
          <NavLink
            to="/expenses"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
          Expenses
        </NavLink>
        )}

        {settings.features.forecastsEnabled && (
          <NavLink
            to="/forecasts"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            Forecasts
          </NavLink>
        )}

        <NavLink
          to="/tax"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Tax
        </NavLink>

        <NavLink
          to="/pricing"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Pricing
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Reports
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Settings
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          Profile
        </NavLink>

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