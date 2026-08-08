import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null, admin: null }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return { user: null, admin: null }
  return { user: data.user, admin }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500)
  }

  try {
    const { user, admin } = await getUserFromRequest(request)
    if (!user || !admin) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await request.json()
    const email: string | undefined = body?.email
    const token: string | undefined = body?.token
    const businessName: string | undefined = body?.businessName
    const role: string | undefined = body?.role

    if (!email || !token) {
      return jsonResponse({ error: 'Missing email or token' }, 400)
    }

    // Confirm this invite exists, is pending, and was created by the caller.
    const { data: invite, error: inviteError } = await admin
      .from('business_invites')
      .select('id, business_id, invited_by, status, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (inviteError) {
      console.error('send-invite-email: invite lookup failed:', inviteError)
      return jsonResponse({ error: 'Invite lookup failed' }, 500)
    }

    if (!invite) {
      return jsonResponse({ error: 'Invite not found' }, 404)
    }

    if (invite.status !== 'pending') {
      return jsonResponse({ error: `Invite is ${invite.status}` }, 409)
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: 'Invite has expired' }, 409)
    }

    if (invite.invited_by !== user.id) {
      return jsonResponse({ error: 'Not authorised to send this invite' }, 403)
    }

    const appUrl = Deno.env.get('APP_URL') ?? ''
    if (!appUrl) {
      return jsonResponse({ error: 'APP_URL is not configured' }, 500)
    }

    const inviteUrl = `${appUrl}/invite/${token}`
    const roleLabel = role === 'admin' ? 'Admin' : 'Member'
    const from =
      Deno.env.get('RESEND_FROM') ?? 'SellerHQ <invites@sellerhq.com>'

    const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f7f9;color:#1f2937">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700">You've been invited to a SellerHQ business</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6">
        <strong>${user.email}</strong> has invited you to join <strong>${businessName ?? 'your team'} </strong>on SellerHQ as a <strong>${roleLabel}</strong>.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">
        Click the button below to accept the invitation and set up your account.
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Accept invitation</a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6">
        The link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  </body>
</html>
`

    const resendRes = await fetch('https://api.resend.dev/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `You've been invited to join a SellerHQ business`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('send-invite-email: Resend error:', resendRes.status, err)
      return jsonResponse(
        { error: `Resend API error: ${resendRes.status}` },
        502,
      )
    }

    const sent = await resendRes.json()
    return jsonResponse({ sent: true, messageId: sent?.id })
  } catch (err) {
    console.error('send-invite-email error:', err)
    const message =
      err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
