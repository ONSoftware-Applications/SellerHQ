import { useEffect, useState } from 'react'

export function usePagination<T>(items: T[], defaultPageSize = 50) {
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const start = (safePage - 1) * pageSize
  const paginated = items.slice(start, start + pageSize)
  const showingStart = items.length === 0 ? 0 : start + 1
  const showingEnd = Math.min(start + pageSize, items.length)

  function go(page: number) {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)))
  }

  return {
    pageSize,
    setPageSize: (n: number) => {
      setPageSize(n)
      setCurrentPage(1)
    },
    currentPage: safePage,
    setCurrentPage: go,
    totalPages,
    paginated,
    showingStart,
    showingEnd,
    total: items.length,
  }
}

export type PaginationResult<T> = ReturnType<typeof usePagination<T>>

export function PaginationControls({
  result,
  label,
}: {
  result: PaginationResult<unknown>
  label: string
}) {
  const { showingStart, showingEnd, total, currentPage, totalPages, setCurrentPage, pageSize, setPageSize } = result

  useEffect(() => {
    setCurrentPage(1)
  }, [setCurrentPage, pageSize])

  if (total === 0) return null

  return (
    <div className="pagination-controls">
      <span>Showing {showingStart}–{showingEnd} of {total} {label}</span>
      <div className="pagination-actions">
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="pagination-size"
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
          <option value={250}>250 per page</option>
        </select>
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>
        <span className="pagination-info">Page {currentPage} of {totalPages}</span>
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}