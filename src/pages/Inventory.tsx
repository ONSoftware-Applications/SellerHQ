import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProducts } from '../hooks/useProducts'
import { useBusiness } from '../hooks/useBusiness'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '../hooks/useToast'
import { useSettings } from '../hooks/useSettings'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FilterBar } from '../components/FilterBar'
import type {
  Product,
  ProductCondition,
  ProductDraft,
  Marketplace,
  ProductStatus,
} from '../types/product'
import {
  ProductEditorModal,
} from '../components/ProductEditorModal'
import {
  createBlankProductDraft,
  createDuplicateProductDraft,
  productToDraft,
} from '../lib/productDraft'
import { generateQrDataUrl, getProductQrValue } from '../lib/qr'
import { escapeHtml } from '../lib/sanitize'
import {
  parseInventoryImportCsv,
  todayIsoDate,
} from '../lib/csv'
import type {
  InventoryImportPreview,
} from '../lib/csv'

type SortKey =
  | 'createdAt'
  | 'code'
  | 'name'
  | 'status'
  | 'purchaseDate'
  | 'storageLocation'
  | 'purchasePrice'
  | 'listingPrice'
  | 'profit'

type MarketplaceFilter = Marketplace | 'All'

type DraftEditorState = {
  title: string
  description: string
  submitLabel: string
  initialProduct: ProductDraft
}

const statusOrder: ProductStatus[] = [
  'Unlisted',
  'Draft',
  'Listed',
  'Awaiting Shipping',
  'In Shipping',
  'Sold',
  'Reserved',
  'Relisting Required',
  'Removed',
  'Returned',
  'Archived',
]

const sortLabels: Record<SortKey, string> = {
  createdAt: 'Newest first',
  code: 'Product ID',
  name: 'Name',
  status: 'Status',
  purchaseDate: 'Purchase date',
  storageLocation: 'Storage',
  purchasePrice: 'Purchase price',
  listingPrice: 'Listing price',
  profit: 'Profit',
}

const marketplaceFilters: MarketplaceFilter[] = [
  'All',
  'eBay',
  'Vinted',
  'Etsy',
  'Depop',
]

const conditionFilters: Array<ProductCondition | 'All'> = [
  'All',
  'New',
  'New with tags',
  'Very good',
  'Good',
  'Satisfactory',
  'For parts / not working',
]

function Inventory() {
  const navigate = useNavigate()
  const { currentBusiness } = useBusiness()
  const { money } = useCurrency()
  const { showToast } = useToast()
  const { settings } = useSettings()

  const shippingFlowEnabled = settings.features.shippingFlowEnabled

  const {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProducts()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<ProductStatus | 'All'>('All')
  const [marketplaceFilter, setMarketplaceFilter] =
    useState<MarketplaceFilter>('All')
  const [conditionFilter, setConditionFilter] =
    useState<ProductCondition | 'All'>('All')
  const [sortKey, setSortKey] =
    useState<SortKey>('createdAt')
  const [sortDirection, setSortDirection] =
    useState<'asc' | 'desc'>('desc')
  const [selectedProductIds, setSelectedProductIds] =
    useState<string[]>([])
  const [draftEditor, setDraftEditor] =
    useState<DraftEditorState | null>(() => {
      try {
        const saved = localStorage.getItem('sellerhq_draft_editor')
        if (saved) {
          return JSON.parse(saved) as DraftEditorState
        }
      } catch { /* ignore */ }
      return null
    })
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null)
  const [importPreview, setImportPreview] =
    useState<InventoryImportPreview | null>(null)
  const [importingInventory, setImportingInventory] =
    useState(false)
  const [actionError, setActionError] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [preferencesLoaded, setPreferencesLoaded] =
    useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [storageLocationPrompt, setStorageLocationPrompt] = useState(false)
  const [storageLocationValue, setStorageLocationValue] = useState('')
  const importFileInputRef = useRef<HTMLInputElement | null>(
    null,
  )

  const inventoryPreferencesKey = currentBusiness
    ? `sellerhq_inventory_preferences_${currentBusiness.id}`
    : ''

  useEffect(() => {
    setSelectedProductIds([])

    if (!currentBusiness) {
      setPreferencesLoaded(false)
      return
    }

    setPreferencesLoaded(false)

    try {
      const saved = localStorage.getItem(
        inventoryPreferencesKey,
      )

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<{
          search: string
          statusFilter: ProductStatus | 'All'
          marketplaceFilter: MarketplaceFilter
          conditionFilter: ProductCondition | 'All'
          sortKey: SortKey
          sortDirection: 'asc' | 'desc'
        }>

        if (typeof parsed.search === 'string') {
          setSearch(parsed.search)
        }

if (
          parsed.statusFilter === 'All' ||
          (typeof parsed.statusFilter === 'string' &&
            statusOrder.includes(parsed.statusFilter as ProductStatus))
        ) {
          setStatusFilter(parsed.statusFilter as ProductStatus | 'All')
        }

        if (
          parsed.marketplaceFilter === 'All' ||
          parsed.marketplaceFilter === 'eBay' ||
          parsed.marketplaceFilter === 'Vinted' ||
          parsed.marketplaceFilter === 'Etsy' ||
          parsed.marketplaceFilter === 'Depop'
        ) {
          setMarketplaceFilter(parsed.marketplaceFilter)
        }

        if (
          parsed.conditionFilter === 'All' ||
          parsed.conditionFilter === 'New' ||
          parsed.conditionFilter === 'New with tags' ||
          parsed.conditionFilter === 'Very good' ||
          parsed.conditionFilter === 'Good' ||
          parsed.conditionFilter === 'Satisfactory' ||
          parsed.conditionFilter === 'For parts / not working'
        ) {
          setConditionFilter(parsed.conditionFilter)
        }

        if (parsed.sortKey) {
          setSortKey(parsed.sortKey)
        }

        if (
          parsed.sortDirection === 'asc' ||
          parsed.sortDirection === 'desc'
        ) {
          setSortDirection(parsed.sortDirection)
        }
      }
    } catch (error) {
      console.error(
        'Failed to load inventory preferences:',
        error,
      )
    } finally {
      setPreferencesLoaded(true)
    }
  }, [currentBusiness, inventoryPreferencesKey])

  useEffect(() => {
    if (!currentBusiness || !preferencesLoaded) {
      return
    }

    localStorage.setItem(
      inventoryPreferencesKey,
      JSON.stringify({
        search,
        statusFilter,
        marketplaceFilter,
        conditionFilter,
        sortKey,
        sortDirection,
      }),
    )
  }, [
    currentBusiness,
    inventoryPreferencesKey,
    preferencesLoaded,
    search,
    statusFilter,
    marketplaceFilter,
    conditionFilter,
    sortKey,
    sortDirection,
  ])

  useEffect(() => {
    if (draftEditor) {
      localStorage.setItem('sellerhq_draft_editor', JSON.stringify(draftEditor))
    } else {
      localStorage.removeItem('sellerhq_draft_editor')
    }
  }, [draftEditor])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, marketplaceFilter, conditionFilter])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter((product) => {
      const searchMatch =
        query.length === 0 ||
        [
          product.code,
          product.sku,
          product.name,
          product.brand,
          product.category,
          product.storageLocation,
          product.barcode,
          Array.isArray(product.marketplaces)
            ? (product.marketplaces as string[]).join(' ')
            : String(product.marketplaces),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      const statusMatch =
        statusFilter === 'All' ||
        product.status === statusFilter

      const marketplaceMatch =
        marketplaceFilter === 'All' ||
        product.marketplaces.includes(marketplaceFilter)

      const conditionMatch =
        conditionFilter === 'All' ||
        product.condition === conditionFilter

      return (
        searchMatch &&
        statusMatch &&
        marketplaceMatch &&
        conditionMatch
      )
    })
  }, [products, search, statusFilter, marketplaceFilter, conditionFilter])

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts].sort((left, right) => {
      let comparison = 0

      switch (sortKey) {
        case 'code':
          comparison = left.code.localeCompare(right.code)
          break
        case 'name':
          comparison = left.name.localeCompare(right.name)
          break
        case 'status':
          comparison =
            statusOrder.indexOf(left.status) -
            statusOrder.indexOf(right.status)
          break
        case 'purchaseDate':
          comparison = dateValue(left.purchaseDate) - dateValue(right.purchaseDate)
          break
        case 'storageLocation':
          comparison = left.storageLocation.localeCompare(
            right.storageLocation,
          )
          break
        case 'purchasePrice':
          comparison =
            left.purchasePrice - right.purchasePrice
          break
        case 'listingPrice':
          comparison =
            left.listingPrice - right.listingPrice
          break
        case 'profit':
          comparison = left.profit - right.profit
          break
        case 'createdAt':
        default:
          comparison =
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime()
          break
      }

      if (sortDirection === 'desc') {
        comparison *= -1
      }

      return comparison
    })

    return sorted
  }, [filteredProducts, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize))

  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return sortedProducts.slice(start, start + pageSize)
  }, [sortedProducts, safeCurrentPage, pageSize])

  const showingStart =
    sortedProducts.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1
  const showingEnd = Math.min(safeCurrentPage * pageSize, sortedProducts.length)

  function dateValue(value: string | null) {
    return value ? new Date(value).getTime() : 0
  }

  const selectedProducts = useMemo(
    () =>
      products.filter((product) =>
        selectedProductIds.includes(product.id),
      ),
[products, selectedProductIds],
  )

  const visibleSelectionCount = useMemo(
    () =>
      paginatedProducts.filter((product) =>
        selectedProductIds.includes(product.id),
      ).length,
    [paginatedProducts, selectedProductIds],
  )

  const allVisibleSelected =
    paginatedProducts.length > 0 &&
    visibleSelectionCount === paginatedProducts.length

  const someVisibleSelected =
    visibleSelectionCount > 0 && !allVisibleSelected

  const inventoryValue = useMemo(
    () =>
      products.reduce(
        (total, product) =>
          total +
          product.purchasePrice +
          product.additionalCosts,
        0,
      ),
    [products],
  )

  const listedCount = useMemo(
    () =>
      products.filter(
        (product) => product.status === 'Listed',
      ).length,
    [products],
  )

  const awaitingShippingCount = useMemo(
    () =>
      products.filter(
        (product) =>
          product.status === 'Awaiting Shipping',
      ).length,
    [products],
  )

  const inShippingCount = useMemo(
    () =>
      products.filter(
        (product) => product.status === 'In Shipping',
      ).length,
    [products],
  )

  const soldCount = useMemo(
    () =>
      products.filter(
        (product) => product.status === 'Sold',
      ).length,
    [products],
  )

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== 'All' ||
    marketplaceFilter !== 'All' ||
    conditionFilter !== 'All'

  const exportableProducts = sortedProducts

  function openCreateProduct() {
    setActionError('')
    setDraftEditor({
      title: 'Add product',
      description: 'Create a new inventory item.',
      submitLabel: 'Add product',
      initialProduct: createBlankProductDraft(),
    })
  }

  function openDuplicateProduct(product: Product) {
    setActionError('')
    setDraftEditor({
      title: 'Duplicate product',
      description:
        'Create a new product from the details already stored here.',
      submitLabel: 'Create duplicate',
      initialProduct: createDuplicateProductDraft(product),
    })
  }

  function openImportPicker() {
    setActionError('')
    importFileInputRef.current?.click()
  }

  async function handleImportFileSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const preview = parseInventoryImportCsv(text, products)

      if (preview.rows.length === 0) {
        setActionError(
          'The CSV file did not contain any importable products.',
        )
        return
      }

      setImportPreview({
        ...preview,
        fileName: file.name,
      })
    } catch (error) {
      console.error(error)
      setActionError(
        'The CSV file could not be read. Please make sure it is a valid export.',
      )
    }
  }

  function toggleSelected(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  function toggleVisibleSelection(checked: boolean) {
    if (checked) {
      setSelectedProductIds(
        paginatedProducts.map((product) => product.id),
      )
      return
    }

    setSelectedProductIds((current) =>
      current.filter(
        (id) =>
          !paginatedProducts.some(
            (product) => product.id === id,
          ),
      ),
    )
  }

  function clearSelection() {
    setSelectedProductIds([])
  }

  async function handleCreateProduct(product: ProductDraft) {
    setActionError('')

    try {
      await addProduct(product)
      setDraftEditor(null)
    } catch (error) {
      console.error(error)
      setActionError(
        'The product could not be added. Please try again.',
      )
    }
  }

  async function handleCommitImport() {
    if (!importPreview || importingInventory) {
      return
    }

    setImportingInventory(true)
    setActionError('')

    try {
      for (const row of importPreview.rows) {
        if (row.existingProduct) {
          await updateProduct({
            ...row.draft,
            businessId: row.existingProduct.businessId,
          })
        } else {
          await addProduct(row.draft)
        }
      }

      setImportPreview(null)
      clearSelection()
    } catch (error) {
      console.error(error)
      setActionError(
        'One or more products could not be imported. Please check the CSV and try again.',
      )
    } finally {
      setImportingInventory(false)
    }
  }

  function exportProductsToCsv(productsToExport: Product[]) {
    const headers = [
      'Product ID',
      'SKU',
      'Name',
      'Brand',
      'Category',
      'Size',
      'Colour',
      'Condition',
      'Purchase Price',
      'Purchase Date',
      'Purchase Source',
      'Storage Location',
      'Barcode',
      'Labels',
      'Status',
      'Marketplaces',
      'Listing Price',
      'Listing Date',
      'Sale Price',
      'Sale Date',
      'Shipping Date',
      'Fees',
      'Profit',
      'Additional Costs',
      'Created At',
      'Updated At',
    ]

    const rows = productsToExport.map((product) => {
      const marketplacesText = Array.isArray(product.marketplaces)
        ? (product.marketplaces as string[]).join('; ')
        : String(product.marketplaces)

      return [
        product.code,
        product.sku,
        product.name,
        product.brand,
        product.category,
        product.size,
        product.colour,
        product.condition,
        product.purchasePrice.toFixed(2),
        product.purchaseDate ?? '',
        product.purchaseSource,
        product.storageLocation,
        product.barcode ?? '',
        (product.labels || []).join('; '),
        product.status,
        marketplacesText,
        product.listingPrice.toFixed(2),
        product.listingDate ?? '',
        product.salePrice === null
          ? ''
          : product.salePrice.toFixed(2),
        product.saleDate ?? '',
        product.shippingDate ?? '',
        product.fees.toFixed(2),
        product.profit.toFixed(2),
        product.additionalCosts.toFixed(2),
        product.createdAt,
        product.updatedAt,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    })

    const csv = [headers.join(','), ...rows].join('\r\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `sellerhq-inventory-${
      new Date().toISOString().split('T')[0]
    }.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportCsv() {
    if (exportableProducts.length === 0) {
      setActionError('There are no products to export.')
      return
    }

    exportProductsToCsv(exportableProducts)
  }

  function handleExportSelectedCsv() {
    if (selectedProducts.length === 0) {
      return
    }

    exportProductsToCsv(selectedProducts)
  }

  async function handlePrintSelectedLabels() {
    if (selectedProducts.length === 0) {
      return
    }

    const popup = window.open('', '_blank', 'width=900,height=900')

    if (!popup) {
      showToast(
        'Please allow pop-ups to print the selected labels.',
        'error',
      )
      return
    }

    const qrUrls = await Promise.all(
      selectedProducts.map((product) =>
        generateQrDataUrl(
          getProductQrValue({
            productId: product.id,
            fallbackValue: `${product.code} | ${product.name}`,
          }),
          220,
        ),
      ),
    )

    const labelsMarkup = selectedProducts
      .map((product, index) => {
        const qrUrl = qrUrls[index]

        return `
          <article class="label-card">
            <img src="${qrUrl}" alt="QR code for ${escapeHtml(product.code)}" />
            <div>
              <h1>${escapeHtml(product.name)}</h1>
              <p><strong>Product ID:</strong> ${escapeHtml(product.code)}</p>
            </div>
          </article>
        `
      })
      .join('')

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Selected product labels</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              background: #f6f7f9;
              font-family: Arial, sans-serif;
              color: #17191c;
            }
            .sheet {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }
            .label-card {
              background: white;
              border: 1px solid #e4e6e9;
              border-radius: 16px;
              padding: 16px;
              display: flex;
              gap: 14px;
              align-items: center;
              page-break-inside: avoid;
            }
            img {
              width: 160px;
              height: 160px;
              flex-shrink: 0;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 16px;
            }
            p {
              margin: 4px 0 0;
              font-size: 12px;
              line-height: 1.4;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .sheet {
                gap: 0;
              }
              .label-card {
                border: 0;
                border-radius: 0;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${labelsMarkup}
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `)

    popup.document.close()
  }

  async function updateSelectedProducts(
    updater: (product: Product) => Product,
    errorMessage: string,
  ) {
    if (selectedProducts.length === 0) {
      return
    }

    setActionError('')

    try {
      await Promise.all(
        selectedProducts.map((product) =>
          updateProduct(updater(product)),
        ),
      )
      clearSelection()
    } catch (error) {
      console.error(error)
      setActionError(errorMessage)
    }
  }

  async function applyBulkStatus(
    status: ProductStatus,
  ) {
    const today = todayIsoDate()

    await updateSelectedProducts(
      (product) => ({
        ...product,
        status,
        listingDate:
          status === 'Listed'
            ? today
            : product.listingDate,
        updatedAt: new Date().toISOString(),
      }),
      'The selected products could not be updated. Please try again.',
    )
  }

  async function confirmShipping(product: Product) {
    setActionError('')

    try {
      await updateProduct({
        ...product,
        status: 'Sold',
        updatedAt: new Date().toISOString(),
      })
      showToast(`${product.code} marked as sold`, 'success')
    } catch (error) {
      console.error(error)
      setActionError('Shipping could not be confirmed. Please try again.')
    }
  }

  async function applyBulkStorageLocation() {
    setStorageLocationValue('')
    setStorageLocationPrompt(true)
  }

  async function confirmBulkStorageLocation() {
    setStorageLocationPrompt(false)

    const storageLocation = storageLocationValue.trim()

    if (!storageLocation) {
      return
    }

    await updateSelectedProducts(
      (product) => ({
        ...product,
        storageLocation,
        updatedAt: new Date().toISOString(),
      }),
      'The selected products could not be moved. Please try again.',
    )
  }

  async function handleBulkDelete() {
    if (selectedProducts.length === 0) {
      return
    }

    setConfirmBulkDelete(true)
  }

  async function confirmBulkDeleteAction() {
    setConfirmBulkDelete(false)

    setActionError('')

    try {
      await Promise.all(
        selectedProducts.map((product) =>
          deleteProduct(product.id),
        ),
      )
      clearSelection()
      showToast(`${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} deleted`, 'success')
    } catch (error) {
      console.error(error)
      setActionError(
        'The selected products could not be deleted. Please try again.',
      )
    }
  }

  async function handleDelete(id: string) {
    setActionError('')
    setConfirmDeleteId(id)
  }

  async function confirmDeleteAction() {
    const id = confirmDeleteId
    setConfirmDeleteId(null)

    if (!id) {
      return
    }

    try {
      await deleteProduct(id)
      showToast('Product deleted', 'success')
    } catch (error) {
      console.error(error)
      setActionError(
        'The product could not be deleted. Please try again.',
      )
    }
  }

  async function handleUpdateProduct(
    product: ProductDraft,
  ) {
    setActionError('')

    if (!editingProduct) {
      return
    }

    try {
      await updateProduct({
        ...product,
        businessId: editingProduct.businessId,
      })
      setEditingProduct(null)
    } catch (error) {
      console.error(error)
      setActionError(
        'The product could not be saved. Please try again.',
      )
    }
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Inventory</h1>
          <p>Manage the products in your business.</p>
        </div>

        <div className="page-heading-actions">
          <button
            className="primary-button"
            type="button"
            onClick={openCreateProduct}
          >
            + Add product
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={openImportPicker}
          >
            Import CSV
</button>
        </div>
      </div>

      {actionError && (
        <div className="inventory-alert">
          {actionError}
        </div>
      )}

      <input
        ref={importFileInputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={handleImportFileSelected}
      />

      {selectedProductIds.length > 0 && (
        <div className="inventory-bulk-bar">
          <div>
            <strong>
              {selectedProductIds.length} selected
            </strong>
            <span>
              {visibleSelectionCount} visible in the current filter.
            </span>
          </div>

          <div className="inventory-bulk-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => applyBulkStatus('Unlisted')}
            >
              Unlisted
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => applyBulkStatus('Listed')}
            >
              Listed
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                applyBulkStatus('Awaiting Shipping')
              }
            >
              Awaiting shipping
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => applyBulkStatus('In Shipping')}
            >
              In shipping
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => applyBulkStatus('Sold')}
            >
              Sold
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={applyBulkStorageLocation}
            >
              Move storage
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleExportSelectedCsv}
              disabled={selectedProducts.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handlePrintSelectedLabels}
              disabled={selectedProducts.length === 0}
            >
              Print labels
            </button>
            <button
              type="button"
              className="delete-button"
              onClick={handleBulkDelete}
            >
              Delete selected
            </button>
            <button
              type="button"
              className="row-action-link"
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>

        <div className="inventory-stat">
          <span>Listed</span>
          <strong>{listedCount}</strong>
        </div>

        <div className="inventory-stat">
          <span>Awaiting shipping</span>
          <strong>{awaitingShippingCount}</strong>
        </div>

        <div className="inventory-stat">
          <span>In shipping</span>
          <strong>{inShippingCount}</strong>
        </div>

        <div className="inventory-stat">
          <span>Sold</span>
          <strong>{soldCount}</strong>
        </div>

        <div className="inventory-stat">
          <span>Inventory cost</span>
          <strong>{money(inventoryValue)}</strong>
        </div>
      </div>

<FilterBar
        searchValue={search}
        searchPlaceholder="Search code, SKU, name, brand, category, or storage"
        onSearchChange={setSearch}
        filtersActive={filtersActive}
        onClearFilters={() => {
          setSearch('')
          setStatusFilter('All')
          setMarketplaceFilter('All')
          setConditionFilter('All')
        }}
        actions={
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportCsv}
            disabled={exportableProducts.length === 0}
          >
            Export CSV
          </button>
        }
      >
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as ProductStatus | 'All',
            )
          }
        >
          <option value="All">All statuses</option>
          <option value="Unlisted">Unlisted</option>
          <option value="Listed">Listed</option>
          <option value="Awaiting Shipping">
            Awaiting Shipping
          </option>
          <option value="In Shipping">
            In Shipping
          </option>
          <option value="Sold">Sold</option>
        </select>

        <select
          value={marketplaceFilter}
          onChange={(event) =>
            setMarketplaceFilter(
              event.target.value as MarketplaceFilter,
            )
          }
        >
          {marketplaceFilters.map((marketplace) => (
            <option key={marketplace} value={marketplace}>
              {marketplace === 'All'
                ? 'All marketplaces'
                : marketplace}
            </option>
          ))}
        </select>

        <select
          value={conditionFilter}
          onChange={(event) =>
            setConditionFilter(
              event.target.value as ProductCondition | 'All',
            )
          }
        >
          {conditionFilters.map((condition) => (
            <option key={condition} value={condition}>
              {condition === 'All'
                ? 'All conditions'
                : condition}
            </option>
          ))}
        </select>

        <select
          value={sortKey}
          onChange={(event) =>
            setSortKey(event.target.value as SortKey)
          }
        >
          {Object.entries(sortLabels).map(
            ([value, label]) => (
              <option key={value} value={value}>
                Sort by {label}
              </option>
            ),
          )}
        </select>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setSortDirection((current) =>
              current === 'asc' ? 'desc' : 'asc',
            )
          }
        >
          {sortDirection === 'asc'
            ? 'Ascending'
            : 'Descending'}
        </button>

        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value))
            setCurrentPage(1)
          }}
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
          <option value={250}>250 per page</option>
        </select>
      </FilterBar>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th className="inventory-select-column">
                <label className="inventory-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate =
                          someVisibleSelected
                      }
                    }}
                    onChange={(event) =>
                      toggleVisibleSelection(
                        event.target.checked,
                      )
                    }
                  />
                  <span>Select</span>
                </label>
              </th>
              <th>Product ID</th>
              <th>Name</th>
              <th>Storage</th>
              <th>Status</th>
              <th>Marketplaces</th>
              <th>Sale</th>
              <th>Profit</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <div className="table-empty">
                    <strong>Loading inventory...</strong>
                    <span>Retrieving your products.</span>
                  </div>
                </td>
              </tr>
            ) : sortedProducts.length > 0 ? (
              paginatedProducts.map((product) => (
                <tr key={product.id}>
                  <td data-label="">
                    <label className="inventory-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(
                          product.id,
                        )}
                        onChange={() =>
                          toggleSelected(product.id)
                        }
                      />
                      <span className="sr-only">
                        Select {product.code}
                      </span>
                    </label>
                  </td>

                  <td data-label="Product ID">
                    <button
                      className="product-link"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/products/${product.id}`,
                        )
                      }
                    >
                      {product.code}
                    </button>
                  </td>

                  <td data-label="Name">
                    <button
                      className="product-link product-name-link"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/products/${product.id}`,
                        )
                      }
                    >
                      {product.name}
                    </button>
                    {product.labels && product.labels.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {product.labels.slice(0, 3).map((label) => (
                          <span
                            key={label}
                            style={{
                              fontSize: 10,
                              padding: '1px 6px',
                              borderRadius: 999,
                              background: 'var(--shq-primary-bg)',
                              color: 'var(--shq-primary)',
                              fontWeight: 600,
                            }}
                          >
                            {label}
                          </span>
                        ))}
                        {product.labels.length > 3 && (
                          <span style={{ fontSize: 10, color: 'var(--shq-ink-muted)' }}>
                            +{product.labels.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                   <td data-label="Storage">{product.storageLocation || '-'}</td>

                   <td data-label="Status">
                    <span
                      className={`status-badge status-${product.status
                        .toLowerCase()
                        .replaceAll(' ', '-')}`}
                    >
                      {product.status}
                    </span>
                  </td>

                  <td data-label="Marketplaces">
                    {product.marketplaces.length > 0
                      ? Array.isArray(product.marketplaces)
                        ? product.marketplaces.join(', ')
                        : product.marketplaces
                      : '-'}
                  </td>

                  <td data-label="Sale">
                    {product.salePrice === null
                      ? '-'
                      : money(product.salePrice)}
                  </td>

                  <td data-label="Profit">
                    <span
                      className={
                        product.profit >= 0
                          ? 'inventory-profit-positive'
                          : 'inventory-profit-negative'
                      }
                    >
                      {money(product.profit)}
                    </span>
                  </td>

                  <td data-label="Actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() =>
                          navigate(
                            `/products/${product.id}`,
                          )
                        }
                      >
                        View
                      </button>

                      {shippingFlowEnabled && product.status === 'In Shipping' && (
                        <button
                          type="button"
                          className="row-action-link"
                          onClick={() => confirmShipping(product)}
                        >
                          Confirm shipping
                        </button>
                      )}

                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => {
                          setActionError('')
                          setEditingProduct(product)
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() =>
                          openDuplicateProduct(product)
                        }
                      >
                        Duplicate
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() =>
                          handleDelete(product.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>
                  <div className="inventory-empty-state">
                    <strong>
                      {filtersActive
                        ? 'No products match your filters'
                        : 'Your inventory is empty'}
                    </strong>

                    <span>
                      {filtersActive
                        ? 'Try clearing the search, status, marketplace, or condition filters.'
                        : 'Add your first product to start tracking stock, storage, photos, listings, and sales.'}
                    </span>

                    <div className="inventory-empty-actions">
                      {filtersActive && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSearch('')
                            setStatusFilter('All')
                            setMarketplaceFilter('All')
                            setConditionFilter('All')
                          }}
                        >
                          Clear filters
                        </button>
                      )}

                      <button
                        type="button"
                        className="primary-button"
                        onClick={openCreateProduct}
                      >
                        + Add product
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {sortedProducts.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid var(--shq-border)',
              background: 'var(--shq-surface)',
              color: 'var(--shq-ink)',
              fontSize: 13,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>
              Showing {showingStart}–{showingEnd} of{' '}
              {sortedProducts.length} products
            </span>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <button
                type="button"
                className="secondary-button"
                disabled={safeCurrentPage <= 1}
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
              >
                Previous
              </button>

              <span style={{ padding: '0 8px' }}>
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="secondary-button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(totalPages, p + 1),
                  )
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {draftEditor && (
        <ProductEditorModal
          key={draftEditor.title}
          title={draftEditor.title}
          description={draftEditor.description}
          submitLabel={draftEditor.submitLabel}
          initialProduct={draftEditor.initialProduct}
          onClose={() => setDraftEditor(null)}
          onSubmit={handleCreateProduct}
        />
      )}

      {editingProduct && (
        <ProductEditorModal
          key={editingProduct.id}
          title="Edit product"
          description="Update the product system fields."
          submitLabel="Save changes"
          initialProduct={productToDraft(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSubmit={handleUpdateProduct}
        />
      )}

      {importPreview && (
        <InventoryImportModal
          preview={importPreview}
          importing={importingInventory}
          onClose={() => setImportPreview(null)}
          onConfirm={handleCommitImport}
        />
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected products"
        message={`Delete ${selectedProducts.length} selected product${selectedProducts.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmBulkDeleteAction}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete product"
        message="Permanently delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {storageLocationPrompt && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-location-dialog-title"
          onMouseDown={() => setStorageLocationPrompt(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: 420, padding: 24 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="storage-location-dialog-title"
              style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}
            >
              Storage location
            </h2>
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              Enter the new storage location for the selected products:
            </div>
            <input
              type="text"
              value={storageLocationValue}
              onChange={(e) => setStorageLocationValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmBulkStorageLocation()
                }
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--shq-border)',
                borderRadius: 8,
                fontSize: 14,
                marginBottom: 20,
                boxSizing: 'border-box',
              }}
              placeholder="e.g. Shelf A3"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStorageLocationPrompt(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmBulkStorageLocation}
              >
                Move products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory

type InventoryImportModalProps = {
  preview: InventoryImportPreview
  importing: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

function InventoryImportModal({
  preview,
  importing,
  onClose,
  onConfirm,
}: InventoryImportModalProps) {
  const createdCount = preview.rows.filter(
    (row) => row.existingProduct === null,
  ).length
  const updatedCount = preview.rows.length - createdCount
  const rowWarnings = preview.rows.flatMap((row) =>
    row.warnings.map(
      (warning) => `Row ${row.rowNumber}: ${warning}`,
    ),
  )

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal inventory-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Import CSV</h2>
            <p>
              Review the preview before adding or updating products.
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            type="button"
            disabled={importing}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="inventory-import-summary">
            <div className="inventory-stat">
              <span>Rows</span>
              <strong>{preview.rows.length}</strong>
            </div>

            <div className="inventory-stat">
              <span>New products</span>
              <strong>{createdCount}</strong>
            </div>

            <div className="inventory-stat">
              <span>Updates</span>
              <strong>{updatedCount}</strong>
            </div>

            <div className="inventory-stat">
              <span>Warnings</span>
              <strong>{rowWarnings.length + preview.warnings.length}</strong>
            </div>
          </div>

          {(preview.warnings.length > 0 ||
            rowWarnings.length > 0) && (
            <div className="inventory-alert">
              <strong>Review before importing:</strong>
              <ul className="inventory-warning-list">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
                {rowWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="inventory-modal-section inventory-modal-full">
            <h3>Preview rows</h3>
            <div className="inventory-import-list">
              {preview.rows.slice(0, 8).map((row) => (
                <div className="inventory-import-row" key={row.rowNumber}>
                  <div>
                    <strong>{row.draft.name || 'Unnamed product'}</strong>
                    <span>
                      {row.draft.code}
                      {row.existingProduct ? ' - updates existing product' : ' - will be created'}
                    </span>
                  </div>

                  <div className="inventory-import-row-meta">
                    <span>{row.draft.status}</span>
                    <span>{row.draft.marketplaces.join(', ') || 'No marketplaces'}</span>
                    <span>{row.draft.storageLocation || 'No storage'}</span>
                  </div>
                </div>
              ))}

              {preview.rows.length > 8 && (
                <div className="field-hint">
                  Showing the first 8 rows only.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={importing}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={onConfirm}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import products'}
          </button>
        </div>
      </div>
    </div>
  )
}





