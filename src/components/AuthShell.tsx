import type { ReactNode } from 'react'

import BrandMark from './BrandMark'
import Icon from './Icon'

type AuthShellProps = {
  eyebrow?: string
  title: string
  subtitle: string
  children: ReactNode
}

const benefits = [
  'Inventory, listings and sales in one workspace',
  'Profit, expenses and tax visibility without spreadsheets',
  'Action-focused insights that show what needs attention next',
]

function AuthShell({
  eyebrow = 'SellerHQ workspace',
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className="auth-v2-page">
      <section className="auth-v2-showcase" aria-label="SellerHQ overview">
        <div className="auth-v2-showcase-inner">
          <BrandMark size="lg" className="auth-v2-brand" />

          <div className="auth-v2-copy">
            <span className="auth-v2-eyebrow">{eyebrow}</span>
            <h1>Run your resale business from one place.</h1>
            <p>
              SellerHQ brings stock, marketplace activity, sales and business
              finances into a single operating workspace.
            </p>
          </div>

          <div className="auth-v2-benefits">
            {benefits.map((benefit) => (
              <div className="auth-v2-benefit" key={benefit}>
                <span className="auth-v2-benefit-icon">
                  <Icon name="check" size={15} />
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="auth-v2-preview" aria-hidden="true">
            <div className="auth-v2-preview-head">
              <span>Business overview</span>
              <span className="auth-v2-preview-pill">This month</span>
            </div>
            <div className="auth-v2-preview-metrics">
              <div><span>Revenue</span><strong>£2,840</strong></div>
              <div><span>Net profit</span><strong>£1,164</strong></div>
              <div><span>Sales</span><strong>38</strong></div>
            </div>
            <div className="auth-v2-preview-chart">
              {[42, 58, 46, 72, 64, 88, 78, 100].map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="auth-v2-form-side">
        <div className="auth-v2-card">
          <div className="auth-v2-mobile-brand">
            <BrandMark size="md" />
          </div>
          <header className="auth-v2-header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}

export default AuthShell
