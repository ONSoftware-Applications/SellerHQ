import { supabase } from './supabase'

export async function publishProductToVicarious(productId: string, publish = true) {
  const { data, error } = await supabase.functions.invoke('vicarious-link', {
    body: {
      action: 'publish_product',
      productId,
      publish,
    },
  })

  if (error) {
    throw new Error(error.message || 'Could not sync product to Vicarious Clothing.')
  }

  const response = data as { ok?: boolean; error?: string; response?: unknown } | null
  if (!response?.ok) {
    throw new Error(response?.error || 'Could not sync product to Vicarious Clothing.')
  }

  return response.response
}
