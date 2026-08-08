import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'

type InviteState =
  | { status: 'loading' }
  | { status: 'invalid'; reason: string }
  | { status: 'accepted' }
  | { status: 'needs-auth'; inviteId: string; email: string; businessId: string; role: string }

function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<InviteState>({ status: 'loading' })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  useEffect(() => {
    if (!token) {
      setState({ status: 'invalid', reason: 'Missing invite token.' })
      return
    }

    void loadInvite(token)
  }, [token])

  async function loadInvite(token: string) {
    const { data: invite, error: inviteError } = await supabase
      .from('business_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (inviteError || !invite) {
      setState({ status: 'invalid', reason: 'This invite link is invalid or has been removed.' })
      return
    }

    if (invite.status === 'accepted') {
      setState({ status: 'accepted' })
      return
    }

    if (invite.status === 'revoked') {
      setState({ status: 'invalid', reason: 'This invite has been revoked.' })
      return
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      setState({ status: 'invalid', reason: 'This invite has expired.' })
      return
    }

    setEmail(invite.email)

    const { data: { user } } = await supabase.auth.getUser()

    if (user && user.email?.toLowerCase() === invite.email.toLowerCase()) {
      await accept(invite.id, user.id, invite.business_id, invite.role)
    } else {
      setState({
        status: 'needs-auth',
        inviteId: invite.id,
        email: invite.email,
        businessId: invite.business_id,
        role: invite.role,
      })
    }
  }

  async function accept(inviteId: string, userId: string, businessId: string, role: string) {
    const { error: memberError } = await supabase.from('business_members').insert({
      business_id: businessId,
      user_id: userId,
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
      role,
      status: 'active',
      joined_at: new Date().toISOString(),
    })

    if (memberError) {
      setState({ status: 'invalid', reason: 'Could not join. You may already be a member.' })
      return
    }

    await supabase
      .from('business_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId)

    setState({ status: 'accepted' })
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (user && state.status === 'needs-auth') {
        await accept(state.inviteId, user.id, state.businessId, state.role)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (state.status === 'needs-auth') {
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.email?.toLowerCase() === state.email.toLowerCase()) {
          await accept(state.inviteId, user.id, state.businessId, state.role)
        } else {
          setError(`This invite is for ${state.email}. You signed in as ${user?.email}.`)
        }
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="inventory-loading" style={{ minHeight: 120 }}>
            <div className="inventory-spinner" />
          </div>
          <p style={{ textAlign: 'center', color: 'var(--shq-ink-muted)' }}>Checking your invite...</p>
        </div>
      </div>
    )
  }

  if (state.status === 'accepted') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div style={{ fontSize: 48, textAlign: 'center' }}>🎉</div>
          <h1 style={{ textAlign: 'center', margin: '16px 0 8px' }}>You are in!</h1>
          <p style={{ textAlign: 'center', color: 'var(--shq-ink-muted)', marginBottom: 24 }}>
            You have been added to the business. Head to your dashboard to get started.
          </p>
          <button className="primary-button auth-submit" onClick={() => navigate('/dashboard')}>
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'invalid') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div style={{ fontSize: 48, textAlign: 'center' }}>⚠️</div>
          <h1 style={{ textAlign: 'center', margin: '16px 0 8px' }}>Invite not valid</h1>
          <p style={{ textAlign: 'center', color: 'var(--shq-ink-muted)', marginBottom: 24 }}>
            {state.reason}
          </p>
          <button className="primary-button auth-submit" onClick={() => navigate('/')}>
            Go to SellerHQ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 style={{ textAlign: 'center', margin: '0 0 8px' }}>Join the team</h1>
        <p style={{ textAlign: 'center', color: 'var(--shq-ink-muted)', marginBottom: 24 }}>
          You have been invited to join a business on SellerHQ as <strong>{state.email}</strong>.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <div style={{ display: 'flex', gap: '8px', marginBottom: 16 }}>
          <button
            type="button"
            className={mode === 'signup' ? 'primary-button' : 'secondary-button'}
            onClick={() => setMode('signup')}
            style={{ flex: 1 }}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === 'signin' ? 'primary-button' : 'secondary-button'}
            onClick={() => setMode('signin')}
            style={{ flex: 1 }}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', margin: '12px 0 4px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          <button type="submit" className="primary-button auth-submit" disabled={submitting} style={{ marginTop: 16 }}>
            {submitting
              ? 'Please wait...'
              : mode === 'signup'
                ? 'Create account & join'
                : 'Sign in & join'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--shq-border)',
  borderRadius: '8px',
  fontSize: '14px',
  background: 'var(--shq-bg)',
  color: 'var(--shq-ink)',
  boxSizing: 'border-box',
}

export default AcceptInvite
