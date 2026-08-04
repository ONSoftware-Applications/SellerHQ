import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProducts } from '../hooks/useProducts'
import { useCurrency } from '../hooks/useCurrency'
import { FilterBar } from '../components/FilterBar'

const statusOrder: string[] = [
  'Listed',
  'Awaiting Shipping',
  'Sold',
  'Unlisted',
]

const sortLabels: Record<string, string> = {
  createdAt: 'Newest first',
  code: 'Product ID',
  name: 'Name',
  status: 'Status',
  listingPrice: 'Price',
  salePrice: 'Sale price',
  profit: 'Profit',
  marketplaces: 'Marketplaces',
}

function Listings() {
  const navigate = useNavigate()
  const { products, loading } = useProducts()
  const { money } = useCurrency()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const listedProducts = useMemo(() => {
    return products.filter((product) => product.status === 'Listed')
  }, [products])

  const filteredListedProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return listedProducts.filter((product) => {
      const searchMatch =
        query.length === 0 ||
        [
          product.code,
          product.sku,
          product.name,
          product.brand,
          product.category,
          ...(Array.isArray(product.marketplaces) ? product.marketplaces : []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return searchMatch
    })
  }, [listedProducts, search])

  const sortedListedProducts = useMemo(() => {
    const sorted = [...filteredListedProducts].sort((left, right) => {
      let comparison = 0

      switch (sortKey) {
        case 'code':
          comparison = left.code.localeCompare(right.code)
          break
        case 'name':
          comparison = left.name.localeCompare(right.name)
          break
        case 'status':
          comparison = statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status)
          break
        case 'listingPrice':
          comparison = left.listingPrice - right.listingPrice
          break
        case 'salePrice':
          comparison = (left.salePrice || 0) - (right.salePrice || 0)
          break
        case 'profit':
          comparison = left.profit - right.profit
          break
        case 'marketplaces':
          const leftMarketplaces = Array.isArray(left.marketplaces) ? left.marketplaces.join(',') : String(left.marketplaces)
          const rightMarketplaces = Array.isArray(right.marketplaces) ? right.marketplaces.join(',') : String(right.marketplaces)
          comparison = leftMarketplaces.localeCompare(rightMarketplaces)
          break
        case 'createdAt':
        default:
          comparison = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
          break
      }

      if (sortDirection === 'desc') {
        comparison *= -1
      }

      return comparison
    })

    return sorted
  }, [filteredListedProducts, sortDirection, sortKey])

  const totalListedValue = useMemo(() => {
    return listedProducts.reduce((total, product) => total + product.listingPrice, 0)
  }, [listedProducts])

  const soldToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return listedProducts.filter((product) => product.saleDate === today).length
  }, [listedProducts])

  const activeListings = listedProducts.length

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Listings</h1>
          <p>Manage your marketplace listings and track performance.</p>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat inventory-stat-listed">
          <span>Active listings</span>
          <strong>{activeListings}</strong>
        </div>

        <div className="inventory-stat">
          <span>Total listing value</span>
          <strong>{money(totalListedValue, { maximumFractionDigits: 0 })}</strong>
        </div>

        <div className="inventory-stat">
          <span>Sold today</span>
          <strong>{soldToday}</strong>
        </div>

        <div className="inventory-stat">
          <span>Conversion rate</span>
          <strong>{listedProducts.length > 0 ? Math.round((listedProducts.filter(p => p.status === 'Sold').length / listedProducts.length) * 100) : 0}%</strong>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        searchPlaceholder="Search product ID, name, brand, or marketplace"
        onSearchChange={setSearch}
        filtersActive={search.trim().length > 0}
        onClearFilters={() => setSearch('')}
      >
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value)}
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              Sort by {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
        >
          {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </FilterBar>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Name</th>
              <th>Brand</th>
              <th>Status</th>
              <th>Marketplaces</th>
              <th>Listing price</th>
              <th>Profit</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="table-empty">
                    <strong>Loading listings...</strong>
                    <span>Retrieving your listed products.</span>
                  </div>
                </td>
              </tr>
            ) : sortedListedProducts.length > 0 ? (
              sortedListedProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <button
                      className="product-link"
                      type="button"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.code}
                    </button>
                  </td>

                  <td>
                    <button
                      className="product-link product-name-link"
                      type="button"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.name}
                    </button>
                  </td>

                  <td>{product.brand || '-'}</td>

                  <td>
                    <span className={`status-badge status-${product.status.toLowerCase().replaceAll(' ', '-')}`}>
                      {product.status}
                    </span>
                  </td>

                  <td>
                    {product.marketplaces.length > 0
                      ? Array.isArray(product.marketplaces)
                        ? product.marketplaces.join(', ')
                        : product.marketplaces
                      : '-'}
                  </td>

                   <td>{money(product.listingPrice, { maximumFractionDigits: 0 })}</td>

                   <td>
                     <span className={product.profit >= 0 ? 'inventory-profit-positive' : 'inventory-profit-negative'}>
                       {money(product.profit, { maximumFractionDigits: 0 })}
                    </span>
                  </td>

                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        Duplicate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="inventory-empty-state">
                    <strong>No active listings</strong>

                    <span>
                      You don't have any products currently listed. 
                      Add products to your inventory and set their status to 'Listed' to appear here.
                    </span>

                    <div className="inventory-empty-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => navigate('/inventory')}
                      >
                        + Manage inventory
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Listings