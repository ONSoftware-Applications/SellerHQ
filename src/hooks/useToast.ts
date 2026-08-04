import { createContext, useContext } from 'react'
import type { Toast, ToastType } from '../context/ToastContext'

export type ToastContextType = {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
)

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider')
  }

  return context
}
