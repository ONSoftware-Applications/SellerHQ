import { useMemo, useState } from 'react'

import { useExpenses } from '../hooks/useExpenses'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../types/expense'
import { formatCurrency, formatDate, todayIsoDate, downloadCsv } from '../utils/format'
import type { CurrencyCode } from '../utils/format'
import LoadingState from '../components/LoadingState'
import { FilterBar } from '../components/FilterBar'
import { usePagination, PaginationControls } from '../components/Pagination'
import EmptyState from '../components/EmptyState'

const EMPTY_DRAFT = {
  category: 'Other' as ExpenseCategory,
  description: '',
  amount: '',
  expenseDate: todayIsoDate(),
  marketplace: '',
  supplier: '',
  paymentMethod: '',
  notes: '',
}

function Expenses() {
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses()
  const { products, loading: productsLoading } = useProducts()
  const { settings } = useSettings()
  const { showToast } = useToast()
  const currency = settings.business.defaultCurrency as CurrencyCode

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const productFeeTotal = useMemo(() => {
    return products.reduce((total, product) => total + (product.fees || 0), 0)
  }, [products])

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const expense of expenses) {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount
    }
    return totals
  }, [expenses])

  const totalExpenses = useMemo(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0)
  }, [expenses])

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      if (!e.expenseDate) continue
      const d = new Date(e.expenseDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + e.amount)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({ month, amount }))
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase()
    return expenses.filter((expense) => {
      const categoryMatch = categoryFilter === 'All' || expense.category === categoryFilter
      const searchMatch =
        query.length === 0 ||
        [expense.description, expense.category, expense.marketplace]
          .join(' ')
          .toLowerCase()
          .includes(query)
      return categoryMatch && searchMatch
    })
  }, [expenses, search, categoryFilter])

  const pagination = usePagination(filteredExpenses, 50)

  function startAdd() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(expense: Expense) {
    setDraft({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate,
      marketplace: expense.marketplace,
      supplier: expense.supplier,
      paymentMethod: expense.paymentMethod,
      notes: expense.notes,
    })
    setEditingId(expense.id)
    setShowForm(true)
  }

  async function handleSave() {
    const amount = Number(draft.amount)
    if (!draft.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      showToast('Please provide a description and a valid amount', 'error')
      return
    }

    try {
      if (editingId) {
        await updateExpense({
          id: editingId,
          businessId: '',
          category: draft.category,
          description: draft.description.trim(),
          amount,
          expenseDate: draft.expenseDate,
          marketplace: draft.marketplace,
          supplier: draft.supplier.trim(),
          paymentMethod: draft.paymentMethod.trim(),
          notes: draft.notes.trim(),
          createdAt: '',
          updatedAt: '',
        })
        showToast('Expense updated', 'success')
      } else {
        await addExpense({
          category: draft.category,
          description: draft.description.trim(),
          amount,
          expenseDate: draft.expenseDate,
          marketplace: draft.marketplace,
          supplier: draft.supplier.trim(),
          paymentMethod: draft.paymentMethod.trim(),
          notes: draft.notes.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        showToast('Expense added', 'success')
      }
      setShowForm(false)
      setDraft(EMPTY_DRAFT)
      setEditingId(null)
    } catch {
      showToast('Failed to save expense', 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExpense(id)
      showToast('Expense deleted', 'success')
    } catch {
      showToast('Failed to delete expense', 'error')
    }
  }

  function handleExport() {
    downloadCsv('expenses.csv', [
      ['Date', 'Category', 'Description', 'Marketplace', 'Amount'],
      ...filteredExpenses.map((expense) => [
        expense.expenseDate,
        expense.category,
        expense.description,
        expense.marketplace,
        String(expense.amount),
      ]),
    ])
    showToast('Expenses exported as CSV', 'success')
  }

  if (loading || productsLoading) {
    return (
      <div className="inventory-page">
        <div className="page-heading">
          <div>
            <h1>Expenses</h1>
            <p>Track business expenses and marketplace fees.</p>
          </div>
        </div>
        <LoadingState label="Loading expenses..." />
      </div>
    )
  }

  const combinedTotal = totalExpenses + productFeeTotal

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Expenses</h1>
          <p>Track business expenses and marketplace fees.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={startAdd}>
            + Add Expense
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat inventory-stat-unlisted">
          <span>Total expenses</span>
          <strong>{formatCurrency(combinedTotal, currency)}</strong>
          <span className="stat-label">
            {formatCurrency(totalExpenses, currency)} standalone + {formatCurrency(productFeeTotal, currency)} product fees
          </span>
        </div>

        {EXPENSE_CATEGORIES.filter((cat) => (categoryTotals[cat] || 0) > 0).slice(0, 4).map((cat) => (
          <div className="inventory-stat" key={cat}>
            <span>{cat}</span>
            <strong>{formatCurrency(categoryTotals[cat] || 0, currency)}</strong>
            <span className="stat-label">
              {expenses.filter((e) => e.category === cat).length} entries
            </span>
          </div>
        ))}

        {EXPENSE_CATEGORIES.filter((cat) => (categoryTotals[cat] || 0) > 0).length === 0 && (
          <div className="inventory-stat">
            <span>Categories</span>
            <strong>0</strong>
            <span className="stat-label">No expenses recorded yet</span>
          </div>
        )}
      </div>

      {monthlyTotals.length > 0 && (
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Monthly expenses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monthlyTotals.map((m) => {
              const max = Math.max(...monthlyTotals.map((x) => x.amount), 1)
              const pct = (m.amount / max) * 100
              return (
                <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '90px', fontSize: '12px', color: 'var(--shq-ink-muted)' }}>{m.month}</span>
                  <div style={{ flex: 1, height: '10px', background: 'var(--shq-bg)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--shq-accent)' }} />
                  </div>
                  <strong style={{ fontSize: '13px', minWidth: '80px', textAlign: 'right' }}>{formatCurrency(m.amount, currency)}</strong>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '600', color: 'var(--shq-ink)' }}>
            {editingId ? 'Edit expense' : 'Add expense'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
                Description
              </label>
              <input
                type="text"
                value={draft.description}
                placeholder="e.g. eBay insertion fees"
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
                Category
              </label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}
                style={inputStyle}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.amount}
                placeholder="0.00"
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
                Date
              </label>
              <input
                type="date"
                value={draft.expenseDate}
                onChange={(e) => setDraft({ ...draft, expenseDate: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
                Marketplace
              </label>
              <input
                type="text"
                value={draft.marketplace}
                placeholder="Optional"
                onChange={(e) => setDraft({ ...draft, marketplace: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
                Supplier
              </label>
              <input
                type="text"
                value={draft.supplier}
                placeholder="Optional"
                onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
                Payment method
              </label>
              <input
                type="text"
                value={draft.paymentMethod}
                placeholder="e.g. Card, PayPal, Cash"
                onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--shq-ink-muted)' }}>
              Notes
            </label>
            <textarea
              value={draft.notes}
              placeholder="Optional notes"
              rows={2}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editingId ? 'Save changes' : 'Add expense'}
            </button>
          </div>
        </div>
      )}

      <FilterBar
        searchValue={search}
        searchPlaceholder="Search description, category, or marketplace"
        onSearchChange={setSearch}
        filtersActive={search.trim().length > 0 || categoryFilter !== 'All'}
        onClearFilters={() => { setSearch(''); setCategoryFilter('All') }}
      >
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="All">All categories</option>
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </FilterBar>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Marketplace</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {pagination.paginated.length > 0 ? (
              pagination.paginated.map((expense) => (
                <tr key={expense.id}>
                  <td data-label="Date">{formatDate(expense.expenseDate)}</td>
                  <td data-label="Category">
                    <span className={`status-badge status-${expense.category.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td data-label="Description">{expense.description}</td>
                  <td data-label="Marketplace">{expense.marketplace || '-'}</td>
                  <td data-label="Amount">
                    <strong>{formatCurrency(expense.amount, currency)}</strong>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="row-action-link" onClick={() => startEdit(expense)}>
                        Edit
                      </button>
                      <button className="row-action-link" onClick={() => handleDelete(expense.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="🧾"
                    title={search.trim() || categoryFilter !== 'All' ? 'No expenses match your filters' : 'No expenses yet'}
                    description={search.trim() || categoryFilter !== 'All'
                      ? 'Try adjusting your search or category filter.'
                      : 'Add your first expense, such as platform fees, shipping, packaging, or advertising.'}
                    action={search.trim() || categoryFilter !== 'All' ? undefined : { label: '+ Add Expense', onClick: startAdd }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <PaginationControls
          result={pagination}
          label="expenses"
          insideTable
        />
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--shq-border)',
  borderRadius: '8px',
  fontSize: '14px',
  background: 'var(--shq-surface)',
  color: 'var(--shq-ink)',
}

export default Expenses