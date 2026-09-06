import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Icon from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { useBusiness } from '../hooks/useBusiness'
import { useSubscription } from '../hooks/useSubscription'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'

function CreateBusiness() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { businesses, refreshBusinesses } = useBusiness()
  const { plan, businessLimit } = useSubscription()

  const [step, setStep] = useState<1 | 2>(1)
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('Sole Trader')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function continueSetup() {
    if (!businessName.trim()) {
      setError('Please enter your business name.')
      return
    }
    if (businesses.length >= businessLimit) {
      setError(
        `Your ${plan} plan includes up to ${businessLimit} business${businessLimit === 1 ? '' : 'es'}. Upgrade to create another.`,
      )
      return
    }
    setError('')
    setStep(2)
  }

  async function createBusiness() {
    if (!user) {
      setError('You must be logged in to create a business.')
      return
    }

    if (!businessName.trim()) {
      setStep(1)
      setError('Please enter your business name.')
      return
    }

    setError('')
    setLoading(true)

    const { error: insertError } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        name: businessName.trim(),
        business_type: businessType,
      })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    await refreshBusinesses()
    void logAudit('business.created', { name: businessName.trim() })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="business-onboarding-v2">
      <div className="business-onboarding-progress-v2">
        <span className="active">1</span><i /><span className={step === 2 ? 'active' : ''}>2</span>
      </div>

      <header className="business-onboarding-header-v2">
        <span className="workspace-v2-eyebrow">New workspace</span>
        <h1>{step === 1 ? 'Set up your business' : 'Your SellerHQ workspace is ready to create'}</h1>
        <p>
          {step === 1
            ? 'Start with the business identity SellerHQ will use across inventory, sales, finance and reports.'
            : 'Review the details below. You can change business settings, branding and team access later.'}
        </p>
      </header>

      {step === 1 ? (
        <section className="panel-v2 business-onboarding-card-v2">
          <div className="settings-form-grid-v2 business-onboarding-fields-v2">
            <label>
              <span>Business name</span>
              <input
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="e.g. Northside Resale"
                autoComplete="organization"
                autoFocus
              />
            </label>

            <label>
              <span>Business type</span>
              <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                <option value="Sole Trader">Sole Trader</option>
                <option value="Limited Company">Limited Company</option>
                <option value="Partnership">Partnership</option>
              </select>
            </label>
          </div>

          {error && <div className="inventory-alert">{error}</div>}

          <div className="business-onboarding-actions-v2">
            {businesses.length > 0 && (
              <button type="button" className="secondary-button" onClick={() => navigate(-1)}>Cancel</button>
            )}
            <button type="button" className="primary-button" onClick={continueSetup}>
              Continue <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </section>
      ) : (
        <div className="business-onboarding-review-v2">
          <section className="panel-v2 business-onboarding-card-v2">
            <header className="panel-v2-header"><div><h2>Business details</h2><p>This creates a separate SellerHQ workspace.</p></div></header>
            <div className="business-review-v2">
              <div><span>Name</span><strong>{businessName.trim()}</strong></div>
              <div><span>Type</span><strong>{businessType}</strong></div>
              <div><span>Plan</span><strong>{plan}</strong></div>
            </div>
          </section>

          <section className="panel-v2 business-onboarding-card-v2">
            <header className="panel-v2-header"><div><h2>What happens next</h2><p>Your new workspace starts clean and ready for setup.</p></div></header>
            <div className="business-next-v2">
              <div><Icon name="inventory" size={16} /><span>Add or import your first stock.</span></div>
              <div><Icon name="settings" size={16} /><span>Set branding, features, currency and team access.</span></div>
              <div><Icon name="dashboard" size={16} /><span>SellerHQ builds your dashboard as activity is recorded.</span></div>
            </div>
          </section>

          {error && <div className="inventory-alert">{error}</div>}

          <div className="business-onboarding-actions-v2">
            <button type="button" className="secondary-button" onClick={() => setStep(1)} disabled={loading}>Back</button>
            <button type="button" className="primary-button" onClick={() => void createBusiness()} disabled={loading}>
              {loading ? 'Creating workspace…' : 'Create business'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateBusiness
