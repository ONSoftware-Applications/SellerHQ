import { useNavigate, useParams } from 'react-router-dom'

const LEGAL_BASE = 'https://onsoftware.uk/legal'

const DOCUMENTS = [
  {
    slug: 'privacy',
    title: 'Privacy Notice',
    description: 'How ONSoftware and SellerHQ handle personal and business data.',
  },
  {
    slug: 'sellerhq-terms',
    title: 'SellerHQ Service Terms',
    description: 'Accounts, product use, plans, data, availability and responsibilities.',
  },
  {
    slug: 'subscriptions-refunds',
    title: 'Subscription, Cancellation & Refund Policy',
    description: 'Paid-plan renewal, cancellation and refund requests.',
  },
  {
    slug: 'tax-disclaimer',
    title: 'Tax & Financial Tools Disclaimer',
    description: 'The limits of tax estimates, forecasts, pricing tools and other calculations.',
  },
  {
    slug: 'cookies',
    title: 'Cookie & Local Storage Policy',
    description: 'Essential browser storage, authentication and related technologies.',
  },
  {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    description: 'Rules designed to protect SellerHQ users, data and infrastructure.',
  },
  {
    slug: 'security',
    title: 'Security & Responsible Disclosure',
    description: 'Security approach and how to report a possible vulnerability privately.',
  },
]

const LEGACY_MAP: Record<string, string> = {
  terms: 'sellerhq-terms',
}

function Legal() {
  const navigate = useNavigate()
  const { page } = useParams()
  const requested = LEGACY_MAP[page ?? ''] ?? page
  const selected = DOCUMENTS.find((item) => item.slug === requested)

  return (
    <div className="inventory-page" style={{ maxWidth: 820 }}>
      <button
        type="button"
        className="text-button"
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700 }}>
        Legal & privacy
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--shq-ink-muted)' }}>
        ONSoftware maintains the canonical public legal documents for SellerHQ at onsoftware.uk. This keeps the terms available before sign-in and avoids different copies drifting out of sync.
      </p>

      {selected && (
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            border: '1px solid var(--shq-border)',
            borderRadius: 12,
            background: 'var(--shq-surface)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 6 }}>{selected.title}</div>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--shq-ink-muted)' }}>
            {selected.description}
          </p>
          <a
            className="primary-button"
            href={`${LEGAL_BASE}/${selected.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            Read current document ↗
          </a>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 12,
        }}
      >
        {DOCUMENTS.map((document) => (
          <a
            key={document.slug}
            href={`${LEGAL_BASE}/${document.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              padding: 18,
              border: '1px solid var(--shq-border)',
              borderRadius: 12,
              background: 'var(--shq-surface)',
              color: 'var(--shq-ink)',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 6 }}>{document.title}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--shq-ink-muted)' }}>
              {document.description}
            </div>
          </a>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 12.5, lineHeight: 1.6, color: 'var(--shq-ink-muted)' }}>
        Legal and privacy enquiries: <a href="mailto:legal@onsoftware.uk">legal@onsoftware.uk</a> · Product and account enquiries: <a href="mailto:products@onsoftware.uk">products@onsoftware.uk</a>
      </p>
    </div>
  )
}

export default Legal
