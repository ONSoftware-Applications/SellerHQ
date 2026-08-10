import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import BrandMark from '../components/BrandMark'
import { useAuth } from '../hooks/useAuth'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from =
    (location.state as { from?: string } | null)?.from ??
    '/dashboard'

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    setError('')
    setLoading(true)

    const { error } = await signIn(
      email.trim(),
      password,
    )

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <BrandMark className="auth-brand" />

          <h1>Welcome back</h1>

          <p>
            Sign in to manage your reselling business.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Email address

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
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
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Don't have a SellerHQ account?</span>

          <Link to="/register">
            Create an account
          </Link>
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--shq-border)',
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            fontSize: 12.5,
          }}
        >
          <Link to="/legal/privacy" style={{ color: 'var(--shq-ink-muted)' }}>Privacy</Link>
          <Link to="/legal/terms" style={{ color: 'var(--shq-ink-muted)' }}>Terms</Link>
          <Link to="/legal/cookies" style={{ color: 'var(--shq-ink-muted)' }}>Cookies</Link>
        </div>
      </div>
    </div>
  )
}

export default Login