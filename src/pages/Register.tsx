import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AuthShell from '../components/AuthShell'
import { useAuth } from '../hooks/useAuth'

const LEGAL_BASE = 'https://onsoftware.uk/legal'

function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await signUp(email.trim(), password, fullName.trim())
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Account created. Check your email to verify your account.')
  }

  if (message) {
    return (
      <AuthShell
        eyebrow="Account created"
        title="Check your email"
        subtitle={message}
      >
        <button
          className="auth-v2-submit"
          onClick={() => navigate('/login')}
        >
          Go to sign in
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Set up SellerHQ and start organising your resale business."
    >
      <form onSubmit={handleSubmit}>
        <label>
          Full name
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
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
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Enter your password again"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="auth-v2-check">
          <input type="checkbox" required />
          <span>
            I agree to the{' '}
            <a href={`${LEGAL_BASE}/sellerhq-terms`} target="_blank" rel="noreferrer">
              SellerHQ Service Terms
            </a>{' '}
            and confirm that I have read the{' '}
            <a href={`${LEGAL_BASE}/privacy`} target="_blank" rel="noreferrer">
              Privacy Notice
            </a>.
          </span>
        </label>

        {error && <div className="auth-v2-error">{error}</div>}

        <button
          type="submit"
          className="auth-v2-submit"
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="auth-v2-footer">
        <span>Already have an account?</span>
        <Link to="/login">Sign in</Link>
      </div>

      <div className="auth-v2-legal">
        <a href={`${LEGAL_BASE}/privacy`}>Privacy</a>
        <a href={`${LEGAL_BASE}/sellerhq-terms`}>Terms</a>
        <a href={`${LEGAL_BASE}/cookies`}>Cookies</a>
      </div>
    </AuthShell>
  )
}

export default Register
