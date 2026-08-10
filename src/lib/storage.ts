import { supabase } from '../lib/supabase'
import { compressImage } from './compressImage'

export const PRODUCTS_BUCKET = 'products'
export const RECEIPTS_BUCKET = 'receipts'

export type UploadedReceipt = {
  filePath: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
}

export async function uploadReceipt(file: File): Promise<UploadedReceipt | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const prepared = await compressImage(file)
  const ext = prepared.type ? prepared.type.split('/').pop() || 'png' : 'png'
  const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)
  const path = `${user.id}/${Date.now()}-${base}.${ext}`

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, prepared, { upsert: false })

  if (error) {
    console.error('Failed to upload receipt:', error)
    return null
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path)

  return {
    filePath: path,
    fileUrl: publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: prepared.type,
  }
}

export async function deleteReceiptFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).remove([path])
  if (error) console.error('Failed to delete receipt file:', error)
}

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
