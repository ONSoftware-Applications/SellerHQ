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

    // Audit rows are written through the trusted SECURITY DEFINER RPC, which
    // stamps the authenticated actor server-side. The client cannot insert
    // audit rows directly (its INSERT policy has been removed).
    await supabase.rpc('write_audit_log', {
      p_business_id: businessId ?? null,
      p_action: action,
      p_details: details ?? null,
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
