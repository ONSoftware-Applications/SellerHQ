import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import BrandMark from '../components/BrandMark'
import { useAuth } from '../hooks/useAuth'

function Register() {
  const navigate = useNavigate()

  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (password.length < 8) {
      setError(
        'Your password must be at least 8 characters.',
      )
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
    )

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      'Account created. Check your email to verify your account.',
    )
  }

  if (message) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <BrandMark className="auth-brand" />

            <h1>Check your email</h1>

            <p>{message}</p>
          </div>

          <button
            className="primary-button auth-submit"
            onClick={() => navigate('/login')}
          >
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <BrandMark className="auth-brand" />

          <h1>Create your account</h1>

          <p>
            Start managing your reselling business with
            SellerHQ.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Full name

            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>

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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label>
            Confirm password

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Enter your password again"
              autoComplete="new-password"
              minLength={8}
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
            {loading
              ? 'Creating account...'
              : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>

          <Link to="/login">
            Sign in
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

export default Register