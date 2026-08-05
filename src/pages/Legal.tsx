import { useNavigate, useParams } from 'react-router-dom'

type Section = { heading: string; body: string }

const PRIVACY: Section[] = [
  {
    heading: '1. Data we collect',
    body: 'We collect the information you provide when you create an account and use SellerHQ, including your name, email address, business details, product inventory, expenses, sales records and billing preferences.',
  },
  {
    heading: '2. How we use your data',
    body: 'Your data is used to provide and improve SellerHQ, process payments through Stripe, support your business reporting, and send service-related communications. We do not sell your personal data.',
  },
  {
    heading: '3. Payment processing',
    body: 'Payments are processed securely by Stripe. We never store your full card details on our servers. Stripe handles your payment information under its own privacy policy.',
  },
  {
    heading: '4. Data storage & security',
    body: 'Your data is stored securely on our hosting provider (Supabase) with encryption in transit. Access is restricted to authenticated accounts, and we take reasonable measures to protect your information.',
  },
  {
    heading: '5. Your rights',
    body: 'You may request a copy, correction or deletion of your personal data at any time by contacting support. You can export or delete your data from your account settings.',
  },
  {
    heading: '6. Cookies & analytics',
    body: 'We use essential cookies to keep you signed in. We may use privacy-respecting analytics to understand how the app is used and improve it.',
  },
  {
    heading: '7. Changes to this policy',
    body: 'We may update this policy from time to time. Significant changes will be highlighted within the app.',
  },
  {
    heading: '8. Contact',
    body: 'If you have any questions about this policy, please contact us through the Support page.',
  },
]

const TERMS: Section[] = [
  {
    heading: '1. Acceptance of terms',
    body: 'By creating an account and using SellerHQ you agree to these Terms and Conditions. If you do not agree, please do not use the service.',
  },
  {
    heading: '2. Your account',
    body: 'You are responsible for keeping your login credentials secure and for all activity under your account. You must provide accurate information when registering.',
  },
  {
    heading: '3. Subscriptions & billing',
    body: 'Paid plans are billed monthly or annually in advance via Stripe. You can upgrade, downgrade or cancel at any time. Cancellations take effect at the end of the current billing period. Prices are displayed before checkout.',
  },
  {
    heading: '4. Free plan limits',
    body: 'The free plan includes a limited number of products and businesses and a subset of features. Limits are displayed in the app and on the subscriptions page.',
  },
  {
    heading: '5. Acceptable use',
    body: 'You agree not to misuse the service, attempt to access other accounts, interfere with the service, or use it for unlawful activity.',
  },
  {
    heading: '6. Availability',
    body: 'While we aim for high availability, we do not guarantee uninterrupted access. The service is provided "as is" without warranties of any kind.',
  },
  {
    heading: '7. Limitation of liability',
    body: 'SellerHQ is a tool to help you manage your business. We are not liable for financial losses, missed tax deadlines, or decisions made based on the data or calculations in the app.',
  },
  {
    heading: '8. Changes to the service',
    body: 'We may change, suspend or discontinue features at any time. We will endeavour to provide reasonable notice for significant changes.',
  },
  {
    heading: '9. Termination',
    body: 'We may suspend or terminate access to the service for violations of these terms. You may stop using and delete your account at any time.',
  },
  {
    heading: '10. Contact',
    body: 'Questions about these Terms can be directed through the Support page.',
  },
]

const CONTENT: Record<string, { title: string; intro: string; sections: Section[] }> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'Last updated: August 2026. This policy explains how SellerHQ collects, uses and protects your information.',
    sections: PRIVACY,
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'Last updated: August 2026. These terms govern your use of SellerHQ.',
    sections: TERMS,
  },
}

function Legal() {
  const navigate = useNavigate()
  const { page } = useParams()
  const content = CONTENT[page ?? ''] ?? CONTENT.privacy

  return (
    <div className="inventory-page" style={{ maxWidth: 760 }}>
      <button
        type="button"
        className="text-button"
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700 }}>
        {content.title}
      </h1>
      <p style={{ margin: '0 0 32px', fontSize: 13, color: 'var(--shq-ink-muted)' }}>
        {content.intro}
      </p>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: 12,
          padding: '28px 28px 12px',
        }}
      >
        {content.sections.map((section) => (
          <div key={section.heading} style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600 }}>
              {section.heading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                lineHeight: 1.65,
                color: 'var(--shq-ink)',
              }}
            >
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Legal
