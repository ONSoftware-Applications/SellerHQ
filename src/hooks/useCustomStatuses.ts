import { createContext, useContext } from 'react'
import type {
  CustomProductStatus,
  CustomStatusColour,
} from '../types/customStatus'

export type CustomStatusContextValue = {
  statuses: CustomProductStatus[]
  loading: boolean
  refreshStatuses: () => Promise<void>
  createStatus: (
    name: string,
    colour: CustomStatusColour,
  ) => Promise<CustomProductStatus>
  updateStatus: (
    id: string,
    changes: { name: string; colour: CustomStatusColour },
  ) => Promise<void>
  deleteStatus: (id: string) => Promise<number>
}

export const CustomStatusContext = createContext<
  CustomStatusContextValue | undefined
>(undefined)

export function useCustomStatuses() {
  const context = useContext(CustomStatusContext)

  if (!context) {
    throw new Error(
      'useCustomStatuses must be used inside a CustomStatusProvider',
    )
  }

  return context
}
