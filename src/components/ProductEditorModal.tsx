import { useRef, useState, type DragEvent, type FormEvent } from 'react'

import type {
  Marketplace,
  ProductCondition,
  ProductDraft,
  ProductStatus,
} from '../types/product'
import { uploadProductPhoto } from '../lib/storage'
import { generateProductCode } from '../lib/productDraft'
import { uuid } from '../utils/uuid'
import { useSubscription } from '../hooks/useSubscription'

const marketplaceOptions: Marketplace[] = [
  'eBay',
  'Vinted',
  'Etsy',
  'Depop',
]

const conditionOptions: ProductCondition[] = [
  'New',
  'New with tags',
  'Very good',
  'Good',
  'Satisfactory',
  'For parts / not working',
]

const statusOptions: ProductStatus[] = [
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
]

type ProductEditorModalProps = {
  title: string
  description: string
  submitLabel: string
  initialProduct: ProductDraft
  onClose: () => void
  onSubmit: (product: ProductDraft) => Promise<void>
}

export function ProductEditorModal({
  title,
  description,
  submitLabel,
  initialProduct,
  onClose,
  onSubmit,
}: ProductEditorModalProps) {
  const { canUse } = useSubscription()

  const [code, setCode] = useState(initialProduct.code)
  const [sku, setSku] = useState(initialProduct.sku)
  const [name, setName] = useState(initialProduct.name)
  const [brand, setBrand] = useState(initialProduct.brand)
  const [category, setCategory] = useState(
    initialProduct.category,
  )
  const [size, setSize] = useState(initialProduct.size)
  const [colour, setColour] = useState(
    initialProduct.colour,
  )
  const [condition, setCondition] = useState(
    initialProduct.condition,
  )
  const [descriptionText, setDescriptionText] =
    useState(initialProduct.description)

  const [purchasePrice, setPurchasePrice] = useState(
    initialProduct.purchasePrice.toString(),
  )
  const [purchaseDate, setPurchaseDate] = useState(
    initialProduct.purchaseDate ?? '',
  )
  const [purchaseSource, setPurchaseSource] =
    useState(initialProduct.purchaseSource)
  const [quantity, setQuantity] = useState(
    String(initialProduct.quantity ?? 1),
  )
  const [reorderLevel, setReorderLevel] = useState(
    String(initialProduct.reorderLevel ?? 0),
  )
  const [customFields, setCustomFields] = useState<
    { key: string; value: string }[]
  >(
    Object.entries(initialProduct.customFields ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
  )

  const [storageLocation, setStorageLocation] = useState(
    initialProduct.storageLocation,
  )
  const [barcode, setBarcode] = useState(
    initialProduct.barcode ?? '',
  )
  const [labelsText, setLabelsText] = useState(
    (initialProduct.labels || []).join(', '),
  )
  const [photosText, setPhotosText] = useState(
    initialProduct.photos.join('\n'),
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [status, setStatus] = useState(initialProduct.status)
  const [selectedMarketplaces, setSelectedMarketplaces] =
    useState<Marketplace[]>(initialProduct.marketplaces)
  const [listingPrice, setListingPrice] = useState(
    initialProduct.listingPrice.toString(),
  )
  const [listingDate, setListingDate] = useState(
    initialProduct.listingDate ?? '',
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const skuLockedRef = useRef(false)
  const previousCodeRef = useRef(initialProduct.code)

  const photos = photosText
    .split('\n')
    .map((photo: string) => photo.trim())
    .filter(Boolean)

  const labels = labelsText
    .split(',')
    .map((label: string) => label.trim())
    .filter(Boolean)

  const numericPurchasePrice = Number(purchasePrice)
  const numericListingPrice = Number(listingPrice)

  function toggleMarketplace(marketplace: Marketplace) {
    setSelectedMarketplaces((current: Marketplace[]) =>
      current.includes(marketplace)
        ? current.filter((item) => item !== marketplace)
        : [...current, marketplace],
    )
  }

  function handleStatusChange(nextStatus: ProductStatus) {
    setStatus(nextStatus)

    if (nextStatus === 'Listed' && !listingDate) {
      setListingDate(new Date().toISOString().split('T')[0])
    }
  }

  function handleCodeChange(value: string) {
    setCode(value)

    if (!skuLockedRef.current || sku === previousCodeRef.current) {
      setSku(value)
    }

    previousCodeRef.current = value
  }

  function handleSkuChange(value: string) {
    skuLockedRef.current = true
    setSku(value)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    const resolvedCode =
      code.trim() || initialProduct.code || generateProductCode()
    const resolvedSku = sku.trim() || resolvedCode
    const resolvedName = name.trim() || 'New product'
    const resolvedCategory =
      category.trim() || 'Uncategorised'
    const resolvedPurchasePrice = Number.isFinite(
      numericPurchasePrice,
    )
      ? numericPurchasePrice
      : 0
    const resolvedListingPrice = Number.isFinite(
      numericListingPrice,
    )
      ? numericListingPrice
      : 0

    if (resolvedPurchasePrice < 0 || resolvedListingPrice < 0) {
      setError(
        'Purchase price and listing price must be zero or higher.',
      )
      return
    }

    setSubmitting(true)

    try {
      await onSubmit({
        ...initialProduct,
        code: resolvedCode,
        sku: resolvedSku,
        name: resolvedName,
        brand: brand.trim(),
        category: resolvedCategory,
        size: size.trim(),
        colour: colour.trim(),
        condition,
        description: descriptionText.trim(),
        purchasePrice: resolvedPurchasePrice,
        purchaseDate: purchaseDate || null,
        purchaseSource: purchaseSource.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        reorderLevel: Math.max(0, Number(reorderLevel) || 0),
        storageLocation: storageLocation.trim(),
        barcode: barcode.trim(),
        photos,
        labels,
        customFields: Object.fromEntries(
          customFields
            .filter((field) => field.key.trim().length > 0)
            .map((field) => [field.key.trim(), field.value]),
        ),
        status,
        marketplaces: selectedMarketplaces,
        listingPrice: resolvedListingPrice,
        listingDate: listingDate || null,
        updatedAt: new Date().toISOString(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function appendFiles(files: File[]) {
    if (files.length === 0) return

    const uploadedUrls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const photoUrl = await uploadProductPhoto(file, uuid(), i)

      if (photoUrl) {
        uploadedUrls.push(photoUrl)
      } else {
        // Fallback to a local data URL if upload fails
        const fallback = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        uploadedUrls.push(fallback)
      }
    }

    setPhotosText((current: string) =>
      [
        current.trim(),
        ...uploadedUrls,
      ]
        .filter(Boolean)
        .join('\n'),
    )

  }

  async function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? [])
    await appendFiles(files)
    event.target.value = ''
  }

  async function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    await appendFiles(Array.from(event.dataTransfer.files ?? []))
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function removePhoto(indexToRemove: number) {
    setPhotosText((current: string) =>
      current
        .split('\n')
        .map((photo: string) => photo.trim())
        .filter(Boolean)
        .filter((_, index) => index !== indexToRemove)
        .join('\n'),
    )
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-editor-title"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        className="modal inventory-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="product-editor-title">{title}</h2>
            <p>{description}</p>
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
            {error && (
              <div className="inventory-alert">
                {error}
              </div>
            )}

            <div className="inventory-modal-grid">
              <section className="inventory-modal-section inventory-modal-full">
                <h3>Identity</h3>
                <div className="inventory-modal-section-grid">
                  <label>
                    Product ID

                    <input
                      value={code}
                      onChange={(event) =>
                        handleCodeChange(event.target.value)
                      }
                      placeholder="PRD-1001"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    SKU

                    <input
                      value={sku}
                      onChange={(event) =>
                        handleSkuChange(event.target.value)
                      }
                      placeholder="Defaults to the Product ID"
                      disabled={submitting}
                    />
                    <span className="field-hint">
                      Defaults to the Product ID unless you want a custom SKU.
                    </span>
                  </label>

                  <label>
                    Name

                    <input
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      placeholder="e.g. Nike Black Hoodie"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Brand

                    <input
                      value={brand}
                      onChange={(event) =>
                        setBrand(event.target.value)
                      }
                      placeholder="e.g. Nike"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Category

                    <input
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value)
                      }
                      placeholder="e.g. Clothing"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Size

                    <input
                      value={size}
                      onChange={(event) =>
                        setSize(event.target.value)
                      }
                      placeholder="e.g. M"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Colour

                    <input
                      value={colour}
                      onChange={(event) =>
                        setColour(event.target.value)
                      }
                      placeholder="e.g. Black"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Condition

                    <select
                      value={condition}
                      onChange={(event) =>
                        setCondition(
                          event.target
                            .value as ProductCondition,
                        )
                      }
                      disabled={submitting}
                    >
                      {conditionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

            <section className="inventory-modal-section inventory-modal-full">
              <h3>Purchase</h3>
              <div className="inventory-modal-section-grid">
                <label>
                  Purchase price

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(event) =>
                      setPurchasePrice(event.target.value)
                    }
                    placeholder="0.00"
                    disabled={submitting}
                  />
                </label>

                <label>
                  Purchase date

                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(event) =>
                      setPurchaseDate(event.target.value)
                    }
                    disabled={submitting}
                  />
                </label>

                <label>
                  Quantity

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    disabled={submitting}
                  />
                </label>

                <label>
                  Reorder at

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={reorderLevel}
                    onChange={(event) =>
                      setReorderLevel(event.target.value)
                    }
                    placeholder="0 = off"
                    disabled={submitting}
                  />
                </label>

                <label className="inventory-modal-full">
                  Source

                  <input
                    value={purchaseSource}
                    onChange={(event) =>
                      setPurchaseSource(event.target.value)
                    }
                    placeholder="e.g. Car boot sale"
                    disabled={submitting}
                  />
                </label>
              </div>
            </section>

            <section className="inventory-modal-section inventory-modal-full">
              <h3>Storage & Barcode</h3>
              <div className="inventory-modal-section-grid">
                <label>
                  Location

                  <input
                    value={storageLocation}
                    onChange={(event) =>
                      setStorageLocation(event.target.value)
                    }
                    placeholder="e.g. Shelf A3"
                    disabled={submitting}
                  />
                </label>

                <label>
                  Barcode / EAN

                  <input
                    value={barcode}
                    onChange={(event) =>
                      setBarcode(event.target.value)
                    }
                    placeholder="e.g. 5012345678901"
                    disabled={submitting}
                  />
                </label>
              </div>
            </section>

            <section className="inventory-modal-section inventory-modal-full">
              <h3>Labels / Tags</h3>
              <label>
                Custom labels
                <input
                  value={labelsText}
                  onChange={(event) =>
                    setLabelsText(event.target.value)
                  }
                  placeholder="Comma-separated, e.g. clearance, winter, new-arrival"
                  disabled={submitting}
                />
              </label>
              <div className="field-hint">
                Separate multiple labels with commas. Used for filtering and organisation.
              </div>
            </section>

            {canUse('customProductFields') && (
              <section className="inventory-modal-section inventory-modal-full">
                <h3>Custom fields</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customFields.map((field, index) => (
                    <div key={index} style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Field name"
                        value={field.key}
                        onChange={(event) =>
                          setCustomFields((prev) =>
                            prev.map((f, i) =>
                              i === index ? { ...f, key: event.target.value } : f,
                            ),
                          )
                        }
                        disabled={submitting}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={field.value}
                        onChange={(event) =>
                          setCustomFields((prev) =>
                            prev.map((f, i) =>
                              i === index ? { ...f, value: event.target.value } : f,
                            ),
                          )
                        }
                        disabled={submitting}
                        style={{ flex: 2 }}
                      />
                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() =>
                          setCustomFields((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        disabled={submitting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setCustomFields((prev) => [...prev, { key: '', value: '' }])
                    }
                    disabled={submitting}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    + Add field
                  </button>
                </div>
                <div className="field-hint">
                  Add extra product info, e.g. material, era, or condition notes.
                </div>
              </section>
            )}

              <section className="inventory-modal-section inventory-modal-full">
                <h3>Media</h3>

                <div className="photo-uploader">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handleFilesSelected}
                    disabled={submitting}
                  />

                  <button
                    type="button"
                    className="photo-upload-dropzone"
                    onClick={openFilePicker}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    disabled={submitting}
                  >
                    <span className="photo-upload-icon">
                      +
                    </span>

                    <strong>Add photos</strong>

                    <span>
                      Click to upload or drag images here
                    </span>
                  </button>

                  <div className="photo-upload-grid">
                    {photos.length > 0 ? (
                      photos.map((photo: string, index: number) => (
                        <div
                          className="photo-upload-item"
                          key={`${photo}-${index}`}
                        >
                          {photo.startsWith('http') ||
                          photo.startsWith('data:') ? (
                            <img
                              src={photo}
                              alt={`Product photo ${index + 1}`}
                            />
                          ) : (
                            <span>{photo}</span>
                          )}

                          <button
                            type="button"
                            className="photo-remove-button"
                            onClick={() =>
                              removePhoto(index)
                            }
                            disabled={submitting}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="photo-upload-empty">
                        No photos added yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>

            <section className="inventory-modal-section inventory-modal-full">
              <h3>Status</h3>
              <label>
                Product status

                <select
                  value={status}
                  onChange={(event) =>
                    handleStatusChange(
                      event.target.value as ProductStatus,
                    )
                  }
                  disabled={submitting}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </section>

              <section className="inventory-modal-section inventory-modal-full">
                <h3>Listings</h3>
              <div className="inventory-marketplaces">
                <span>Marketplaces</span>

                <div className="inventory-marketplace-options">
                  {marketplaceOptions.map((marketplace) => (
                    <label key={marketplace}>
                      <input
                        type="checkbox"
                        checked={selectedMarketplaces.includes(
                          marketplace,
                        )}
                        onChange={() =>
                          toggleMarketplace(marketplace)
                        }
                        disabled={submitting}
                      />

                      {marketplace}
                    </label>
                  ))}
                </div>
              </div>

              <div className="inventory-modal-section-grid">
                <label>
                  Listing price

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={listingPrice}
                    onChange={(event) =>
                      setListingPrice(event.target.value)
                    }
                    placeholder="0.00"
                    disabled={submitting}
                  />
                </label>

                <label>
                  Listing date

                  <input
                    type="date"
                    value={listingDate}
                    onChange={(event) =>
                      setListingDate(event.target.value)
                    }
                    disabled={submitting}
                  />
                </label>
              </div>
            </section>

            <section className="inventory-modal-section inventory-modal-full">
              <h3>Description</h3>
              <label>
                Notes

                <textarea
                  value={descriptionText}
                  onChange={(event) =>
                    setDescriptionText(event.target.value)
                  }
                  rows={4}
                  placeholder="Optional notes about the item"
                  disabled={submitting}
                />
              </label>
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
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
