import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useProducts } from '../hooks/useProducts'
import { useBusiness } from '../hooks/useBusiness'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '../hooks/useToast'
import { useSettings } from '../hooks/useSettings'
import { escapeHtml } from '../lib/sanitize'
import { printBrandingMarkup, PRINT_BRAND_CSS, qrLogoUrl } from '../lib/branding'
import type {
  Marketplace,
  Product,
  ProductDraft,
  ProductStatus,
  ProductEvent,
} from '../types/product'
import { ProductEditorModal } from '../components/ProductEditorModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  createDuplicateProductDraft,
  productToDraft,
} from '../lib/productDraft'
import { generateQrDataUrl, getProductQrValue } from '../lib/qr'
import JsBarcode from 'jsbarcode'

type SoldDraft = {
  salePrice: string
  saleDate: string
  shippingDate: string
  saleMarketplace: Marketplace | ''
  shippingCost: string
  platformFees: string
  otherFees: string
}

function todayValue() {
  return new Date().toISOString().split('T')[0]
}

function ProductDetails() {
  const navigate = useNavigate()
  const { productId } = useParams()

const {
    getProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    fetchEvents,
  } = useProducts()
  const { currentBusiness } = useBusiness()
  const { money } = useCurrency()
  const { showToast } = useToast()
  const { settings } = useSettings()

  const shippingFlowEnabled = settings.features.shippingFlowEnabled

const product = productId
    ? getProduct(productId)
    : undefined

  const [events, setEvents] = useState<ProductEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  useEffect(() => {
    if (productId) {
      setLoadingEvents(true)
      fetchEvents(productId).then((loadedEvents) => {
        setEvents(loadedEvents)
        setLoadingEvents(false)
      })
    }
  }, [productId, fetchEvents])

  const [editingProduct, setEditingProduct] =
    useState(false)
  const [duplicatingProduct, setDuplicatingProduct] =
    useState<ProductDraft | null>(null)
  const [sellingProduct, setSellingProduct] =
    useState<SoldDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] =
    useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRefund, setConfirmRefund] = useState(false)
  const [confirmShippingOpen, setConfirmShippingOpen] = useState(false)

  if (!product) {
    return (
      <div className="product-not-found">
        <h1>Product not found</h1>

        <p>
          This product doesn't exist or may have been removed.
        </p>

        <button
          className="primary-button"
          onClick={() => navigate('/inventory')}
        >
          Back to inventory
        </button>
      </div>
    )
  }

  const currentProduct = product

  async function handleUpdate(updatedProduct: Product) {
    setSaving(true)
    setError('')

    try {
      await updateProduct(updatedProduct)
      setEditingProduct(false)
    } catch (err) {
      console.error(err)
      setError(
        'The product could not be saved. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProduct() {
    setConfirmDelete(true)
  }

  async function confirmDeleteProduct() {
    setConfirmDelete(false)
    setError('')

    try {
      await deleteProduct(currentProduct.id)
      navigate('/inventory')
    } catch (err) {
      console.error(err)
      setError(
        'The product could not be deleted. Please try again.',
      )
    }
  }

  async function handleQuickStatusChange(
    nextStatus: ProductStatus,
  ) {
    if (nextStatus === currentProduct.status) {
      return
    }

    if (nextStatus === 'Sold') {
      setError('')
      setSellingProduct({
        salePrice: currentProduct.salePrice?.toString() ?? '',
        saleDate: currentProduct.saleDate ?? todayValue(),
        shippingDate: currentProduct.shippingDate ?? '',
        saleMarketplace: currentProduct.saleMarketplace ?? '',
        shippingCost: currentProduct.shippingCost.toString(),
        platformFees: currentProduct.platformFees.toString(),
        otherFees: currentProduct.otherFees.toString(),
      })
      return
    }

    setStatusSaving(true)
    setError('')

    try {
      await updateProduct({
        ...currentProduct,
        status: nextStatus,
        listingDate:
          nextStatus === 'Listed'
            ? todayValue()
            : currentProduct.listingDate,
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error(err)
      setError(
        'The status could not be updated. Please try again.',
      )
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleDuplicateProduct() {
    setDuplicatingProduct(
      createDuplicateProductDraft(currentProduct),
    )
  }

  async function handleCreateDuplicate(
    draft: ProductDraft,
  ) {
    setError('')

    try {
      await addProduct(draft)
      setDuplicatingProduct(null)
    } catch (err) {
      console.error(err)
      setError(
        'The duplicated product could not be created. Please try again.',
      )
    }
  }

  function openSoldFlow() {
    setError('')
    setSellingProduct({
      salePrice: currentProduct.salePrice?.toString() ?? '',
      saleDate: currentProduct.saleDate ?? todayValue(),
      shippingDate: currentProduct.shippingDate ?? '',
      saleMarketplace: currentProduct.saleMarketplace ?? '',
      shippingCost: currentProduct.shippingCost.toString(),
      platformFees: currentProduct.platformFees.toString(),
      otherFees: currentProduct.otherFees.toString(),
    })
  }

  async function handleSaveSoldFlow(draft: SoldDraft) {
    const salePrice = Number(draft.salePrice)
    const shippingCost = Number(draft.shippingCost)
    const platformFees = Number(draft.platformFees)
    const otherFees = Number(draft.otherFees)

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      throw new Error('Sale price must be zero or higher.')
    }

    if (
      !Number.isFinite(shippingCost) ||
      !Number.isFinite(platformFees) ||
      !Number.isFinite(otherFees)
    ) {
      throw new Error('Fees must be valid numbers.')
    }

    const fees = shippingCost + platformFees + otherFees
    const profit =
      salePrice -
      currentProduct.purchasePrice -
      currentProduct.additionalCosts -
      fees

    await updateProduct({
      ...currentProduct,
      status: shippingFlowEnabled ? 'Awaiting Shipping' : 'Sold',
      salePrice,
      saleDate: draft.saleDate || todayValue(),
      shippingDate: draft.shippingDate || null,
      saleMarketplace: draft.saleMarketplace || null,
      shippingCost,
      platformFees,
      otherFees,
      fees,
      profit,
      updatedAt: new Date().toISOString(),
    })
  }

  async function handleRefund() {
    setConfirmRefund(true)
  }

  async function confirmRefundProduct() {
    setConfirmRefund(false)

    try {
      await updateProduct({
        ...currentProduct,
        refunded: true,
        refundAmount: currentProduct.salePrice ?? 0,
        refundDate: todayValue(),
        updatedAt: new Date().toISOString(),
      })
      showToast('Sale marked as refunded', 'info')
    } catch (err) {
      console.error(err)
      setError('The refund could not be recorded. Please try again.')
    }
  }

  async function confirmShippingProduct() {
    setConfirmShippingOpen(false)

    try {
      await updateProduct({
        ...currentProduct,
        status: 'Sold',
        updatedAt: new Date().toISOString(),
      })
      showToast('Shipping confirmed - product marked as sold', 'success')
    } catch (err) {
      console.error(err)
      setError('Shipping could not be confirmed. Please try again.')
    }
  }

  async function handleGetQrCode() {
    const qrValue = getProductQrValue({
      productId: currentProduct.id,
      fallbackValue: `${currentProduct.code} | ${currentProduct.name}`,
    })
    let qrUrl: string

    try {
      qrUrl = await generateQrDataUrl(qrValue, 240, qrLogoUrl(currentBusiness))
    } catch (error) {
      console.error(error)
      showToast('The QR code could not be generated.', 'error')
      return
    }

    const popup = window.open(
      '',
      '_blank',
      'width=420,height=560',
    )

if (!popup) {
      showToast(
        'Please allow pop-ups to print the QR code.',
        'error',
      )
      return
    }

    const brandMarkup = printBrandingMarkup(currentBusiness)

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR code for ${escapeHtml(currentProduct.code)}</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              display: grid;
              place-items: center;
              min-height: 100vh;
              background: #f6f7f9;
              color: #17191c;
            }
            .sheet {
              width: 320px;
              background: white;
              border: 1px solid #e4e6e9;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              box-shadow: 0 12px 40px rgba(0,0,0,.08);
            }
            img {
              width: 240px;
              height: 240px;
              image-rendering: pixelated;
            }
            h1 {
              font-size: 18px;
              margin: 0 0 8px;
            }
            p {
              margin: 6px 0 0;
              color: #5f656c;
              font-size: 13px;
            }
            .code {
              font-weight: 700;
              margin-top: 12px;
            }
            ${PRINT_BRAND_CSS}
            @media print {
              body {
                background: white;
              }
              .sheet {
                box-shadow: none;
                border: 0;
                width: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${brandMarkup}
            <h1>${escapeHtml(currentProduct.name)}</h1>
            <img src="${qrUrl}" alt="QR code for ${escapeHtml(currentProduct.code)}" />
            <p class="code">${escapeHtml(currentProduct.code)}</p>
            <p>Scan to open the product details.</p>
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

  async function handlePrintBarcode() {
    const value =
      currentProduct.barcode ||
      currentProduct.code ||
      currentProduct.sku

    const popup = window.open('', '_blank', 'width=520,height=420')

    if (!popup) {
      showToast('Please allow pop-ups to print the barcode.', 'error')
      return
    }

    const svg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    )

    try {
      JsBarcode(svg, value, {
        format: 'CODE128',
        width: 2,
        height: 90,
        displayValue: true,
        margin: 20,
      })
    } catch (error) {
      console.error(error)
      showToast('The barcode could not be generated.', 'error')
      popup.close()
      return
    }

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)

    const brandMarkup = printBrandingMarkup(currentBusiness)

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Barcode for ${escapeHtml(currentProduct.code)}</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #f6f7f9;
              min-height: 100vh;
              display: grid;
              place-items: center;
              padding: 24px;
            }
            .sheet {
              width: 420px;
              background: white;
              border: 1px solid #e4e6e9;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              box-shadow: 0 12px 40px rgba(0,0,0,.08);
            }
            h1 { font-size: 16px; margin: 0 0 4px; color: #17191c; }
            p { margin: 0 0 16px; font-size: 12px; color: #717780; }
            svg { max-width: 100%; height: auto; }
            .code { font-size: 14px; font-weight: 600; color: #17191c; margin-top: 12px; }
            ${PRINT_BRAND_CSS}
          </style>
        </head>
        <body>
          <div class="sheet">
            ${brandMarkup}
            <h1>${escapeHtml(currentProduct.name)}</h1>
            <p>${escapeHtml(currentProduct.code)}</p>
            ${svgString}
            <div class="code">${escapeHtml(value)}</div>
          </div>
        </body>
      </html>
    `)
    popup.document.close()
  }

  async function handlePrintLabel() {
    const qrValue = getProductQrValue({
      productId: currentProduct.id,
      fallbackValue: `${currentProduct.code} | ${currentProduct.name}`,
    })
    let qrUrl: string

    try {
      qrUrl = await generateQrDataUrl(qrValue, 280, qrLogoUrl(currentBusiness))
    } catch (error) {
      console.error(error)
      showToast('The label QR code could not be generated.', 'error')
      return
    }

    const popup = window.open(
      '',
      '_blank',
      'width=600,height=820',
    )

if (!popup) {
      showToast(
        'Please allow pop-ups to print the product label.',
        'error',
      )
      return
    }

    const brandMarkup = printBrandingMarkup(currentBusiness)

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Label for ${escapeHtml(currentProduct.code)}</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #f6f7f9;
              color: #17191c;
              min-height: 100vh;
              display: grid;
              place-items: center;
              padding: 24px;
            }
            .label-sheet {
              width: 420px;
              background: white;
              border: 1px solid #e4e6e9;
              border-radius: 20px;
              padding: 24px;
              box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
            }
            .top {
              display: flex;
              gap: 18px;
              align-items: center;
            }
            img {
              width: 180px;
              height: 180px;
              image-rendering: pixelated;
              border: 1px solid #eef0f2;
              border-radius: 16px;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 18px;
            }
            .meta {
              display: grid;
              gap: 8px;
              margin-top: 14px;
              font-size: 13px;
            }
            .meta div {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              border-bottom: 1px solid #eef0f2;
              padding-bottom: 6px;
            }
            .meta strong {
              max-width: 220px;
              text-align: right;
              word-break: break-word;
            }
            .footer {
              margin-top: 16px;
              color: #5f656c;
              font-size: 12px;
              line-height: 1.5;
            }
            ${PRINT_BRAND_CSS}
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .label-sheet {
                box-shadow: none;
                border: 0;
                width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-sheet">
            ${brandMarkup}
            <div class="top">
              <img src="${qrUrl}" alt="QR code for ${escapeHtml(currentProduct.code)}" />
              <div>
                <h1>${escapeHtml(currentProduct.name)}</h1>
                <div class="footer">
                  Print this label and attach it to the item or storage box.
                </div>
              </div>
            </div>
            <div class="meta">
              <div><span>Product</span><strong>${escapeHtml(currentProduct.name)}</strong></div>
              <div><span>Product ID</span><strong>${escapeHtml(currentProduct.code)}</strong></div>
            </div>
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

  return (
    <div className="product-details-page">
      <button
        className="back-button"
        onClick={() => navigate('/inventory')}
      >
        Back to inventory
      </button>

      {error && (
        <div className="inventory-alert">
          {error}
        </div>
      )}

      <div className="product-details-header">
        <div>
          <div className="product-code">
            {currentProduct.code}
          </div>

          <h1>{currentProduct.name}</h1>

          <p>
            Added to inventory on {formatDate(currentProduct.dateAdded)}
          </p>
        </div>

        <div className="product-details-header-actions">
          <div className="product-status-controls">
            <label className="product-status-picker">
              <span>Quick status</span>

              <select
                value={currentProduct.status}
                onChange={(event) =>
                  handleQuickStatusChange(
                    event.target.value as ProductStatus,
                  )
                }
                disabled={statusSaving}
              >
{[
                  'Unlisted',
                  'Draft',
                  'Listed',
                  'Awaiting Shipping',
                  'In Shipping',
                  'Sold',
                  'Reserved',
                  'Issue',
                  'Relisting Required',
                  'Removed',
                  'Returned',
                  'Archived',
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <span
              className={`status-badge status-${currentProduct.status
                .toLowerCase()
                .replace(/ /g, '-')}`}
            >
              {statusSaving ? 'Saving...' : currentProduct.status}
            </span>
          </div>

          <div className="product-details-actions">
            <button
              className="secondary-button"
              onClick={() => setEditingProduct(true)}
            >
              Edit product
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={openSoldFlow}
            >
              {currentProduct.status === 'Sold'
                ? 'Update sold details'
                : 'Mark as sold'}
            </button>

            {shippingFlowEnabled && currentProduct.status === 'In Shipping' && (
              <button
                type="button"
                className="primary-button"
                onClick={() => setConfirmShippingOpen(true)}
              >
                ✓ Confirm shipping
              </button>
            )}

            {currentProduct.status === 'Sold' && !currentProduct.refunded && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleRefund}
                style={{ borderColor: '#b91c1c', color: '#b91c1c' }}
              >
                Refund sale
              </button>
            )}

            {currentProduct.refunded && (
              <span className={`status-badge status-${currentProduct.refunded ? 'sold' : 'listed'}`}>
                Refunded {currentProduct.refundAmount ? money(currentProduct.refundAmount) : ''}
              </span>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={handleDuplicateProduct}
            >
              Duplicate product
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handlePrintLabel}
            >
              Print label
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handlePrintBarcode}
            >
              Barcode
            </button>

            <button
              type="button"
              className="delete-button"
              onClick={handleDeleteProduct}
            >
              Delete product
            </button>
          </div>
        </div>
      </div>

      <div className="product-details-grid">
        <section className="product-card product-main">
          <div className="card-heading">
            <div>
              <h2>Identity</h2>
              <p>Core information about this product.</p>
            </div>
          </div>

          <div className="product-fields">
            <Field label="Product ID" value={currentProduct.code} />
            <Field label="SKU" value={currentProduct.sku} fallback="Not assigned" />
            <Field label="Brand" value={currentProduct.brand} />
            <Field label="Category" value={currentProduct.category} />
            <Field label="Size" value={currentProduct.size} />
            <Field label="Colour" value={currentProduct.colour} />
            <Field label="Condition" value={currentProduct.condition} />
            <Field label="Description" value={currentProduct.description} fullWidth />
            {Object.entries(currentProduct.customFields ?? {}).map(([key, value]) => (
              <Field key={key} label={key} value={value} />
            ))}
          </div>
        </section>

        <section className="product-card">
          <div className="card-heading">
            <div>
              <h2>Purchase</h2>
              <p>How the item entered the business.</p>
            </div>
          </div>

          <div className="product-fields single-column">
            <Field
              label="Purchase price"
              value={money(currentProduct.purchasePrice)}
             />
             <Field
               label="Purchase date"
              value={formatDate(currentProduct.purchaseDate)}
            />
            <Field
              label="Source"
              value={currentProduct.purchaseSource}
              fallback="Not recorded"
            />
            <Field
              label="Additional costs"
              value={money(currentProduct.additionalCosts)}
             />
          </div>
        </section>

        <section className="product-card">
          <div className="card-heading">
            <div>
              <h2>Storage & Barcode</h2>
              <p>Where this product is stored and barcode data.</p>
            </div>
          </div>

          <div className="product-fields single-column">
            <Field
              label="Location"
              value={currentProduct.storageLocation}
              fallback="Not assigned"
            />
            <Field
              label="Barcode / EAN"
              value={currentProduct.barcode}
              fallback="Not assigned"
            />
            <div className="product-qr-action">
              <span>QR code</span>

              <button
                type="button"
                className="secondary-button"
                onClick={handleGetQrCode}
              >
                Get QR code
              </button>
            </div>
          </div>
        </section>

        <section className="product-card">
          <div className="card-heading">
            <div>
              <h2>Media</h2>
              <p>Photos attached to this product.</p>
            </div>
          </div>

          {currentProduct.photos.length > 0 ? (
            <div className="photo-grid">
              {currentProduct.photos.map((photo, index) => (
                <div className="photo-card" key={`${photo}-${index}`}>
                  {photo.startsWith('http') ||
                  photo.startsWith('data:') ? (
                    <img src={photo} alt={`Product photo ${index + 1}`} />
                  ) : (
                    <span>{photo}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="table-empty">
              <strong>No photos added</strong>
              <span>Use edit to upload product photos.</span>
            </div>
          )}
        </section>

        <section className="product-card">
          <div className="card-heading">
            <div>
              <h2>Listings</h2>
              <p>Where this product is currently listed.</p>
            </div>
          </div>

          <div className="marketplace-list">
            {[
              'eBay',
              'Vinted',
              'Etsy',
              'Depop',
            ].map((marketplace) => (
              <div
                className="marketplace-row"
                key={marketplace}
              >
                <span>{marketplace}</span>

                <span
                  className={
                    currentProduct.marketplaces.includes(
                      marketplace as Marketplace,
                    )
                      ? 'marketplace-listed'
                      : 'marketplace-not-listed'
                  }
                >
                  {currentProduct.marketplaces.includes(
                    marketplace as Marketplace,
                  )
                    ? 'Listed'
                    : 'Not listed'}
                </span>
              </div>
            ))}
          </div>

          <div className="listing-price">
            <span>Listed on</span>
            <strong>{formatDate(currentProduct.listingDate)}</strong>
          </div>

          <div className="listing-price">
            <span>Listing price</span>
            <strong>{money(currentProduct.listingPrice)}</strong>
          </div>
        </section>

        <section className="product-card">
          <div className="card-heading">
            <div>
              <h2>Sale</h2>
              <p>Outcome once the item is sold.</p>
            </div>
          </div>

          <div className="product-fields single-column">
            <Field
              label="Sale price"
              value={currentProduct.salePrice === null ? '—' : money(currentProduct.salePrice)}
            />
            <Field
              label="Sold on"
              value={formatDate(currentProduct.saleDate)}
            />
            <Field
              label="Sold via"
              value={currentProduct.saleMarketplace ?? ''}
              fallback="Not recorded"
            />
            <Field
              label="Shipping date"
              value={formatDate(currentProduct.shippingDate)}
            />
            <Field
              label="Fees"
              value={money(currentProduct.fees)}
            />
            <div className="product-profit-box">
              <span>Profit</span>
              <strong>{money(currentProduct.profit)}</strong>
            </div>
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <section className="product-card" style={{ padding: '24px', background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Financial breakdown</h3>
          <BreakdownRow label="Purchase price" value={money(currentProduct.purchasePrice)} />
          <BreakdownRow label="Additional costs" value={money(currentProduct.additionalCosts)} />
          <BreakdownRow label="Shipping cost" value={money(currentProduct.shippingCost)} />
          <BreakdownRow label="Platform fees" value={money(currentProduct.platformFees)} />
          <BreakdownRow label="Other fees" value={money(currentProduct.otherFees)} />
          <BreakdownRow
            label="Total cost"
            value={money(currentProduct.purchasePrice + currentProduct.additionalCosts + currentProduct.shippingCost + currentProduct.fees)}
            strong
          />
          <BreakdownRow
            label="Sale price"
            value={currentProduct.salePrice !== null ? money(currentProduct.salePrice) : '—'}
          />
          <BreakdownRow
            label="Net revenue"
            value={currentProduct.salePrice !== null ? money(currentProduct.salePrice - currentProduct.fees - currentProduct.shippingCost) : '—'}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', borderTop: '1px solid var(--shq-border)', marginTop: '12px' }}>
            <span style={{ fontWeight: 600 }}>Profit</span>
            <strong style={{ color: currentProduct.profit >= 0 ? '#10b981' : '#ef4444' }}>{money(currentProduct.profit)}</strong>
          </div>
          {currentProduct.salePrice !== null && currentProduct.salePrice > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)', textAlign: 'right' }}>
              Margin {((currentProduct.profit / currentProduct.salePrice) * 100).toFixed(1)}%
            </div>
          )}
        </section>

        <section className="product-card" style={{ padding: '24px', background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Marketplace listings</h3>
          {currentProduct.marketplaces.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Marketplace</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Listed</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProduct.marketplaces.map((mp) => (
                    <tr key={mp}>
                      <td>{mp}</td>
                      <td>
                        {currentProduct.status === 'Sold' && currentProduct.saleMarketplace === mp
                          ? 'Sold'
                          : currentProduct.status === 'Listed' || currentProduct.status === 'Awaiting Shipping' || currentProduct.status === 'In Shipping'
                            ? 'Listed'
                            : 'Not listed'}
                      </td>
                      <td>{money(currentProduct.listingPrice)}</td>
                      <td>{formatDate(currentProduct.listingDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--shq-ink-muted)', fontSize: '13px' }}>No marketplaces assigned.</p>
          )}
        </section>
      </div>

      <section className="product-card" style={{ padding: '24px', background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Activity History</h3>
        {loadingEvents ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--shq-ink-muted)' }}>
            Loading activity...
          </div>
        ) : events.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((event) => (
              <div key={event.id} style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '12px', 
                padding: '12px', 
                background: 'var(--shq-bg)', 
                border: '1px solid var(--shq-border)', 
                borderRadius: '8px' 
              }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: getEventColor(event.eventType), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {getEventIcon(event.eventType)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '13px' }}>
                    {event.message}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
                    {formatDateTime(event.createdAt)}
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '11px', color: 'var(--shq-ink-muted)', cursor: 'pointer' }}>
                        Details
                      </summary>
                      <pre style={{ 
                        marginTop: '4px', 
                        fontSize: '10px', 
                        background: 'var(--shq-bg)', 
                        padding: '8px', 
                        borderRadius: '4px',
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--shq-ink-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No activity recorded yet.
          </p>
        )}
      </section>

      {editingProduct && (
        <ProductEditorModal
          title="Edit product"
          description="Update the full product system."
          submitLabel={saving ? 'Saving...' : 'Save changes'}
          initialProduct={productToDraft(currentProduct)}
          onClose={() => setEditingProduct(false)}
          onSubmit={async (draft) =>
            handleUpdate({
              ...draft,
              businessId: currentProduct.businessId,
            })
          }
        />
      )}

      {duplicatingProduct && (
        <ProductEditorModal
          key={duplicatingProduct.id}
          title="Duplicate product"
          description="Create a new product from this one."
          submitLabel="Create duplicate"
          initialProduct={duplicatingProduct}
          onClose={() => setDuplicatingProduct(null)}
          onSubmit={handleCreateDuplicate}
        />
      )}

      {sellingProduct && (
        <SoldProductModal
          product={currentProduct}
          initialDraft={sellingProduct}
          onClose={() => setSellingProduct(null)}
          onSubmit={handleSaveSoldFlow}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product"
        message={`Delete "${currentProduct.name}" (${currentProduct.code}) from inventory?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteProduct}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmRefund}
        title="Refund sale"
        message={`Mark "${currentProduct.name}" (${currentProduct.code}) as refunded? This records a refund but keeps the sale history.`}
        confirmLabel="Refund"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmRefundProduct}
        onCancel={() => setConfirmRefund(false)}
      />

      <ConfirmDialog
        open={confirmShippingOpen}
        title="Confirm shipping"
        message={`Confirm "${currentProduct.name}" (${currentProduct.code}) has been shipped and mark it as sold?`}
        confirmLabel="Confirm shipping"
        cancelLabel="Cancel"
        onConfirm={confirmShippingProduct}
        onCancel={() => setConfirmShippingOpen(false)}
      />
    </div>
  )
}

type FieldProps = {
  label: string
  value: string
  fallback?: string
  fullWidth?: boolean
}

function Field({
  label,
  value,
  fallback = '-',
  fullWidth = false,
}: FieldProps) {
  return (
    <div className={fullWidth ? 'product-field-full' : ''}>
      <span>{label}</span>
      <strong>{value || fallback}</strong>
    </div>
  )
}

function formatDate(value: string | null) {
  return value || '-'
}

type SoldProductModalProps = {
  product: Product
  initialDraft: SoldDraft
  onClose: () => void
  onSubmit: (draft: SoldDraft) => Promise<void>
}

function SoldProductModal({
  product,
  initialDraft,
  onClose,
  onSubmit,
}: SoldProductModalProps) {
  const { money } = useCurrency()
  const [salePrice, setSalePrice] = useState(initialDraft.salePrice)
  const [saleDate, setSaleDate] = useState(initialDraft.saleDate)
  const [shippingDate, setShippingDate] = useState(
    initialDraft.shippingDate,
  )
  const [saleMarketplace, setSaleMarketplace] = useState<
    Marketplace | ''
  >(initialDraft.saleMarketplace)
  const [shippingCost, setShippingCost] = useState(
    initialDraft.shippingCost,
  )
  const [platformFees, setPlatformFees] = useState(
    initialDraft.platformFees,
  )
  const [otherFees, setOtherFees] = useState(initialDraft.otherFees)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const salePriceNumber = Number(salePrice)
  const shippingCostNumber = Number(shippingCost)
  const platformFeesNumber = Number(platformFees)
  const otherFeesNumber = Number(otherFees)

  const totalFees =
    (Number.isFinite(shippingCostNumber) ? shippingCostNumber : 0) +
    (Number.isFinite(platformFeesNumber) ? platformFeesNumber : 0) +
    (Number.isFinite(otherFeesNumber) ? otherFeesNumber : 0)

  const profitPreview = Number.isFinite(salePriceNumber)
    ? salePriceNumber -
      product.purchasePrice -
      product.additionalCosts -
      totalFees
    : -product.purchasePrice - product.additionalCosts - totalFees

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await onSubmit({
        salePrice,
        saleDate,
        shippingDate,
        saleMarketplace,
        shippingCost,
        platformFees,
        otherFees,
      })
    } catch (err) {
      console.error(err)
      setError('The sold details could not be saved. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal inventory-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Mark as sold</h2>
            <p>
              Capture the sale details and automatically calculate profit.
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            type="button"
            disabled={submitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="inventory-alert">{error}</div>}

            <div className="inventory-modal-grid">
              <section className="inventory-modal-section inventory-modal-full">
                <h3>Sale details</h3>
                <div className="inventory-modal-section-grid">
                  <label>
                    Sale price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salePrice}
                      onChange={(event) =>
                        setSalePrice(event.target.value)
                      }
                      disabled={submitting}
                      placeholder="0.00"
                    />
                  </label>

                  <label>
                    Sold on
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(event) =>
                        setSaleDate(event.target.value)
                      }
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Shipping date
                    <input
                      type="date"
                      value={shippingDate}
                      onChange={(event) =>
                        setShippingDate(event.target.value)
                      }
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Sold via
                    <select
                      value={saleMarketplace}
                      onChange={(event) =>
                        setSaleMarketplace(
                          event.target.value as Marketplace | '',
                        )
                      }
                      disabled={submitting}
                    >
                      <option value="">Not recorded</option>
                      <option value="eBay">eBay</option>
                      <option value="Vinted">Vinted</option>
                      <option value="Etsy">Etsy</option>
                      <option value="Depop">Depop</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="inventory-modal-section inventory-modal-full">
                <h3>Fees and profit</h3>
                <div className="inventory-modal-section-grid">
                  <label>
                    Shipping cost
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingCost}
                      onChange={(event) =>
                        setShippingCost(event.target.value)
                      }
                      disabled={submitting}
                      placeholder="0.00"
                    />
                  </label>

                  <label>
                    Platform fees
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={platformFees}
                      onChange={(event) =>
                        setPlatformFees(event.target.value)
                      }
                      disabled={submitting}
                      placeholder="0.00"
                    />
                  </label>

                  <label className="inventory-modal-full">
                    Other fees
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={otherFees}
                      onChange={(event) =>
                        setOtherFees(event.target.value)
                      }
                      disabled={submitting}
                      placeholder="0.00"
                    />
                  </label>

                  <div className="inventory-modal-full sold-profit-preview">
                    <span>Estimated profit</span>
                    <strong>{money(profitPreview)}</strong>
                    <p>
                      Purchase price and additional costs are taken from this
                      product automatically.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save sold details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductDetails

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEventColor(type: string): string {
  switch (type) {
    case 'product_created':
      return '#10b981'
    case 'product_updated':
      return '#3b82f6'
    case 'status_changed':
      return '#f59e0b'
    case 'price_changed':
      return '#8b5cf6'
    case 'marketplace_added':
      return '#06b6d4'
    case 'marketplace_removed':
      return '#ef4444'
    case 'relisted':
      return '#ec4899'
    case 'sold':
      return '#22c55e'
    case 'refunded':
      return '#f97316'
    default:
      return '#6b7280'
  }
}

function getEventIcon(type: string): string {
  switch (type) {
    case 'product_created':
      return '+'
    case 'product_updated':
      return '✏'
    case 'status_changed':
      return '↻'
    case 'price_changed':
      return '£'
    case 'marketplace_added':
      return '🏪'
    case 'marketplace_removed':
      return '✕'
    case 'relisted':
      return '🔄'
    case 'sold':
      return '$'
    case 'refunded':
      return '↩'
    default:
      return '●'
  }
}

function BreakdownRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--shq-border)',
        fontSize: '13px',
      }}
    >
      <span style={{ color: 'var(--shq-ink-muted)' }}>{label}</span>
      <strong style={{ fontWeight: strong ? 700 : 500 }}>{value}</strong>
    </div>
  )
}



