import { createContext, useContext } from 'react'
import type {
  Product,
  ProductDraft,
  ProductEvent,
  Relisting,
} from '../types/product'

export type ProductContextType = {
  products: Product[]
  loading: boolean
  addProduct: (product: ProductDraft) => Promise<void>
  updateProduct: (product: Product) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  refreshProducts: () => Promise<void>
  getProduct: (id: string) => Product | undefined
  logEvent: (
    productId: string,
    eventType: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) => Promise<void>
  fetchEvents: (productId: string) => Promise<ProductEvent[]>
  addRelisting: (
    productId: string,
    relisting: {
      marketplace?: string | null
      previousPrice?: number | null
      newPrice?: number | null
    },
  ) => Promise<void>
  fetchRelistings: (productId: string) => Promise<Relisting[]>
}

export const ProductContext = createContext<ProductContextType | undefined>(
  undefined,
)

export function useProducts() {
  const context = useContext(ProductContext)

  if (!context) {
    throw new Error('useProducts must be used inside ProductProvider')
  }

  return context
}
