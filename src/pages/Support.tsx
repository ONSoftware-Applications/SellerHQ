import { useNavigate } from 'react-router-dom'

import Icon from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'

function Support() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSettings()
  const { plan } = useSubscription()

  const subject = encodeURIComponent('SellerHQ support request')
  const body = encodeURIComponent(
    `Plan: ${plan}\nBusiness: ${settings.business.businessName || '—'}\nAccount: ${user?.email || '—'}\n\nDescribe what you need help with:\n`,
  )
  const supportMail = `mailto:products@onsoftware.uk?subject=${subject}&body=${body}`
  const feedbackMail = 'mailto:feedback@onsoftware.uk?subject=SellerHQ%20feedback'

  return (
    <div className="help-v2">
      <header className="help-v2-header">
        <span className="workspace-v2-eyebrow">SellerHQ support</span>
        <h1>How can we help?</h1>
        <p>Get product support, report an issue or send feedback without leaving your SellerHQ context behind.</p>
      </header>

      <div className="help-v2-grid">
        <a href={supportMail} className="panel-v2 help-card-v2">
          <span className="help-icon-v2"><Icon name="support" size={20} /></span>
          <div><h2>Contact support</h2><p>Email the SellerHQ product team with your account context pre-filled.</p></div>
          <Icon name="arrow-right" size={15} />
        </a>

        <a
          href="https://github.com/ONSoftware-Applications/SellerHQ/issues"
          target="_blank"
          rel="noreferrer"
          className="panel-v2 help-card-v2"
        >
          <span className="help-icon-v2"><Icon name="alert" size={20} /></span>
          <div><h2>Report a technical issue</h2><p>Open a reproducible bug report for the SellerHQ application.</p></div>
          <Icon name="arrow-right" size={15} />
        </a>

        <a href={feedbackMail} className="panel-v2 help-card-v2">
          <span className="help-icon-v2"><Icon name="sparkles" size={20} /></span>
          <div><h2>Product feedback</h2><p>Suggest an improvement or tell ONSoftware what is getting in your way.</p></div>
          <Icon name="arrow-right" size={15} />
        </a>

        <button type="button" className="panel-v2 help-card-v2" onClick={() => navigate('/settings?view=account')}>
          <span className="help-icon-v2"><Icon name="profile" size={20} /></span>
          <div><h2>Account & data</h2><p>Backups, account details, sign-out and deletion controls are in Settings.</p></div>
          <Icon name="arrow-right" size={15} />
        </button>
      </div>

      <section className="panel-v2 help-context-v2">
        <header className="panel-v2-header"><div><h2>Support context</h2><p>Useful information to include when asking for help.</p></div></header>
        <div className="help-context-grid-v2">
          <div><span>Plan</span><strong>{plan}</strong></div>
          <div><span>Account</span><strong>{user?.email || 'Not available'}</strong></div>
          <div><span>Business</span><strong>{settings.business.businessName || 'Current SellerHQ business'}</strong></div>
        </div>
        <p>Pro and Business users receive priority handling where support capacity permits.</p>
      </section>

      <div className="help-footer-links-v2">
        <button type="button" onClick={() => navigate('/legal/privacy')}>Privacy</button>
        <button type="button" onClick={() => navigate('/legal/sellerhq-terms')}>Service terms</button>
        <button type="button" onClick={() => navigate('/legal/security')}>Security</button>
      </div>
    </div>
  )
}

export default Support
