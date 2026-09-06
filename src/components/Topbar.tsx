import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Icon from './Icon'
import { useBusiness } from '../hooks/useBusiness'
import { useProducts } from '../hooks/useProducts'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import { appDisplayName } from '../lib/branding'

function isInstallable() {
  return !window.matchMedia('(display-mode: standalone)').matches &&
    !(window.navigator as unknown as { standalone?: boolean }).standalone
}

function isMobileDevice() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

type TopbarProps = {
  onToggleMobileNav?: () => void
}

function Topbar({ onToggleMobileNav }: TopbarProps) {
  const navigate = useNavigate()
  const {
    businesses,
    currentBusiness,
    loading,
    switchBusiness,
    joinWithCode,
  } = useBusiness()
  const { products } = useProducts()
  const { canUse } = useSubscription()
  const { showToast } = useToast()

  const [open, setOpen] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [joining, setJoining] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const appName = appDisplayName(currentBusiness)

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return products
      .filter((product) => [
        product.code,
        product.sku,
        product.name,
        product.brand,
        product.category,
        product.barcode,
      ].join(' ').toLowerCase().includes(query))
      .slice(0, 7)
  }, [products, search])

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
    } catch (error) {
      console.error(error)
      showToast('Could not join the business.', 'error')
    } finally {
      setJoining(false)
    }
  }

  function openProduct(productId: string) {
    setSearch('')
    setSearchOpen(false)
    navigate(`/products/${productId}`)
  }

  return (
    <header className="topbar topbar-v2-global">
      <div className="topbar-left topbar-v2-left">
        <button
          type="button"
          className="hamburger topbar-icon-btn"
          onClick={onToggleMobileNav}
          aria-label="Open menu"
        >
          <Icon name="menu" size={19} />
        </button>

        <div className={`global-search-v2 ${searchOpen ? 'mobile-open' : ''}`}>
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Search products, SKU, barcode…"
            value={search}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value)
              setSearchOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchOpen(false)
                setSearch('')
              }
            }}
          />
          {search && (
            <button type="button" className="global-search-clear-v2" onClick={() => setSearch('')} aria-label="Clear search">
              <Icon name="close" size={13} />
            </button>
          )}
          {searchOpen && search.trim() && (
            <div className="global-search-results-v2">
              {searchResults.length ? searchResults.map((product) => (
                <button type="button" key={product.id} onClick={() => openProduct(product.id)}>
                  <span><strong>{product.name}</strong><small>{product.code} · {product.brand || 'No brand'}</small></span>
                  <span className={`status-badge status-${product.status.toLowerCase().replace(/ /g, '-')}`}>{product.status}</span>
                </button>
              )) : (
                <div className="global-search-empty-v2">No matching products.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-icon-btn topbar-search-mobile-v2"
          onClick={() => setSearchOpen((value) => !value)}
          aria-label="Search products"
          title="Search products"
        >
          <Icon name="search" size={17} />
        </button>

        <button
          type="button"
          className="topbar-icon-btn"
          onClick={() => navigate('/support')}
          aria-label="Help"
          title="Help"
        >
          <Icon name="support" size={17} />
        </button>

        {isInstallable() && (
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => navigate('/install')}
            aria-label={`Install ${appName}`}
            title={`Install ${appName}`}
          >
            <Icon name="download" size={17} />
          </button>
        )}

        {isMobileDevice() && canUse('qrScanner') && (
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="topbar-icon-btn"
            aria-label="Scan QR code"
            title="Scan QR code"
          >
            <Icon name="scan" size={18} />
          </button>
        )}

        <div className="business-selector-wrapper">
          {loading ? (
            <div className="business-selector business-selector-loading">
              <div className="business-icon">…</div>
              <div><strong>Loading…</strong><span>Business</span></div>
            </div>
          ) : currentBusiness ? (
            <>
              <button
                className="business-selector"
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup="listbox"
              >
                <div className="business-icon">
                  {currentBusiness.logo_url ? (
                    <img src={currentBusiness.logo_url} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                  ) : currentBusiness.name.charAt(0).toUpperCase()}
                </div>
                <div><strong>{currentBusiness.name}</strong><span>{currentBusiness.business_type}</span></div>
                <span className="chevron"><Icon name="chevron-down" size={14} /></span>
              </button>

              {open && (
                <div className="business-menu" role="listbox">
                  <div className="business-menu-heading">Your businesses</div>
                  {businesses.map((business) => (
                    <button
                      key={business.id}
                      type="button"
                      className={`business-menu-item ${business.id === currentBusiness.id ? 'selected' : ''}`}
                      onClick={() => {
                        switchBusiness(business.id)
                        setOpen(false)
                      }}
                    >
                      <div className="business-menu-icon">
                        {business.logo_url ? <img src={business.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> : business.name.charAt(0).toUpperCase()}
                      </div>
                      <div><strong>{business.name}</strong><span>{business.business_type}</span></div>
                      {business.id === currentBusiness.id && <Icon name="check" size={15} />}
                    </button>
                  ))}

                  <div className="business-menu-divider" />
                  <button type="button" className="business-menu-add" onClick={() => { setOpen(false); navigate('/create-business') }}>
                    <Icon name="plus" size={15} /> Add another business
                  </button>
                  <button type="button" className="business-menu-add" onClick={() => { setOpen(false); navigate('/settings?view=business') }}>
                    <Icon name="settings" size={15} /> Business settings
                  </button>

                  <div className="business-menu-divider" />
                  <div className="business-menu-join">
                    <label className="business-menu-join-label" htmlFor="business-join-code">Join with a code</label>
                    <div className="business-menu-join-row">
                      <input
                        id="business-join-code"
                        type="text"
                        placeholder="Invite code"
                        value={codeInput}
                        onChange={(event) => setCodeInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void handleJoinCode()
                          }
                        }}
                      />
                      <button type="button" onClick={() => void handleJoinCode()} disabled={joining || !codeInput.trim()}>
                        {joining ? 'Joining…' : 'Join'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Topbar
