import type {
  ProductCondition,
  ProductDraft,
  ProductStatus,
  Marketplace,
} from '../types/product'
import {
  createBlankProductDraft,
  productToDraft,
} from './productDraft'

export type InventoryImportRow = {
  rowNumber: number
  draft: ProductDraft
  existingProduct: { id: string; code: string; businessId: string } | null
  warnings: string[]
}

export type InventoryImportPreview = {
  fileName: string
  rows: InventoryImportRow[]
  warnings: string[]
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentValue)
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += character
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue)
    if (currentRow.some((value) => value.trim().length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

export function normalizeCsvHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function getCsvField(
  rowMap: Map<string, string>,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const value = rowMap.get(normalizeCsvHeader(alias))
    if (value !== undefined && value.trim().length > 0) {
      return value
    }
  }

  return ''
}

export function parseNumber(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null
  }

  return parseNumber(value)
}

export function parseDate(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseProductStatus(value: string): ProductStatus {
  const normalized = normalizeCsvHeader(value)

  switch (normalized) {
    case 'listed':
      return 'Listed'
    case 'awaitingshipping':
      return 'Awaiting Shipping'
    case 'inshipping':
      return 'In Shipping'
    case 'sold':
      return 'Sold'
    case 'reserved':
      return 'Reserved'
    case 'relistingrequired':
    case 'relistingneeded':
      return 'Relisting Required'
    case 'removed':
      return 'Removed'
    case 'returned':
      return 'Returned'
    case 'archived':
      return 'Archived'
    case 'draft':
      return 'Draft'
    case 'unlisted':
    case 'notlisted':
    default:
      return 'Unlisted'
  }
}

export function parseProductCondition(value: string): ProductCondition {
  const normalized = value.trim().toLowerCase()

  switch (normalized) {
    case 'new':
      return 'New'
    case 'new with tags':
      return 'New with tags'
    case 'very good':
      return 'Very good'
    case 'satisfactory':
      return 'Satisfactory'
    case 'for parts / not working':
      return 'For parts / not working'
    case 'good':
    default:
      return 'Good'
  }
}

export function parseMarketplace(value: string): Marketplace | null {
  const normalized = value.trim().toLowerCase()

  switch (normalized) {
    case 'ebay':
      return 'eBay'
    case 'vinted':
      return 'Vinted'
    case 'etsy':
      return 'Etsy'
    case 'depop':
      return 'Depop'
    default:
      return null
  }
}

export function parseMarketplaces(value: string): Marketplace[] {
  return splitList(value)
    .map((item) => parseMarketplace(item))
    .filter((item): item is Marketplace => item !== null)
}

export function splitList(value: string): string[] {
  return value
    .split(/[;\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function calculateImportProfit({
  salePrice,
  purchasePrice,
  additionalCosts,
  fees,
}: {
  salePrice: number | null
  purchasePrice: number
  additionalCosts: number
  fees: number
}): number {
  if (salePrice === null) {
    return 0
  }

  return salePrice - purchasePrice - additionalCosts - fees
}

export function buildProductDraftFromCsv(
  base: ProductDraft,
  rowMap: Map<string, string>,
  rowNumber: number,
  warnings: string[],
): ProductDraft {
  const code = getCsvField(rowMap, [
    'productid',
    'code',
    'productreference',
    'id',
  ]).trim()

  const sku = getCsvField(rowMap, ['sku']).trim()
  const name = getCsvField(rowMap, ['name', 'productname', 'title']).trim()
  const description = getCsvField(rowMap, ['description', 'notes'])
  const brand = getCsvField(rowMap, ['brand']).trim()
  const category = getCsvField(rowMap, ['category']).trim()
  const size = getCsvField(rowMap, ['size']).trim()
  const colour = getCsvField(rowMap, ['colour', 'color']).trim()
  const condition = parseProductCondition(
    getCsvField(rowMap, ['condition']),
  )
  const purchasePrice = parseNumber(
    getCsvField(rowMap, ['purchaseprice', 'purchase_price']),
  )
  const quantity = Math.max(
    1,
    Math.round(
      parseNumber(getCsvField(rowMap, ['quantity', 'qty', 'stock'])),
    ) || 1,
  )
  const reorderLevel = Math.max(
    0,
    Math.round(
      parseNumber(getCsvField(rowMap, ['reorderlevel', 'reorder_level', 'lowstock'])),
    ) || 0,
  )
  const purchaseDate = parseDate(
    getCsvField(rowMap, ['purchasedate', 'purchase_date']),
  )
  const purchaseSource = getCsvField(rowMap, [
    'purchasesource',
    'source',
  ]).trim()
  const storageLocation = getCsvField(rowMap, [
    'storagelocation',
    'location',
  ]).trim()
  const barcode = getCsvField(rowMap, ['barcode', 'qrbarcode', 'ean', 'upc']).trim()
  const photos = splitList(
    getCsvField(rowMap, ['photos', 'image', 'images']),
  )
  const labels = splitList(
    getCsvField(rowMap, ['labels', 'tags']),
  )
  const status = parseProductStatus(
    getCsvField(rowMap, ['status']),
  )
  const marketplaces = parseMarketplaces(
    getCsvField(rowMap, ['marketplaces', 'listings']),
  )
  const listingPrice = parseNumber(
    getCsvField(rowMap, ['listingprice', 'listing_price']),
  )
  const listingDate = parseDate(
    getCsvField(rowMap, ['listingdate', 'listing_date']),
  )
  const salePrice = parseOptionalNumber(
    getCsvField(rowMap, ['saleprice', 'sale_price']),
  )
  const saleDate = parseDate(
    getCsvField(rowMap, ['saledate', 'sale_date']),
  )
  const shippingDate = parseDate(
    getCsvField(rowMap, ['shippingdate', 'shipping_date']),
  )
  const fees = parseNumber(
    getCsvField(rowMap, ['fees']),
  )
  const additionalCosts = parseNumber(
    getCsvField(rowMap, ['additionalcosts', 'additional_costs']),
  )
  const saleMarketplace = parseMarketplace(
    getCsvField(rowMap, ['salemarketplace', 'sale_marketplace']),
  )
  const shippingCost = parseNumber(
    getCsvField(rowMap, ['shippingcost', 'shipping_cost', 'postagecosts']),
  )
  const platformFees = parseNumber(
    getCsvField(rowMap, ['platformfees', 'platform_fees']),
  )
  const otherFees = parseNumber(
    getCsvField(rowMap, ['otherfees', 'other_fees']),
  )
  const dateAdded = parseDate(
    getCsvField(rowMap, ['dateadded', 'date_added']),
  )
  const createdAt = parseDate(
    getCsvField(rowMap, ['createdat', 'created_at']),
  )
  const updatedAt = parseDate(
    getCsvField(rowMap, ['updatedat', 'updated_at']),
  )

  if (!code) {
    warnings.push(
      `Row ${rowNumber} is missing a Product ID and will use the existing code or generated fallback.`,
    )
  }

  const resolvedCode = code || base.code
  const resolvedSku = sku || resolvedCode
  const resolvedName = name || base.name || 'New product'
  const resolvedDateAdded =
    dateAdded || base.dateAdded || todayIsoDate()
  const resolvedCreatedAt =
    createdAt || base.createdAt || new Date().toISOString()
  const resolvedUpdatedAt =
    updatedAt || base.updatedAt || new Date().toISOString()
  const resolvedProfit = calculateImportProfit({
    salePrice,
    purchasePrice,
    additionalCosts,
    fees,
  })

  return {
    ...base,
    code: resolvedCode,
    sku: resolvedSku,
    name: resolvedName,
    description: description || base.description,
    brand: brand || base.brand,
    category: category || base.category || 'Uncategorised',
    size: size || base.size,
    colour: colour || base.colour,
    condition,
    purchasePrice,
    purchaseDate,
    purchaseSource: purchaseSource || base.purchaseSource,
    quantity,
    reorderLevel,
    storageLocation: storageLocation || base.storageLocation,
    barcode: barcode || base.barcode,
    photos,
    labels,
    status,
    marketplaces,
    listingPrice,
    listingDate,
    salePrice,
    saleDate,
    shippingDate,
    fees,
    profit: resolvedProfit,
    additionalCosts,
    saleMarketplace,
    shippingCost,
    platformFees,
    otherFees,
    dateAdded: resolvedDateAdded,
    createdAt: resolvedCreatedAt,
    updatedAt: resolvedUpdatedAt,
  }
}

export function parseInventoryImportCsv(
  text: string,
  existingProducts: { id: string; code: string; businessId: string }[],
): InventoryImportPreview {
  const parsedRows = parseCsv(text)
  const warnings: string[] = []

  if (parsedRows.length === 0) {
    return {
      fileName: '',
      rows: [],
      warnings: ['The file is empty.'],
    }
  }

  const [headerRow, ...dataRows] = parsedRows
  const headers = headerRow.map(normalizeCsvHeader)
  const rows = new Map<string, InventoryImportRow>()
  const productsByCode = new Map(
    existingProducts.map((product) => [
      product.code.trim().toLowerCase(),
      product,
    ]),
  )

  for (let index = 0; index < dataRows.length; index += 1) {
    const rowValues = dataRows[index]
    const rowNumber = index + 2
    const rowMap = new Map<string, string>()

    headers.forEach((header, headerIndex) => {
      rowMap.set(header, rowValues[headerIndex] ?? '')
    })

    if (
      rowValues.every((value) => value.trim().length === 0)
    ) {
      continue
    }

    const code = getCsvField(rowMap, [
      'productid',
      'code',
      'productreference',
      'id',
    ]).trim()

    const name = getCsvField(rowMap, [
      'name',
      'productname',
      'title',
    ]).trim()

    if (!code && !name) {
      warnings.push(`Row ${rowNumber} is missing a product ID and name.`)
      continue
    }

    const existingProduct =
      productsByCode.get(code.toLowerCase()) ?? null

    const baseDraft = existingProduct
      ? productToDraft(existingProduct as any)
      : createBlankProductDraft()

    const draft = buildProductDraftFromCsv(
      baseDraft,
      rowMap,
      rowNumber,
      warnings,
    )

    if (rows.has(draft.code)) {
      warnings.push(
        `Row ${rowNumber} duplicates product ID ${draft.code}; the later row will win.`,
      )
    }

    rows.set(draft.code, {
      rowNumber,
      draft,
      existingProduct,
      warnings: [],
    })
  }

  return {
    fileName: '',
    rows: [...rows.values()],
    warnings,
  }
}
