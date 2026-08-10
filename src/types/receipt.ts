export type Receipt = {
  id: string
  businessId: string
  filePath: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}

export type ReceiptDraft = Omit<Receipt, 'id' | 'businessId'>

export type ReceiptRow = {
  id: string
  business_id: string
  file_path: string
  file_url: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string | null
}
