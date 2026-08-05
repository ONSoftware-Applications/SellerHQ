import { supabase } from './supabase'

export async function logAudit(
  action: string,
  details?: Record<string, unknown>,
  businessId?: string,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      business_id: businessId ?? null,
      action,
      details: details ?? null,
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
