export type BusinessRole = 'owner' | 'admin' | 'member'

export type Business = {
  id: string
  owner_id: string
  name: string
  business_type: string
  created_at: string
  logo_url?: string | null
  accent_color?: string | null
  white_label?: boolean
  app_name?: string | null
  label_branding?: boolean
  memberRole?: BusinessRole
}