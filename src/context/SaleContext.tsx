import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useBusiness } from '../hooks/useBusiness'
import { SaleContext } from '../hooks/useSales'
import { useProducts } from '../hooks/useProducts'
import { supabase } from '../lib/supabase'
import type { Marketplace, Product } from '../types/product'
import type {
  RecordSaleInput,
  Sale,
  SaleRow,
  SaleStatus,
} from '../types/sale'

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

function databaseStatusToSaleStatus(value: string | null): SaleStatus {
  switch (value) {
    case 'awaiting_shipping':
      return 'Awaiting Shipping'
    case 'in_shipping':
      return 'In Shipping'
    case 'refunded':
      return 'Refunded'
    case 'voided':
      return 'Voided'
    case 'sold':
    default:
      return 'Sold'
  }
}

function saleStatusToDatabaseStatus(
  value: Exclude<SaleStatus, 'Refunded' | 'Voided'>,
) {
  switch (value) {
    case 'Awaiting Shipping':
      return 'awaiting_shipping'
    case 'In Shipping':
      return 'in_shipping'
    case 'Sold':
    default:
      return 'sold'
  }
}

function rowToSale(row: SaleRow): Sale {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    productCode: row.product_code ?? '',
    sku: row.sku ?? '',
    productName: row.product_name ?? '',
    brand: row.brand ?? '',
    category: row.category ?? '',
    quantity: Math.max(1, Number(row.quantity ?? 1)),
    unitSalePrice: numberValue(row.unit_sale_price),
    salePrice: numberValue(row.sale_price),
    unitPurchasePrice: numberValue(row.unit_purchase_price),
    costOfGoods: numberValue(row.cost_of_goods),
    additionalCosts: numberValue(row.additional_costs),
    shippingCost: numberValue(row.shipping_cost),
    platformFees: numberValue(row.platform_fees),
    otherFees: numberValue(row.other_fees),
    fees: numberValue(row.fees),
    profit: numberValue(row.profit),
    saleDate: row.sale_date ?? '',
    shippingDate: row.shipping_date,
    saleMarketplace: (row.sale_marketplace as Marketplace | null) ?? null,
    status: databaseStatusToSaleStatus(row.status),
    refunded: Boolean(row.refunded) || row.status === 'refunded',
    refundAmount: numberValue(row.refund_amount),
    refundDate: row.refund_date,
    refundNote: row.refund_note ?? '',
    source: row.source ?? 'manual',
    externalReference: row.external_reference,
    tillTransactionId: row.till_transaction_id,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

function legacySalesFromProducts(products: Product[]): Sale[] {
  return products
    .filter((product) => product.salePrice !== null)
    .map((product) => {
      const quantity = 1
      const costOfGoods =
        (product.purchasePrice + product.additionalCosts) * quantity
      const salePrice = product.salePrice ?? 0

      return {
        id: `legacy-${product.id}`,
        businessId: product.businessId,
        productId: product.id,
        productCode: product.code,
        sku: product.sku,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        quantity,
        unitSalePrice: salePrice,
        salePrice,
        unitPurchasePrice: product.purchasePrice,
        costOfGoods,
        additionalCosts: product.additionalCosts,
        shippingCost: product.shippingCost,
        platformFees: product.platformFees,
        otherFees: product.otherFees,
        fees: product.fees,
        profit: product.profit,
        saleDate: product.saleDate ?? product.updatedAt,
        shippingDate: product.shippingDate,
        saleMarketplace: product.saleMarketplace,
        status: product.refunded
          ? 'Refunded'
          : product.status === 'Awaiting Shipping'
            ? 'Awaiting Shipping'
            : product.status === 'In Shipping'
              ? 'In Shipping'
              : 'Sold',
        refunded: product.refunded,
        refundAmount: product.refundAmount,
        refundDate: product.refundDate,
        refundNote: product.refundNote,
        source: 'legacy',
        externalReference: null,
        tillTransactionId: null,
        createdAt: product.updatedAt,
        updatedAt: product.updatedAt,
      } satisfies Sale
    })
}

function isLedgerMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01'
    || error.code === '42883'
    || error.code === 'PGRST202'
    || error.code === 'PGRST205'
    || message.includes('product_sales')
    || message.includes('record_product_sale')
  )
}

export function SaleProvider({ children }: { children: ReactNode }) {
  const { currentBusiness } = useBusiness()
  const {
    products,
    updateProduct,
    refreshProducts,
  } = useProducts()

  const [storedSales, setStoredSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [ledgerAvailable, setLedgerAvailable] =
    useState<boolean | null>(null)

  const refreshSales = useCallback(async () => {
    if (!currentBusiness) {
      setStoredSales([])
      setLedgerAvailable(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('product_sales')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      if (!isLedgerMissing(error)) {
        console.error('Failed to load sales ledger:', error)
      }
      setLedgerAvailable(false)
      setStoredSales([])
    } else {
      setLedgerAvailable(true)
      setStoredSales(
        (data ?? []).map((row) => rowToSale(row as SaleRow)),
      )
    }

    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    void refreshSales()
  }, [refreshSales])

  const sales = useMemo(
    () =>
      ledgerAvailable === true
        ? storedSales
        : legacySalesFromProducts(products),
    [ledgerAvailable, products, storedSales],
  )

  const fallbackRecordSale = useCallback(async (input: RecordSaleInput) => {
    const quantity = Math.max(1, Math.floor(input.quantity ?? 1))
    if (input.product.quantity < quantity) {
      throw new Error(
        `Only ${input.product.quantity} unit(s) remain in stock.`,
      )
    }

    const remainingQuantity = input.product.quantity - quantity
    const fees =
      (input.shippingCost ?? 0)
      + (input.platformFees ?? 0)
      + (input.otherFees ?? 0)
    const profit =
      input.salePrice
      - ((input.product.purchasePrice + input.product.additionalCosts) * quantity)
      - fees

    await updateProduct({
      ...input.product,
      quantity: remainingQuantity,
      status: remainingQuantity > 0 ? input.product.status : input.status,
      salePrice: input.salePrice,
      saleDate: input.saleDate,
      shippingDate: input.shippingDate ?? null,
      saleMarketplace: input.saleMarketplace ?? null,
      shippingCost: input.shippingCost ?? 0,
      platformFees: input.platformFees ?? 0,
      otherFees: input.otherFees ?? 0,
      fees,
      profit,
      refunded: false,
      refundAmount: 0,
      refundDate: null,
      refundNote: '',
      updatedAt: new Date().toISOString(),
    })
  }, [updateProduct])

  const recordSale = useCallback(async (input: RecordSaleInput) => {
    const quantity = Math.max(1, Math.floor(input.quantity ?? 1))

    const { data, error } = await supabase.rpc(
      'record_product_sale',
      {
        p_product_id: input.product.id,
        p_quantity: quantity,
        p_sale_price: input.salePrice,
        p_sale_date: input.saleDate,
        p_sale_marketplace: input.saleMarketplace ?? null,
        p_shipping_cost: input.shippingCost ?? 0,
        p_platform_fees: input.platformFees ?? 0,
        p_other_fees: input.otherFees ?? 0,
        p_sale_status: saleStatusToDatabaseStatus(input.status),
        p_source: input.source ?? 'manual',
        p_external_reference: input.externalReference ?? null,
        p_till_transaction_id: input.tillTransactionId ?? null,
      },
    )

    if (error) {
      if (isLedgerMissing(error)) {
        setLedgerAvailable(false)
        await fallbackRecordSale(input)
        return null
      }

      console.error('Failed to record sale:', error)
      throw error
    }

    setLedgerAvailable(true)
    await Promise.all([refreshProducts(), refreshSales()])
    return typeof data === 'string' ? data : null
  }, [fallbackRecordSale, refreshProducts, refreshSales])

  const updateSaleStatus = useCallback(async (
    id: string,
    status: Exclude<SaleStatus, 'Refunded' | 'Voided'>,
    shippingDate?: string | null,
  ) => {
    if (ledgerAvailable !== true || id.startsWith('legacy-')) {
      const sale = sales.find((item) => item.id === id)
      const product = sale?.productId
        ? products.find((item) => item.id === sale.productId)
        : undefined
      if (!product) return

      await updateProduct({
        ...product,
        status,
        shippingDate:
          status === 'In Shipping'
            ? shippingDate ?? product.shippingDate ?? new Date().toISOString().split('T')[0]
            : product.shippingDate,
        updatedAt: new Date().toISOString(),
      })
      return
    }

    const patch: Record<string, unknown> = {
      status: saleStatusToDatabaseStatus(status),
      updated_at: new Date().toISOString(),
    }
    if (status === 'In Shipping') {
      patch.shipping_date =
        shippingDate ?? new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('product_sales')
      .update(patch)
      .eq('id', id)

    if (error) {
      console.error('Failed to update sale status:', error)
      throw error
    }

    const sale = sales.find((item) => item.id === id)
    const product = sale?.productId
      ? products.find((item) => item.id === sale.productId)
      : undefined
    if (product && product.quantity === 0) {
      await updateProduct({
        ...product,
        status,
        shippingDate:
          status === 'In Shipping'
            ? (patch.shipping_date as string)
            : product.shippingDate,
        updatedAt: new Date().toISOString(),
      })
    }

    await refreshSales()
  }, [
    ledgerAvailable,
    products,
    refreshSales,
    sales,
    updateProduct,
  ])

  const updateSaleDetails = useCallback(async (
    id: string,
    changes: {
      salePrice: number
      saleDate: string
      shippingDate?: string | null
      saleMarketplace?: string | null
      shippingCost: number
      platformFees: number
      otherFees: number
    },
  ) => {
    const sale = sales.find((item) => item.id === id)
    if (!sale) return

    const fees =
      changes.shippingCost
      + changes.platformFees
      + changes.otherFees
    const profit = changes.salePrice - sale.costOfGoods - fees

    if (ledgerAvailable !== true || id.startsWith('legacy-')) {
      const product = sale.productId
        ? products.find((item) => item.id === sale.productId)
        : undefined
      if (!product) return

      await updateProduct({
        ...product,
        salePrice: changes.salePrice,
        saleDate: changes.saleDate,
        shippingDate: changes.shippingDate ?? null,
        saleMarketplace:
          (changes.saleMarketplace as Marketplace | null) ?? null,
        shippingCost: changes.shippingCost,
        platformFees: changes.platformFees,
        otherFees: changes.otherFees,
        fees,
        profit,
        updatedAt: new Date().toISOString(),
      })
      return
    }

    const { error } = await supabase
      .from('product_sales')
      .update({
        sale_price: changes.salePrice,
        unit_sale_price:
          sale.quantity > 0
            ? changes.salePrice / sale.quantity
            : changes.salePrice,
        sale_date: changes.saleDate,
        shipping_date: changes.shippingDate ?? null,
        sale_marketplace: changes.saleMarketplace ?? null,
        shipping_cost: changes.shippingCost,
        platform_fees: changes.platformFees,
        other_fees: changes.otherFees,
        fees,
        profit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Failed to update sale details:', error)
      throw error
    }

    const product = sale.productId
      ? products.find((item) => item.id === sale.productId)
      : undefined
    if (product) {
      await updateProduct({
        ...product,
        salePrice: changes.salePrice,
        saleDate: changes.saleDate,
        shippingDate: changes.shippingDate ?? null,
        saleMarketplace:
          (changes.saleMarketplace as Marketplace | null) ?? null,
        shippingCost: changes.shippingCost,
        platformFees: changes.platformFees,
        otherFees: changes.otherFees,
        fees,
        profit,
        updatedAt: new Date().toISOString(),
      })
    }

    await refreshSales()
  }, [ledgerAvailable, products, refreshSales, sales, updateProduct])

  const refundSale = useCallback(async (
    id: string,
    amount: number,
    note = '',
  ) => {
    const sale = sales.find((item) => item.id === id)
    if (!sale) return

    if (ledgerAvailable !== true || id.startsWith('legacy-')) {
      const product = sale.productId
        ? products.find((item) => item.id === sale.productId)
        : undefined
      if (!product) return

      await updateProduct({
        ...product,
        refunded: true,
        refundAmount: amount,
        refundDate: new Date().toISOString().split('T')[0],
        refundNote: note,
        updatedAt: new Date().toISOString(),
      })
      return
    }

    const refundDate = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('product_sales')
      .update({
        status: 'refunded',
        refunded: true,
        refund_amount: amount,
        refund_date: refundDate,
        refund_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Failed to refund sale:', error)
      throw error
    }

    const product = sale.productId
      ? products.find((item) => item.id === sale.productId)
      : undefined
    if (product && product.quantity === 0) {
      await updateProduct({
        ...product,
        refunded: true,
        refundAmount: amount,
        refundDate,
        refundNote: note,
        updatedAt: new Date().toISOString(),
      })
    }

    await refreshSales()
  }, [ledgerAvailable, products, refreshSales, sales, updateProduct])

  const voidSale = useCallback(async (id: string) => {
    if (ledgerAvailable !== true || id.startsWith('legacy-')) {
      const sale = sales.find((item) => item.id === id)
      const product = sale?.productId
        ? products.find((item) => item.id === sale.productId)
        : undefined
      if (!sale || !product) return

      await updateProduct({
        ...product,
        quantity: product.quantity + sale.quantity,
        status:
          product.quantity === 0
            ? 'Unlisted'
            : product.status,
        updatedAt: new Date().toISOString(),
      })
      return
    }

    const { error } = await supabase.rpc(
      'void_product_sale',
      { p_sale_id: id },
    )

    if (error) {
      console.error('Failed to void sale:', error)
      throw error
    }

    await Promise.all([refreshProducts(), refreshSales()])
  }, [
    ledgerAvailable,
    products,
    refreshProducts,
    refreshSales,
    sales,
    updateProduct,
  ])

  const value = useMemo(
    () => ({
      sales,
      loading,
      ledgerAvailable,
      refreshSales,
      recordSale,
      updateSaleStatus,
      updateSaleDetails,
      refundSale,
      voidSale,
    }),
    [
      sales,
      loading,
      ledgerAvailable,
      refreshSales,
      recordSale,
      updateSaleStatus,
      updateSaleDetails,
      refundSale,
      voidSale,
    ],
  )

  return (
    <SaleContext.Provider value={value}>
      {children}
    </SaleContext.Provider>
  )
}
