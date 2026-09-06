import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import AuthShell from '../components/AuthShell'
import { useAuth } from '../hooks/useAuth'

const LEGAL_BASE = 'https://onsoftware.uk/legal'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email.trim(), password)
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <AuthShell
      eyebrow="SellerHQ"
      title="Welcome back"
      subtitle="Sign in to continue to your business workspace."
    >
      <form onSubmit={handleSubmit}>
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="auth-v2-error">{error}</div>}

        <button
          type="submit"
          className="auth-v2-submit"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="auth-v2-footer">
        <span>New to SellerHQ?</span>
        <Link to="/register">Create an account</Link>
      </div>

      <div className="auth-v2-legal">
        <a href={`${LEGAL_BASE}/privacy`}>Privacy</a>
        <a href={`${LEGAL_BASE}/sellerhq-terms`}>Terms</a>
        <a href={`${LEGAL_BASE}/cookies`}>Cookies</a>
      </div>
    </AuthShell>
  )
}

export default Login
