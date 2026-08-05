import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('Sole Trader')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    if (!user) {
      setError('You must be logged in to create a business.')
      return
    }

    if (businesses.length >= businessLimit) {
      setError(
        `Your ${plan} plan includes up to ${businessLimit} business${businessLimit === 1 ? '' : 'es'}. Upgrade to create another.`,
      )
      return
    }

    if (!businessName.trim()) {
      setError('Please enter your business name.')
      return
    }

    setError('')
    setLoading(true)

    const { error } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        name: businessName.trim(),
        business_type: businessType,
      })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    await refreshBusinesses()
    void logAudit('business.created', { name: businessName.trim() })

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card business-setup-card">
        <div className="auth-header">
          <div className="auth-brand">
            <div className="auth-brand-mark">S</div>
            <span>SellerHQ</span>
          </div>

          <h1>Create your business</h1>

          <p>
            Tell us a little about the business you want
            to manage with SellerHQ.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Business name

            <input
              type="text"
              value={businessName}
              onChange={(event) =>
                setBusinessName(event.target.value)
              }
              placeholder="e.g. Ollie's Reselling"
              autoComplete="organization"
              required
            />
          </label>

          <label>
            Business type

            <select
              value={businessType}
              onChange={(event) =>
                setBusinessType(event.target.value)
              }
            >
              <option value="Sole Trader">
                Sole Trader
              </option>

              <option value="Limited Company">
                Limited Company
              </option>

              <option value="Partnership">
                Partnership
              </option>
            </select>
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Creating business...'
              : 'Create business'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateBusiness