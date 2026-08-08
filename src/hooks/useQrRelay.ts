import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'

export function useQrRelay() {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)

  const stop = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    setListening(false)
  }, [])

  const listen = useCallback(
    (
      businessId: string,
      onScan: (payload: string) => void,
    ) => {
      if (!businessId) return

      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }

      const channel = supabase
        .channel(`qr-relay:${businessId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'qr_relay_scans',
            filter: `business_id=eq.${businessId}`,
          },
          (payload) => {
            const row = payload.new as { payload?: string } | null
            if (row?.payload) onScan(row.payload)
          },
        )
        .subscribe((status) => {
          setListening(status === 'SUBSCRIBED')
          if (status === 'CHANNEL_ERROR') {
            setError(
              'Realtime connection failed. Check your network and try again.',
            )
          }
        })

      channelRef.current = channel
    },
    [],
  )

  const send = useCallback(
    async (payload: string, businessId: string): Promise<boolean> => {
      if (!businessId) return false

      const { error: insertError } = await supabase
        .from('qr_relay_scans')
        .insert({ business_id: businessId, payload })

      if (insertError) {
        setError(insertError.message)
        return false
      }

      setError('')
      return true
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [])

  return { listening, error, listen, send, stop }
}