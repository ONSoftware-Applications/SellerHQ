import type { Product, ProductDraft } from '../types/product'

export function generateProductCode(): string {
  return `PRD-${Math.floor(Math.random() * 9000) + 1000}`
}

export function createBlankProductDraft(): ProductDraft {
  const today = new Date().toISOString().split('T')[0]
  const code = generateProductCode()

  return {
    id: crypto.randomUUID(),
    code,
    sku: code,
    name: '',
    description: '',
    brand: '',
    category: '',
    size: '',
    colour: '',
    condition: 'Good',
    purchasePrice: 0,
    purchaseDate: today,
    purchaseSource: '',
    storageLocation: '',
    barcode: '',
    photos: [],
    labels: [],
    status: 'Unlisted',
    marketplaces: [],
    listingPrice: 0,
    listingDate: null,
    salePrice: null,
    saleDate: null,
    shippingDate: null,
    fees: 0,
    profit: 0,
    additionalCosts: 0,
    saleMarketplace: null,
    shippingCost: 0,
    platformFees: 0,
    otherFees: 0,
    refunded: false,
    refundAmount: 0,
    refundDate: null,
    refundNote: '',
    dateAdded: today,
    createdAt: today,
    updatedAt: today,
  }
}

export function createDuplicateProductDraft(
  product: Product,
): ProductDraft {
  const today = new Date().toISOString().split('T')[0]
  const code = generateProductCode()
  const draft = productToDraft(product)

  return {
    ...draft,
    id: crypto.randomUUID(),
    code,
    sku: code,
    name: draft.name ? `${draft.name} copy` : 'Copy of product',
    barcode: '',
    status: 'Unlisted',
    listingPrice: 0,
    listingDate: null,
    salePrice: null,
    saleDate: null,
    shippingDate: null,
    fees: 0,
    profit: 0,
    saleMarketplace: null,
    shippingCost: 0,
    platformFees: 0,
    otherFees: 0,
    refunded: draft.refunded,
    refundAmount: draft.refundAmount,
    refundDate: draft.refundDate,
    refundNote: draft.refundNote,
    updatedAt: today,
    createdAt: today,
    dateAdded: today,
  }
}

export function productToDraft(
  product: Product,
): ProductDraft {
  return {
    id: product.id,
    code: product.code,
    sku: product.sku,
    name: product.name,
    description: product.description,
    brand: product.brand,
    category: product.category,
    size: product.size,
    colour: product.colour,
    condition: product.condition,
    purchasePrice: product.purchasePrice,
    purchaseDate: product.purchaseDate,
    purchaseSource: product.purchaseSource,
    storageLocation: product.storageLocation,
    barcode: product.barcode,
    photos: product.photos,
    labels: product.labels || [],
    status: product.status,
    marketplaces: product.marketplaces,
    listingPrice: product.listingPrice,
    listingDate: product.listingDate,
    salePrice: product.salePrice,
    saleDate: product.saleDate,
    shippingDate: product.shippingDate,
    fees: product.fees,
    profit: product.profit,
    additionalCosts: product.additionalCosts,
    saleMarketplace: product.saleMarketplace,
    shippingCost: product.shippingCost,
    platformFees: product.platformFees,
    otherFees: product.otherFees,
    refunded: product.refunded,
    refundAmount: product.refundAmount,
    refundDate: product.refundDate,
    refundNote: product.refundNote,
    dateAdded: product.dateAdded,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}
