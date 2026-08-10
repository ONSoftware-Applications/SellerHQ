import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { ReceiptContext } from '../hooks/useReceipts'
import type { Receipt, ReceiptDraft, ReceiptRow } from '../types/receipt'
import { deleteReceiptFile } from '../lib/storage'

function databaseToReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    businessId: row.business_id,
    filePath: row.file_path,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: Number(row.file_size ?? 0),
    mimeType: row.mime_type ?? '',
    uploadedAt: row.uploaded_at ?? '',
  }
}

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const { currentBusiness } = useBusiness()

  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  const refreshReceipts = useCallback(async () => {
    if (!currentBusiness) {
      setReceipts([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Failed to load receipts:', error)
      setReceipts([])
      setLoading(false)
      return
    }

    setReceipts((data ?? []).map(databaseToReceipt))
    setLoading(false)
  }, [currentBusiness])

  const addReceipt = useCallback(
    async (receipt: ReceiptDraft) => {
      if (!currentBusiness) {
        throw new Error('No business is currently selected.')
      }

      const { data, error } = await supabase
        .from('receipts')
        .insert({
          business_id: currentBusiness.id,
          file_path: receipt.filePath,
          file_url: receipt.fileUrl,
          file_name: receipt.fileName,
          file_size: receipt.fileSize,
          mime_type: receipt.mimeType || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to add receipt:', error)
        throw error
      }

      setReceipts((current) => [databaseToReceipt(data), ...current])
    },
    [currentBusiness],
  )

  const deleteReceipt = useCallback(
    async (id: string, filePath: string) => {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Failed to delete receipt:', error)
        throw error
      }

      void deleteReceiptFile(filePath)
      setReceipts((current) => current.filter((receipt) => receipt.id !== id))
    },
    [],
  )

  useEffect(() => {
    refreshReceipts()
  }, [refreshReceipts])

  const value = useMemo(
    () => ({
      receipts,
      loading,
      addReceipt,
      deleteReceipt,
      refreshReceipts,
    }),
    [receipts, loading, addReceipt, deleteReceipt, refreshReceipts],
  )

  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>
}
