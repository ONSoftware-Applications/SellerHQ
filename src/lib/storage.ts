import { supabase } from '../lib/supabase'
import { compressImage } from './compressImage'

export const PRODUCTS_BUCKET = 'products'

export async function uploadProductPhoto(
  file: File,
  productId: string,
  index: number,
): Promise<string | null> {
  const compressed = await compressImage(file)
  const ext = compressed.type ? compressed.type.split('/').pop() || 'png' : 'png'
  const path = `${productId}/${index}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(PRODUCTS_BUCKET)
    .upload(path, compressed, { upsert: true })

  if (error) {
    console.error('Failed to upload photo:', error)
    return null
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(path)

  return publicUrl
}

export async function deleteProductPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PRODUCTS_BUCKET).remove([path])
  if (error) console.error('Failed to delete photo:', error)
}

export function pathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const prefix = `/storage/v1/object/public/${PRODUCTS_BUCKET}/`
    const idx = parsed.pathname.indexOf(prefix)
    return idx >= 0 ? decodeURIComponent(parsed.pathname.slice(idx + prefix.length)) : null
  } catch {
    return null
  }
}
