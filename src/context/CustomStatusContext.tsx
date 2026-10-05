import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import {
  CustomStatusContext,
} from '../hooks/useCustomStatuses'
import {
  SYSTEM_PRODUCT_STATUSES,
  customStatusDatabaseValue,
} from '../lib/productStatus'
import type {
  CustomProductStatus,
  CustomProductStatusRow,
  CustomStatusColour,
} from '../types/customStatus'

function rowToStatus(row: CustomProductStatusRow): CustomProductStatus {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    colour: row.colour as CustomStatusColour,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

function validateName(name: string, statuses: CustomProductStatus[], ignoreId?: string) {
  const trimmed = name.trim()

  if (!trimmed) {
    throw new Error('Status name cannot be empty.')
  }

  if (trimmed.length > 40) {
    throw new Error('Status names can be up to 40 characters.')
  }

  if (
    SYSTEM_PRODUCT_STATUSES.some(
      (status) => status.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error('That name is already used by a SellerHQ system status.')
  }

  if (
    statuses.some(
      (status) =>
        status.id !== ignoreId
        && status.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error('A custom status with that name already exists.')
  }

  return trimmed
}

export function CustomStatusProvider({ children }: { children: ReactNode }) {
  const { currentBusiness } = useBusiness()
  const [statuses, setStatuses] = useState<CustomProductStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refreshStatuses = useCallback(async () => {
    if (!currentBusiness) {
      setStatuses([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('custom_product_statuses')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load custom product statuses:', error)
      setStatuses([])
    } else {
      setStatuses((data ?? []).map((row) =>
        rowToStatus(row as CustomProductStatusRow),
      ))
    }

    setLoading(false)
  }, [currentBusiness])

  const createStatus = useCallback(async (
    name: string,
    colour: CustomStatusColour,
  ) => {
    if (!currentBusiness) {
      throw new Error('No business is currently selected.')
    }

    const trimmed = validateName(name, statuses)
    const sortOrder =
      statuses.reduce((highest, status) => Math.max(highest, status.sortOrder), -1) + 1

    const { data, error } = await supabase
      .from('custom_product_statuses')
      .insert({
        business_id: currentBusiness.id,
        name: trimmed,
        colour,
        sort_order: sortOrder,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Failed to create custom product status:', error)
      throw error
    }

    const created = rowToStatus(data as CustomProductStatusRow)
    setStatuses((current) => [...current, created])
    return created
  }, [currentBusiness, statuses])

  const updateStatus = useCallback(async (
    id: string,
    changes: { name: string; colour: CustomStatusColour },
  ) => {
    if (!currentBusiness) {
      throw new Error('No business is currently selected.')
    }

    const trimmed = validateName(changes.name, statuses, id)
    const updatedAt = new Date().toISOString()

    const { error } = await supabase
      .from('custom_product_statuses')
      .update({
        name: trimmed,
        colour: changes.colour,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .eq('business_id', currentBusiness.id)

    if (error) {
      console.error('Failed to update custom product status:', error)
      throw error
    }

    setStatuses((current) =>
      current.map((status) =>
        status.id === id
          ? { ...status, name: trimmed, colour: changes.colour, updatedAt }
          : status,
      ),
    )
  }, [currentBusiness, statuses])

  const deleteStatus = useCallback(async (id: string) => {
    if (!currentBusiness) {
      throw new Error('No business is currently selected.')
    }

    const databaseValue = customStatusDatabaseValue(id)

    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', currentBusiness.id)
      .eq('status', databaseValue)

    if (countError) {
      console.error('Failed to count products using custom status:', countError)
      throw countError
    }

    const affected = count ?? 0

    if (affected > 0) {
      const { error: resetError } = await supabase
        .from('products')
        .update({ status: 'unlisted' })
        .eq('business_id', currentBusiness.id)
        .eq('status', databaseValue)

      if (resetError) {
        console.error('Failed to reset products using custom status:', resetError)
        throw resetError
      }
    }

    const { error } = await supabase
      .from('custom_product_statuses')
      .delete()
      .eq('id', id)
      .eq('business_id', currentBusiness.id)

    if (error) {
      console.error('Failed to delete custom product status:', error)
      throw error
    }

    setStatuses((current) => current.filter((status) => status.id !== id))
    return affected
  }, [currentBusiness])

  useEffect(() => {
    void refreshStatuses()
  }, [refreshStatuses])

  const value = useMemo(() => ({
    statuses,
    loading,
    refreshStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
  }), [
    statuses,
    loading,
    refreshStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
  ])

  return (
    <CustomStatusContext.Provider value={value}>
      {children}
    </CustomStatusContext.Provider>
  )
}
