import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { useBusiness } from '../hooks/useBusiness'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '../hooks/useToast'
import { useQrRelay } from '../hooks/useQrRelay'
import { useTill } from '../hooks/useTill'
import { appDisplayName } from '../lib/branding'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Product, ProductCondition } from '../types/product'
import type {
  TillBasketItem,
  TillPaymentMethod,
  TillPurchaseItem,
  TillTransaction,
} from '../types/till'

const SOLD_STATUSES = ['Sold', 'In Shipping', 'Returned', 'Archived']

const CONDITION_OPTIONS: ProductCondition[] = [
  'New',
  'New with tags',
  'Very good',
  'Good',
  'Satisfactory',
  'For parts / not working',
]

const BUY_FIELD_STYLE: CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--shq-border)',
  borderRadius: 8,
  fontSize: 14,
  background: 'var(--shq-bg)',
  color: 'var(--shq-ink)',
}

function canSell(product: Product): boolean {
  return !SOLD_STATUSES.includes(product.status) && product.quantity > 0
}

function resolveScannedProduct(
  payload: string,
  products: Product[],
): Product | null {
  const match = payload.match(/\/products\/([^/?#]+)/)
  if (match) {
    const id = decodeURIComponent(match[1])
    const byId = products.find((p) => p.id === id)
    if (byId) return byId
  }

  const trimmed = payload.trim().toLowerCase()
  if (!trimmed) return null

  return (
    products.find((p) => p.barcode && p.barcode.toLowerCase() === trimmed) ||
    products.find((p) => p.code.toLowerCase() === trimmed) ||
    products.find((p) => p.sku && p.sku.toLowerCase() === trimmed) ||
    null
  )
}

function Till() {
  const navigate = useNavigate()
  const { currentBusiness } = useBusiness()
  const { products } = useProducts()
  const { settings } = useSettings()
  const { canUse } = useSubscription()
  const { money } = useCurrency()
  const { showToast } = useToast()
  const { listening, listen, stop } = useQrRelay()
  const {
    session,
    transactions,
    holds,
    loading,
    openSession,
    closeSession,
    completeTransaction,
    completePurchase,
    voidTransaction,
    holdOrder,
    deleteHold,
  } = useTill()

  const [now, setNow] = useState(() => new Date())
  const [mode, setMode] = useState<'sale' | 'purchase'>('sale')
  const [search, setSearch] = useState('')
  const [basket, setBasket] = useState<TillBasketItem[]>([])
  const [discountInput, setDiscountInput] = useState('')
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>(
    'amount',
  )
  const [floatInput, setFloatInput] = useState('')
  const [opening, setOpening] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [countedInput, setCountedInput] = useState('')
  const [closing, setClosing] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<TillPaymentMethod>('cash')
  const [tenderedInput, setTenderedInput] = useState('')
  const [paying, setPaying] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<TillTransaction | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [voidTarget, setVoidTarget] = useState<TillTransaction | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [buyBasket, setBuyBasket] = useState<TillPurchaseItem[]>([])
  const [clientName, setClientName] = useState('')
  const [buyName, setBuyName] = useState('')
  const [buyBrand, setBuyBrand] = useState('')
  const [buyCategory, setBuyCategory] = useState('')
  const [buySize, setBuySize] = useState('')
  const [buyColour, setBuyColour] = useState('')
  const [buyCondition, setBuyCondition] = useState<ProductCondition>('Good')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyQty, setBuyQty] = useState('1')

  const businessId = currentBusiness?.id
  const taxRate = settings.till.taxRate || 0

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const scanHandlerRef = useRef<(payload: string) => void>(() => {})
  scanHandlerRef.current = (payload: string) => {
    if (mode !== 'sale') return
    const product = resolveScannedProduct(payload, products)
    if (product) {
      addToBasket(product)
    } else {
      showToast('Scanned code not found in inventory', 'error')
    }
  }

  useEffect(() => {
    if (!businessId) return
    listen(businessId, (payload) => scanHandlerRef.current(payload))
    return () => stop()
  }, [businessId, listen, stop])

  const availableProducts = useMemo(
    () => products.filter(canSell),
    [products],
  )

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return availableProducts
      .filter((p) =>
        [p.code, p.name, p.brand, p.sku, p.category, p.barcode]
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 20)
  }, [availableProducts, search])

  function addToBasket(product: Product) {
    if (!canSell(product)) {
      showToast('This product is not available to sell', 'error')
      return
    }
    setBasket((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) {
          showToast(`Only ${product.quantity} in stock`, 'error')
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.listingPrice || product.purchasePrice,
          quantity: 1,
          stockLimit: product.quantity,
        },
      ]
    })
    setSearch('')
  }

  function addCustomItem() {
    const name = customName.trim()
    const price = Number(customPrice)
    if (!name) {
      showToast('Enter a name for the item', 'error')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast('Enter a valid price', 'error')
      return
    }
    setBasket((prev) => [
      ...prev,
      {
        productId: null,
        name,
        unitPrice: price,
        quantity: 1,
        stockLimit: Number.POSITIVE_INFINITY,
      },
    ])
    setCustomName('')
    setCustomPrice('')
  }

  function addBuyItem() {
    const name = buyName.trim()
    const price = Number(buyPrice)
    const quantity = Math.floor(Number(buyQty))
    if (!name) {
      showToast('Enter a name for the item', 'error')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast('Enter a valid purchase price', 'error')
      return
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      showToast('Enter a valid quantity', 'error')
      return
    }
    setBuyBasket((prev) => [
      ...prev,
      {
        name,
        brand: buyBrand.trim(),
        category: buyCategory.trim(),
        size: buySize.trim(),
        colour: buyColour.trim(),
        condition: buyCondition,
        purchasePrice: price,
        quantity,
      },
    ])
    setBuyName('')
    setBuyBrand('')
    setBuyCategory('')
    setBuySize('')
    setBuyColour('')
    setBuyPrice('')
    setBuyQty('1')
  }

  function updateBuyPrice(index: number, value: string) {
    const price = Number(value)
    if (!Number.isFinite(price) || price < 0) return
    setBuyBasket((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, purchasePrice: price } : item,
      ),
    )
  }

  function updateBuyQuantity(index: number, delta: number) {
    setBuyBasket((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const next = Math.max(1, item.quantity + delta)
        return { ...item, quantity: next }
      }),
    )
  }

  function removeBuyLine(index: number) {
    setBuyBasket((prev) => prev.filter((_, i) => i !== index))
  }

  function updateQuantity(index: number, delta: number) {
    setBasket((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const next = Math.max(1, item.quantity + delta)
        const capped = Math.min(next, item.stockLimit)
        return { ...item, quantity: capped }
      }),
    )
  }

  function updatePrice(index: number, value: string) {
    const price = Number(value)
    if (!Number.isFinite(price) || price < 0) return
    setBasket((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitPrice: price } : item)),
    )
  }

  function removeLine(index: number) {
    setBasket((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = useMemo(() => {
    const subtotal = basket.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    )
    const discountAmount =
      discountType === 'percent'
        ? (subtotal * (Number(discountInput) || 0)) / 100
        : Number(discountInput) || 0
    const taxableBase = Math.max(0, subtotal - discountAmount)
    const tax = (taxableBase * taxRate) / 100
    const total = taxableBase + tax
    return { subtotal, discountAmount, tax, total }
  }, [basket, discountInput, discountType, taxRate])

  const buyTotal = useMemo(
    () =>
      buyBasket.reduce(
        (sum, item) => sum + item.purchasePrice * item.quantity,
        0,
      ),
    [buyBasket],
  )

  const tendered = Number(tenderedInput) || 0
  const changeDue = Math.max(0, tendered - totals.total)

  async function handleOpenSession(floatOverride?: number) {
    if (!businessId) return
    const float = floatOverride ?? (Number(floatInput) || 0)
    setOpening(true)
    try {
      await openSession(float)
      showToast('Till opened', 'success')
    } catch {
      showToast('Could not open the till', 'error')
    } finally {
      setOpening(false)
    }
  }

  async function handleCloseSession() {
    const counted = Number(countedInput) || 0
    setClosing(true)
    try {
      const expected =
        (session?.startingFloat ?? 0) +
        transactions
          .filter(
            (t) =>
              t.status === 'completed' &&
              t.direction === 'sale' &&
              t.paymentMethod === 'cash',
          )
          .reduce((sum, t) => sum + t.total, 0) -
        transactions
          .filter(
            (t) =>
              t.status === 'completed' &&
              t.direction === 'purchase' &&
              t.paymentMethod === 'cash',
          )
          .reduce((sum, t) => sum + t.total, 0)
      await closeSession(counted)
      const variance = counted - expected
      setCloseOpen(false)
      showToast(
        variance === 0
          ? 'Till closed — cash balanced'
          : `Till closed — variance ${money(variance)}`,
        variance === 0 ? 'success' : 'error',
      )
    } catch {
      showToast('Could not close the till', 'error')
    } finally {
      setClosing(false)
    }
  }

  async function handleCharge() {
    if (basket.length === 0) {
      showToast('Add items to the basket first', 'error')
      return
    }
    setPaying(true)
    try {
      const transaction = await completeTransaction({
        items: basket,
        discount: totals.discountAmount,
        tax: totals.tax,
        paymentMethod,
        amountTendered: paymentMethod === 'cash' ? tendered : totals.total,
      })
      setLastReceipt(transaction)
      setBasket([])
      setDiscountInput('')
      setTenderedInput('')
      setPaymentOpen(false)
    } catch {
      showToast('Could not complete the sale', 'error')
    } finally {
      setPaying(false)
    }
  }

  async function handlePay() {
    if (buyBasket.length === 0) {
      showToast('Add items to the purchase first', 'error')
      return
    }
    setPaying(true)
    try {
      const transaction = await completePurchase({
        items: buyBasket,
        paymentMethod,
        clientName: clientName.trim(),
      })
      setLastReceipt(transaction)
      setBuyBasket([])
      setClientName('')
      setPaymentOpen(false)
    } catch (err) {
      showToast(
        err instanceof Error && err.message
          ? err.message
          : 'Could not complete the purchase',
        'error',
      )
    } finally {
      setPaying(false)
    }
  }

  async function handleHoldOrder() {
    if (basket.length === 0) return
    try {
      await holdOrder({
        items: basket,
        discount: totals.discountAmount,
        tax: totals.tax,
        total: totals.total,
      })
      setBasket([])
      setDiscountInput('')
      showToast('Order held', 'success')
    } catch {
      showToast('Could not hold the order', 'error')
    }
  }

  function resumeHold(id: string) {
    const hold = holds.find((h) => h.id === id)
    if (!hold) return
    const restored = hold.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      return {
        productId: item.productId,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        stockLimit: product ? product.quantity : Number.POSITIVE_INFINITY,
      }
    })
    setBasket(restored)
    void deleteHold(id)
  }

  async function handleVoid() {
    if (!voidTarget) return
    setVoiding(true)
    try {
      await voidTransaction(voidTarget.id, voidReason.trim() || 'No reason given')
      setVoidTarget(null)
      setVoidReason('')
      showToast('Transaction voided', 'success')
    } catch {
      showToast('Could not void the transaction', 'error')
    } finally {
      setVoiding(false)
    }
  }

  function openReceiptWindow(transaction: TillTransaction) {
    const win = window.open('', '_blank', 'width=400,height=640')
    if (!win) return
    const isPurchase = transaction.direction === 'purchase'
    const line = (label: string, value: string) =>
      `<div style="display:flex;justify-content:space-between;margin:2px 0;font-size:13px"><span>${label}</span><span>${value}</span></div>`
    const rows = transaction.items
      .map(
        (item) => `
        <div style="margin:8px 0;font-size:13px">
          <div style="font-weight:600">${escapeHtml(item.name)}</div>
          ${line(`${item.quantity} × ${money(item.unitPrice)}`, money(item.lineTotal))}
        </div>`,
      )
      .join('')
    const header = isPurchase
      ? `<p class="muted">Purchase receipt<br>Bought from ${escapeHtml(transaction.clientName ?? 'client')}<br>${new Date(transaction.createdAt).toLocaleString('en-GB')}</p>`
      : `<p class="muted">${new Date(transaction.createdAt).toLocaleString('en-GB')}</p>`
    const summary = isPurchase
      ? `${line('Subtotal', money(transaction.subtotal))}
      ${line('Total paid (' + transaction.paymentMethod + ')', money(transaction.total))}`
      : `${line('Subtotal', money(transaction.subtotal))}
      ${transaction.discount > 0 ? line('Discount', '-' + money(transaction.discount)) : ''}
      ${transaction.tax > 0 ? line('Tax', money(transaction.tax)) : ''}
      ${line('Total', money(transaction.total))}
      ${line('Paid (' + transaction.paymentMethod + ')', money(transaction.amountTendered))}
      ${transaction.changeDue > 0 ? line('Change', money(transaction.changeDue)) : ''}`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>
      <style>
        body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:24px;color:#17191c;max-width:340px;margin:0 auto}
        h1{font-size:18px;margin:0 0 4px;text-align:center}
        .muted{color:#6b7280;font-size:12px;text-align:center;margin:0 0 16px;white-space:pre-wrap}
        .divider{border-top:1px dashed #c9cdd3;margin:12px 0}
        .total{font-size:16px;font-weight:700}
        .footer{text-align:center;color:#6b7280;font-size:12px;margin-top:20px;white-space:pre-wrap}
      </style></head><body>
      <h1>${escapeHtml(currentBusiness?.name ?? '')}</h1>
      ${header}
      <div class="divider"></div>
      ${rows}
      <div class="divider"></div>
      ${summary}
      <div class="divider"></div>
      <div class="total">${line(isPurchase ? 'Total paid' : 'Total', money(transaction.total))}</div>
      ${settings.till.receiptFooter ? `<div class="footer">${escapeHtml(settings.till.receiptFooter)}</div>` : ''}
      <script>window.onload=function(){window.print()}</script>
      </body></html>`
    win.document.write(html)
    win.document.close()
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  if (!canUse('tillMode')) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Upgrade to Business</h1>
        <p style={{ fontSize: 14, color: 'var(--shq-ink-muted)', lineHeight: 1.6 }}>
          Till Mode is included in the Business plan.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="inventory-loading" style={{ minHeight: '60vh' }}>
        <div className="inventory-spinner" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 20px',
          borderBottom: '1px solid var(--shq-border)',
          background: 'var(--shq-surface)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/dashboard')}
          >
            ← Exit till
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
              {appDisplayName(currentBusiness)} · Till
            </div>
            <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)' }}>
              {now.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              · {now.toLocaleTimeString('en-GB')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {session && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--shq-success-bg)',
                color: 'var(--shq-success-text, #16a34a)',
              }}
            >
              Float {money(session.startingFloat)}
            </span>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowHistory(true)}
          >
            History ({transactions.length})
          </button>
          {session ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setCountedInput('')
                setCloseOpen(true)
              }}
            >
              Close till
            </button>
          ) : null}
        </div>
      </header>

      {/* Open till screen */}
      {!session ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: 'var(--shq-surface)',
              border: '1px solid var(--shq-border)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>
              Open the till
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--shq-ink-muted)' }}>
              Enter the starting cash float to begin a till session. Sales,
              receipts and cash reconciliation are tracked against this session.
            </p>
            <label style={{ display: 'block', textAlign: 'left', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
              Starting float
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={floatInput}
              onChange={(e) => setFloatInput(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--shq-border)',
                borderRadius: 8,
                fontSize: 18,
                background: 'var(--shq-bg)',
                color: 'var(--shq-ink)',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="secondary-button"
                style={{ flex: 1 }}
                onClick={() => void handleOpenSession(0)}
                disabled={opening}
              >
                Quick start
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ flex: 1 }}
                onClick={() => void handleOpenSession()}
                disabled={opening}
              >
                {opening ? 'Opening…' : 'Open till'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', gap: 20, padding: 20, minHeight: 0 }}>
          {/* Left: item entry */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={mode === 'sale' ? 'primary-button' : 'secondary-button'}
                style={{ flex: 1 }}
                onClick={() => setMode('sale')}
              >
                Sell to customer
              </button>
              <button
                type="button"
                className={
                  mode === 'purchase' ? 'primary-button' : 'secondary-button'
                }
                style={{ flex: 1 }}
                onClick={() => setMode('purchase')}
              >
                Buy from client
              </button>
            </div>

            {mode === 'sale' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative' }}>
              <input
                type="search"
                placeholder="Scan or search by name, code, SKU, barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid var(--shq-border)',
                  borderRadius: 10,
                  fontSize: 16,
                  background: 'var(--shq-bg)',
                  color: 'var(--shq-ink)',
                }}
              />
              {search.trim().length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 20,
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: 'var(--shq-surface)',
                    border: '1px solid var(--shq-border)',
                    borderRadius: 10,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
                  {searchResults.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 13, color: 'var(--shq-ink-muted)' }}>
                      No products match "{search}".
                    </div>
                  ) : (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addToBasket(p)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          borderBottom: '1px solid var(--shq-border)',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                            {p.code} · {p.brand || 'No brand'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600 }}>
                            {money(p.listingPrice || p.purchasePrice)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--shq-ink-muted)' }}>
                            {p.quantity} in stock
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Custom item name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{
                    flex: 2,
                    padding: '10px 12px',
                    border: '1px solid var(--shq-border)',
                    borderRadius: 8,
                    fontSize: 14,
                    background: 'var(--shq-bg)',
                    color: 'var(--shq-ink)',
                  }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  style={{
                    width: 120,
                    padding: '10px 12px',
                    border: '1px solid var(--shq-border)',
                    borderRadius: 8,
                    fontSize: 14,
                    background: 'var(--shq-bg)',
                    color: 'var(--shq-ink)',
                  }}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={addCustomItem}
                >
                  Add
                </button>
              </div>
            </div>
            ) : (
              <div
                style={{
                  background: 'var(--shq-surface)',
                  border: '1px solid var(--shq-border)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  New item — added to inventory as unlisted
                </div>
                <input
                  type="text"
                  placeholder="Item name *"
                  value={buyName}
                  onChange={(e) => setBuyName(e.target.value)}
                  style={BUY_FIELD_STYLE}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Brand"
                    value={buyBrand}
                    onChange={(e) => setBuyBrand(e.target.value)}
                    style={BUY_FIELD_STYLE}
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={buyCategory}
                    onChange={(e) => setBuyCategory(e.target.value)}
                    style={BUY_FIELD_STYLE}
                  />
                  <input
                    type="text"
                    placeholder="Size"
                    value={buySize}
                    onChange={(e) => setBuySize(e.target.value)}
                    style={BUY_FIELD_STYLE}
                  />
                  <input
                    type="text"
                    placeholder="Colour"
                    value={buyColour}
                    onChange={(e) => setBuyColour(e.target.value)}
                    style={BUY_FIELD_STYLE}
                  />
                  <select
                    value={buyCondition}
                    onChange={(e) =>
                      setBuyCondition(e.target.value as ProductCondition)
                    }
                    style={BUY_FIELD_STYLE}
                  >
                    {CONDITION_OPTIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Purchase price *"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    style={BUY_FIELD_STYLE}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Quantity"
                    value={buyQty}
                    onChange={(e) => setBuyQty(e.target.value)}
                    style={BUY_FIELD_STYLE}
                  />
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={addBuyItem}
                >
                  Add to purchase
                </button>
              </div>
            )}

            {mode === 'sale' ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                background: 'var(--shq-surface)',
                border: '1px solid var(--shq-border)',
                borderRadius: 12,
                padding: 12,
              }}
            >
              {basket.length === 0 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--shq-ink-muted)', fontSize: 14 }}>
                  {listening ? 'Waiting for a scan from your phone…' : 'No items. Search or scan to add.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {basket.map((item, index) => (
                    <div
                      key={`${item.productId ?? 'custom'}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        border: '1px solid var(--shq-border)',
                        borderRadius: 10,
                        background: 'var(--shq-bg)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--shq-ink-muted)' }}>
                          {item.productId ? 'Inventory item' : 'Custom item'}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updatePrice(index, e.target.value)}
                        style={{
                          width: 90,
                          padding: '6px 8px',
                          border: '1px solid var(--shq-border)',
                          borderRadius: 6,
                          fontSize: 13,
                          background: 'var(--shq-surface)',
                          color: 'var(--shq-ink)',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: '2px 10px', fontSize: 16 }}
                          onClick={() => updateQuantity(index, -1)}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: '2px 10px', fontSize: 16 }}
                          onClick={() => updateQuantity(index, 1)}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ width: 80, textAlign: 'right', fontWeight: 700 }}>
                        {money(item.unitPrice * item.quantity)}
                      </div>
                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => removeLine(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setBasket([])
                      setDiscountInput('')
                    }}
                  >
                    Clear basket
                  </button>
                </div>
              )}
            </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  background: 'var(--shq-surface)',
                  border: '1px solid var(--shq-border)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                {buyBasket.length === 0 ? (
                  <div
                    style={{
                      padding: '48px 16px',
                      textAlign: 'center',
                      color: 'var(--shq-ink-muted)',
                      fontSize: 14,
                    }}
                  >
                    No items yet. Enter the client's items above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {buyBasket.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          border: '1px solid var(--shq-border)',
                          borderRadius: 10,
                          background: 'var(--shq-bg)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--shq-ink-muted)' }}>
                            {[
                              item.brand,
                              item.category,
                              item.size,
                              item.colour,
                              item.condition,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'No details'}
                          </div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.purchasePrice}
                          onChange={(e) => updateBuyPrice(index, e.target.value)}
                          style={{
                            width: 90,
                            padding: '6px 8px',
                            border: '1px solid var(--shq-border)',
                            borderRadius: 6,
                            fontSize: 13,
                            background: 'var(--shq-surface)',
                            color: 'var(--shq-ink)',
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: '2px 10px', fontSize: 16 }}
                            onClick={() => updateBuyQuantity(index, -1)}
                          >
                            −
                          </button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: '2px 10px', fontSize: 16 }}
                            onClick={() => updateBuyQuantity(index, 1)}
                          >
                            +
                          </button>
                        </div>
                        <div style={{ width: 80, textAlign: 'right', fontWeight: 700 }}>
                          {money(item.purchasePrice * item.quantity)}
                        </div>
                        <button
                          type="button"
                          className="row-action-link"
                          onClick={() => removeBuyLine(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setBuyBasket([])}
                    >
                      Clear purchase
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: totals + payment */}
          <div
            style={{
              width: 340,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {mode === 'sale' ? (
              <>
            <div
              style={{
                background: 'var(--shq-surface)',
                border: '1px solid var(--shq-border)',
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>Items</span>
                <strong>{basket.reduce((sum, i) => sum + i.quantity, 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 8 }}>
                <span>Subtotal</span>
                <strong>{money(totals.subtotal)}</strong>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                    style={{
                      padding: '8px 10px',
                      border: '1px solid var(--shq-border)',
                      borderRadius: 8,
                      fontSize: 13,
                      background: 'var(--shq-bg)',
                      color: 'var(--shq-ink)',
                    }}
                  >
                    <option value="amount">Fixed</option>
                    <option value="percent">%</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Discount"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: '1px solid var(--shq-border)',
                      borderRadius: 8,
                      fontSize: 13,
                      background: 'var(--shq-bg)',
                      color: 'var(--shq-ink)',
                    }}
                  />
                </div>
                {totals.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8, color: 'var(--shq-ink-muted)' }}>
                    <span>Discount</span>
                    <span>-{money(totals.discountAmount)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8, color: 'var(--shq-ink-muted)' }}>
                    <span>Tax ({taxRate}%)</span>
                    <span>{money(totals.tax)}</span>
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 22,
                  fontWeight: 700,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid var(--shq-border)',
                }}
              >
                <span>Total</span>
                <span>{money(totals.total)}</span>
              </div>

              <button
                type="button"
                className="primary-button"
                style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 16, fontWeight: 700 }}
                onClick={() => {
                  setPaymentMethod('cash')
                  setTenderedInput(totals.total.toFixed(2))
                  setPaymentOpen(true)
                }}
                disabled={basket.length === 0}
              >
                Charge {money(totals.total)}
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ width: '100%', marginTop: 10 }}
                onClick={handleHoldOrder}
                disabled={basket.length === 0}
              >
                Hold order
              </button>
            </div>

            {holds.length > 0 && (
              <div
                style={{
                  background: 'var(--shq-surface)',
                  border: '1px solid var(--shq-border)',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>
                  Held orders ({holds.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {holds.map((hold) => (
                    <div
                      key={hold.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '8px 10px',
                        border: '1px solid var(--shq-border)',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {hold.items.length} items · {money(hold.total)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--shq-ink-muted)' }}>
                          {new Date(hold.createdAt).toLocaleTimeString('en-GB')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="row-action-link"
                          onClick={() => resumeHold(hold.id)}
                        >
                          Resume
                        </button>
                        <button
                          type="button"
                          className="row-action-link"
                          onClick={() => void deleteHold(hold.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            ) : (
              <div
                style={{
                  background: 'var(--shq-surface)',
                  border: '1px solid var(--shq-border)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Client name
                </label>
                <input
                  type="text"
                  placeholder="Who are you buying from?"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{ ...BUY_FIELD_STYLE, width: '100%', marginBottom: 16 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>Items</span>
                  <strong>{buyBasket.reduce((sum, i) => sum + i.quantity, 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 8 }}>
                  <span>Subtotal</span>
                  <strong>{money(buyTotal)}</strong>
                </div>
                <div style={{ fontSize: 11, color: 'var(--shq-ink-muted)', marginTop: 8 }}>
                  Items are added to inventory as unlisted when paid.
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 22,
                    fontWeight: 700,
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid var(--shq-border)',
                  }}
                >
                  <span>Total</span>
                  <span>{money(buyTotal)}</span>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 16, fontWeight: 700 }}
                  onClick={() => {
                    setPaymentMethod('cash')
                    setPaymentOpen(true)
                  }}
                  disabled={buyBasket.length === 0}
                >
                  Pay {money(buyTotal)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment modal */}
      {paymentOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 420, padding: 24 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
              {mode === 'purchase' ? 'Pay client' : 'Payment'}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--shq-ink-muted)' }}>
              {mode === 'purchase'
                ? `Total to pay ${money(buyTotal)}`
                : `Total ${money(totals.total)}`}
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['cash', 'card', 'other'] as TillPaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  className={paymentMethod === method ? 'primary-button' : 'secondary-button'}
                  style={{ flex: 1, textTransform: 'capitalize' }}
                  onClick={() => {
                    setPaymentMethod(method)
                    if (method === 'cash' && mode === 'sale') {
                      setTenderedInput(totals.total.toFixed(2))
                    }
                  }}
                >
                  {method}
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && mode === 'sale' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Amount tendered
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tenderedInput}
                  onChange={(e) => setTenderedInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--shq-border)',
                    borderRadius: 8,
                    fontSize: 20,
                    background: 'var(--shq-bg)',
                    color: 'var(--shq-ink)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 15 }}>
                  <span>Change due</span>
                  <strong>{money(changeDue)}</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPaymentOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={mode === 'purchase' ? handlePay : handleCharge}
                disabled={
                  paying ||
                  (mode === 'sale' && paymentMethod === 'cash' && tendered < totals.total)
                }
              >
                {paying
                  ? 'Processing…'
                  : mode === 'purchase'
                    ? `Pay ${money(buyTotal)}`
                    : `Confirm ${money(totals.total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {lastReceipt && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 380, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
              {lastReceipt.direction === 'purchase'
                ? 'Purchase complete'
                : 'Sale complete'}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 26, fontWeight: 700 }}>
              {money(lastReceipt.total)}
            </p>
            {lastReceipt.direction === 'purchase' ? (
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--shq-ink-muted)' }}>
                Paid to {lastReceipt.clientName ?? 'client'} · items added to
                inventory as unlisted
              </p>
            ) : (
              lastReceipt.changeDue > 0 && (
                <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--shq-ink-muted)' }}>
                  Change {money(lastReceipt.changeDue)}
                </p>
              )
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setLastReceipt(null)}
              >
                {lastReceipt.direction === 'purchase' ? 'New purchase' : 'New sale'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => openReceiptWindow(lastReceipt)}
              >
                Print receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 560, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Session history</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowHistory(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {transactions.length === 0 ? (
              <p style={{ color: 'var(--shq-ink-muted)', fontSize: 14 }}>
                No transactions yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      border: '1px solid var(--shq-border)',
                      borderRadius: 10,
                      opacity: t.status === 'voided' ? 0.6 : 1,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {t.direction === 'purchase'
                          ? `Paid ${money(t.total)}`
                          : money(t.total)}{' '}
                        <span style={{ textTransform: 'capitalize', fontWeight: 400, fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                          · {t.paymentMethod}
                          {t.direction === 'purchase' &&
                            ` · From ${t.clientName ?? 'client'}`}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--shq-ink-muted)' }}>
                        {new Date(t.createdAt).toLocaleTimeString('en-GB')} · {t.items.length} item{t.items.length === 1 ? '' : 's'}
                        {t.direction === 'purchase' && ' · Buy-in'}
                        {t.status === 'voided' && ` · Voided: ${t.voidReason ?? ''}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => openReceiptWindow(t)}
                      >
                        Receipt
                      </button>
                      {t.status === 'completed' && (
                        <button
                          type="button"
                          className="row-action-link"
                          onClick={() => {
                            setVoidTarget(t)
                            setVoidReason('')
                            setShowHistory(false)
                          }}
                        >
                          Void
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close till modal */}
      {closeOpen && session && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 420, padding: 24 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Close the till</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--shq-ink-muted)' }}>
              Count the cash drawer and enter the amount below.
            </p>
            {(() => {
              const expected =
                session.startingFloat +
                transactions
                  .filter(
                    (t) =>
                      t.status === 'completed' &&
                      t.direction === 'sale' &&
                      t.paymentMethod === 'cash',
                  )
                  .reduce((sum, t) => sum + t.total, 0) -
                transactions
                  .filter(
                    (t) =>
                      t.status === 'completed' &&
                      t.direction === 'purchase' &&
                      t.paymentMethod === 'cash',
                  )
                  .reduce((sum, t) => sum + t.total, 0)
              const counted = Number(countedInput) || 0
              const variance = counted - expected
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>Expected cash</span>
                    <strong>{money(expected)}</strong>
                  </div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    Counted cash
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedInput}
                    onChange={(e) => setCountedInput(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid var(--shq-border)',
                      borderRadius: 8,
                      fontSize: 20,
                      background: 'var(--shq-bg)',
                      color: 'var(--shq-ink)',
                    }}
                  />
                  {countedInput !== '' && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        background: variance === 0 ? 'var(--shq-success-bg)' : 'var(--shq-error-bg)',
                        color: variance === 0 ? 'var(--shq-success-text, #16a34a)' : 'var(--shq-error-text)',
                      }}
                    >
                      Variance {variance === 0 ? 'balanced' : money(variance)}
                    </div>
                  )}
                </div>
              )
            })()}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCloseOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleCloseSession}
                disabled={closing}
              >
                {closing ? 'Closing…' : 'Close till'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void confirm */}
      <ConfirmDialog
        open={voidTarget !== null}
        title="Void this transaction?"
        variant="danger"
        confirmLabel={voiding ? 'Voiding…' : 'Void transaction'}
        message={
          voidTarget ? (
            <div>
              {voidTarget.direction === 'purchase' ? (
                <p style={{ margin: '0 0 12px' }}>
                  Voiding this <strong>{money(voidTarget.total)}</strong> purchase
                  from <strong>{voidTarget.clientName ?? 'client'}</strong> will
                  remove the items added to inventory and mark the transaction as
                  voided. This cannot be undone.
                </p>
              ) : (
                <p style={{ margin: '0 0 12px' }}>
                  Voiding <strong>{money(voidTarget.total)}</strong> will restock the
                  sold inventory and mark the transaction as voided. This cannot be undone.
                </p>
              )}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Reason
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason for void"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--shq-border)',
                  borderRadius: 6,
                  fontSize: 13,
                  background: 'var(--shq-bg)',
                  color: 'var(--shq-ink)',
                }}
              />
            </div>
          ) : null
        }
        onConfirm={handleVoid}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  )
}

export default Till
