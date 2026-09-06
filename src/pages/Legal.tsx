import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Icon from '../components/Icon'

const LEGAL_BASE = 'https://onsoftware.uk/legal'

const LEGACY_MAP: Record<string, string> = {
  terms: 'sellerhq-terms',
}

const ALLOWED = new Set([
  'privacy',
  'sellerhq-terms',
  'subscriptions-refunds',
  'tax-disclaimer',
  'cookies',
  'acceptable-use',
  'security',
])

function Legal() {
  const navigate = useNavigate()
  const { page } = useParams()
  const requested = LEGACY_MAP[page ?? ''] ?? page ?? 'sellerhq-terms'
  const slug = ALLOWED.has(requested) ? requested : 'sellerhq-terms'
  const destination = `${LEGAL_BASE}/${slug}`

  useEffect(() => {
    window.location.replace(destination)
  }, [destination])

  return (
    <div className="legal-redirect-v2 panel-v2">
      <Icon name="reports" size={20} />
      <div>
        <h1>Opening the current legal document…</h1>
        <p>SellerHQ uses ONSoftware's canonical public legal documents so signed-in and public copies cannot drift apart.</p>
      </div>
      <a className="primary-button" href={destination}>Open document</a>
      <button type="button" className="secondary-button" onClick={() => navigate(-1)}>Go back</button>
    </div>
  )
}

export default Legal
